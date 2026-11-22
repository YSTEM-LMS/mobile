import { fireEvent, render, screen } from '@testing-library/react-native';

import type { LessonRequest } from '@/features/lessons/api/lesson.types';
import {
  blackLearner,
  demoChallenge,
  demoIntroduction,
  knightMove,
  sanSolution,
  START_POSITION,
  type ExerciseFixture,
} from '@/features/lessons/exercise/exercise.fixtures';
import { LessonExerciseBoard } from '@/features/lessons/exercise/LessonExerciseBoard';

type Fixture = Omit<ExerciseFixture, 'solution'> & { solution: string | null };

function exercise(
  fixture: Fixture,
  onComplete?: (lesson: LessonRequest) => unknown,
) {
  return <LessonExerciseBoard {...fixture} onComplete={onComplete} />;
}

function playMove(from: string, to: string) {
  fireEvent.press(screen.getByLabelText(`Chess square ${from}`));
  fireEvent.press(screen.getByLabelText(`Chess square ${to}`));
}

describe('LessonExerciseBoard', () => {
  it('keeps the position after a wrong attempt and allows a retry', () => {
    render(exercise(demoIntroduction));

    playMove('d2', 'd4'); // legal, but the answer is e2e4

    expect(screen.getByText('Not quite. Try again.')).toBeTruthy();
    expect(screen.getByLabelText('White p on d2')).toBeTruthy();
    expect(screen.queryByLabelText('White p on d4')).toBeNull();

    playMove('e2', 'e4');

    expect(screen.getByText('Correct! Exercise complete.')).toBeTruthy();
    expect(screen.getByLabelText('White p on e4')).toBeTruthy();
  });

  it('runs two records with different positions and answers', () => {
    const { rerender } = render(exercise(knightMove));

    playMove('b1', 'c3');
    expect(screen.getByText('Correct! Exercise complete.')).toBeTruthy();

    rerender(exercise(demoChallenge));

    expect(screen.queryByText('Correct! Exercise complete.')).toBeNull();
    expect(screen.getByLabelText('White p on d2')).toBeTruthy();
    playMove('d2', 'd4');
    expect(screen.getByText('Correct! Exercise complete.')).toBeTruthy();
  });

  it('signals completion once and shows that it was saved', async () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    render(exercise(demoIntroduction, onComplete));

    playMove('e2', 'e4');

    expect(await screen.findByText('Progress saved.')).toBeTruthy();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(demoIntroduction.lesson);
  });

  it('does not show a failed save as saved', async () => {
    const onComplete = jest
      .fn()
      .mockRejectedValue(new Error('Your session has expired.'));
    render(exercise(demoIntroduction, onComplete));

    playMove('e2', 'e4');

    expect(await screen.findByText('Progress not saved')).toBeTruthy();
    expect(screen.getByText('Your session has expired.')).toBeTruthy();
    expect(screen.queryByText('Progress saved.')).toBeNull();
  });

  it('starts a new attempt from Try again', () => {
    render(exercise(demoIntroduction));
    playMove('e2', 'e4');

    fireEvent.press(screen.getByText('Try again'));

    expect(screen.queryByText('Correct! Exercise complete.')).toBeNull();
    expect(screen.getByLabelText('White p on e2')).toBeTruthy();
    expect(screen.queryByLabelText('White p on e4')).toBeNull();
  });

  it('flips the board when the learner plays Black', () => {
    render(exercise(blackLearner));

    const squares = screen.getAllByLabelText(/^Chess square /);
    expect(squares[0].props.accessibilityLabel).toBe('Chess square h1');

    playMove('e7', 'e5');
    expect(screen.getByText('Correct! Exercise complete.')).toBeTruthy();
  });

  it('shows a read-only board when the lesson has no solution', () => {
    render(exercise({ ...demoIntroduction, solution: null }));

    fireEvent.press(screen.getByLabelText('Chess square e2'));

    expect(screen.queryByTestId('legal-move-e3')).toBeNull();
    expect(screen.queryByText('Exercise unavailable')).toBeNull();
    expect(screen.getByLabelText('White p on e2')).toBeTruthy();
  });

  it('shows a safe error for an unsupported solution', () => {
    render(exercise({ ...demoIntroduction, solution: sanSolution }));

    expect(screen.getByText('Exercise unavailable')).toBeTruthy();
    expect(screen.getByText(/Unsupported solution format/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    expect(screen.queryByTestId('legal-move-e3')).toBeNull();
  });

  it('renders the starting position of the lesson', () => {
    render(exercise(demoIntroduction));

    expect(START_POSITION).toBe(demoIntroduction.startFen);
    expect(screen.getByLabelText('Black p on e7')).toBeTruthy();
  });
});
