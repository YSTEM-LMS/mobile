import { act, renderHook } from '@testing-library/react-native';
import { Chess, type Square } from 'chess.js';

import { parseLesson } from '@/features/lessons/api/lesson.mapper';
import {
  blackLearner,
  demoChallenge,
  demoIntroduction,
  knightMove,
  pgnSolution,
  promotion,
  sanSolution,
  scriptedReply,
  START_POSITION,
  type ExerciseFixture,
} from '@/features/lessons/exercise/exercise.fixtures';
import {
  useLessonExercise,
  type UseLessonExerciseInput,
} from '@/features/lessons/exercise/useLessonExercise';

type Hook = { current: ReturnType<typeof useLessonExercise> };

// Brandon's first record from the local demo seed, as the backend returned it.
const demoRecordResponse = {
  startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  name: 'Introduction',
  info: "Welcome to the Knight - It moves in anL shape lesson! Let's get started.",
  solution: 'e2e4',
  goal: 1,
  opponentConstraints: [],
  maxMoves: 10,
  moves: [],
};

function inputOf(
  fixture: Omit<ExerciseFixture, 'solution'> & { solution: string | null },
  onComplete?: UseLessonExerciseInput['onComplete'],
): UseLessonExerciseInput {
  return { ...fixture, onComplete };
}

function setup(input: UseLessonExerciseInput) {
  return renderHook(
    (props: UseLessonExerciseInput) => useLessonExercise(props),
    {
      initialProps: input,
    },
  );
}

function play(hook: Hook, from: Square, to: Square): boolean {
  let accepted = false;
  act(() => {
    accepted = hook.current.makeMove(from, to);
  });
  return accepted;
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

function pieceAt(fen: string, square: Square) {
  return new Chess(fen).get(square);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useLessonExercise: one controller, different records', () => {
  it('runs two records with different positions and answers', () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result, rerender } = setup(inputOf(knightMove, onComplete));

    expect(play(result, 'b1', 'c3')).toBe(true);
    expect(result.current.phase).toBe('complete');
    expect(onComplete).toHaveBeenLastCalledWith(knightMove.lesson);

    rerender(inputOf(demoIntroduction, onComplete));

    expect(result.current.position).toBe(START_POSITION);
    expect(result.current.phase).toBe('learner-turn');
    // The first record's answer is legal here but wrong for this record.
    expect(play(result, 'b1', 'c3')).toBe(false);
    expect(result.current.feedback).toBe('wrong');
    expect(play(result, 'e2', 'e4')).toBe(true);

    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete).toHaveBeenLastCalledWith(demoIntroduction.lesson);
  });

  it('tells apart two records that share a starting position', () => {
    const { result } = setup(inputOf(demoChallenge));

    expect(play(result, 'e2', 'e4')).toBe(false); // legal, wrong for this record
    expect(result.current.feedback).toBe('wrong');
    expect(play(result, 'd2', 'd4')).toBe(true);
    expect(result.current.phase).toBe('complete');
  });

  it("plays the backend's real demo record, including its numeric goal", () => {
    const lesson = parseLesson(demoRecordResponse);
    expect(lesson.goal).toBeNull();

    const onComplete = jest.fn().mockResolvedValue(1);
    const { result } = setup({
      lesson: demoIntroduction.lesson,
      startFen: lesson.startFen,
      solution: lesson.solution,
      onComplete,
    });

    expect(play(result, 'e2', 'e4')).toBe(true);
    expect(result.current.phase).toBe('complete');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('useLessonExercise: moves', () => {
  it('applies a correct move and reports feedback', () => {
    const { result } = setup(inputOf(demoIntroduction));

    expect(play(result, 'e2', 'e4')).toBe(true);

    expect(pieceAt(result.current.position, 'e4')).toEqual({
      type: 'p',
      color: 'w',
    });
    expect(pieceAt(result.current.position, 'e2')).toBeFalsy();
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
    expect(result.current.feedback).toBe('correct');
    expect(result.current.inputDisabled).toBe(true);
  });

  it('keeps a valid position after a wrong attempt and allows a retry', () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    expect(play(result, 'd2', 'd4')).toBe(false);

    expect(result.current.position).toBe(START_POSITION);
    expect(result.current.phase).toBe('learner-turn');
    expect(result.current.inputDisabled).toBe(false);
    expect(result.current.feedback).toBe('wrong');
    expect(result.current.wrongAttempts).toBe(1);
    expect(onComplete).not.toHaveBeenCalled();

    expect(play(result, 'e2', 'e4')).toBe(true);
    expect(result.current.feedback).toBe('correct');
    expect(result.current.phase).toBe('complete');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('rejects illegal moves without changing anything', () => {
    const { result } = setup(inputOf(demoIntroduction));

    expect(play(result, 'e2', 'e5')).toBe(false);

    expect(result.current.position).toBe(START_POSITION);
    expect(result.current.feedback).toBe('none');
    expect(result.current.wrongAttempts).toBe(0);
  });

  it('applies the scripted reply and completes after the last move', () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result } = setup(inputOf(scriptedReply, onComplete));

    expect(play(result, 'e2', 'e4')).toBe(true);

    expect(pieceAt(result.current.position, 'e4')).toEqual({
      type: 'p',
      color: 'w',
    });
    expect(pieceAt(result.current.position, 'e5')).toEqual({
      type: 'p',
      color: 'b',
    });
    expect(result.current.lastMove).toEqual({ from: 'e7', to: 'e5' });
    expect(result.current.phase).toBe('learner-turn');
    expect(onComplete).not.toHaveBeenCalled();

    expect(play(result, 'g1', 'f3')).toBe(true);
    expect(result.current.phase).toBe('complete');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('flips the board when the learner plays Black', () => {
    const { result } = setup(inputOf(blackLearner));

    expect(result.current.orientation).toBe('black');
    expect(play(result, 'e7', 'e5')).toBe(true);
    expect(result.current.phase).toBe('complete');
  });

  it('promotes with the piece named in the solution', () => {
    const { result } = setup(inputOf(promotion));

    expect(play(result, 'a7', 'a8')).toBe(true);

    expect(pieceAt(result.current.position, 'a8')).toEqual({
      type: 'q',
      color: 'w',
    });
    expect(result.current.phase).toBe('complete');
  });
});

describe('useLessonExercise: completion', () => {
  it('fires once with the lesson identifier', () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result, rerender } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    expect(play(result, 'd2', 'd4')).toBe(false); // finished: no more moves
    rerender(inputOf(demoIntroduction, onComplete));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      piece: demoIntroduction.lesson.piece,
      lessonNumber: demoIntroduction.lesson.lessonNumber,
    });
  });

  it('completes without a callback', () => {
    const { result } = setup(inputOf(demoIntroduction));

    play(result, 'e2', 'e4');

    expect(result.current.phase).toBe('complete');
    expect(result.current.saveStatus).toBe('idle');
  });

  it('fires again only after reset() starts a new attempt', () => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    act(() => {
      result.current.reset();
    });

    expect(result.current.position).toBe(START_POSITION);
    expect(result.current.phase).toBe('learner-turn');
    expect(result.current.wrongAttempts).toBe(0);

    play(result, 'e2', 'e4');
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});

describe('useLessonExercise: saving', () => {
  it('goes from saving to saved', async () => {
    const save = deferred<number>();
    const onComplete = jest.fn(() => save.promise);
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      save.resolve(1);
      await save.promise;
    });

    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.saveError).toBeNull();
  });

  it('reports a failed save without calling it saved', async () => {
    const onComplete = jest
      .fn()
      .mockRejectedValue(new Error('Your session has expired.'));
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    await settle();

    expect(result.current.phase).toBe('complete');
    expect(result.current.saveStatus).toBe('failed');
    expect(result.current.saveError).toBe('Your session has expired.');
  });

  it('survives a callback that throws', async () => {
    const onComplete = jest.fn(() => {
      throw new Error('boom');
    });
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    await settle();

    expect(result.current.saveStatus).toBe('failed');
    expect(result.current.saveError).toBe('boom');
  });

  it('ignores a late save result after reset()', async () => {
    const save = deferred<number>();
    const onComplete = jest.fn(() => save.promise);
    const { result } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    act(() => {
      result.current.reset();
    });

    await act(async () => {
      save.resolve(1);
      await save.promise;
    });

    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.position).toBe(START_POSITION);
  });

  it('ignores a late save result after unmount', async () => {
    const save = deferred<number>();
    const onComplete = jest.fn(() => save.promise);
    const { result, unmount } = setup(inputOf(demoIntroduction, onComplete));

    play(result, 'e2', 'e4');
    unmount();

    save.resolve(1);
    await save.promise;
  });
});

describe('useLessonExercise: invalid or unsupported solutions', () => {
  it.each([
    [
      'SAN text',
      { ...demoIntroduction, solution: sanSolution },
      'UNSUPPORTED_FORMAT',
    ],
    [
      'PGN text',
      { ...demoIntroduction, solution: pgnSolution },
      'UNSUPPORTED_FORMAT',
    ],
    [
      'a missing solution',
      { ...demoIntroduction, solution: null },
      'MISSING_SOLUTION',
    ],
    [
      'an invalid starting FEN',
      { ...demoIntroduction, startFen: 'sanitized-fen' },
      'INVALID_POSITION',
    ],
    [
      'an illegal move',
      { ...demoIntroduction, solution: 'e2e5' },
      'ILLEGAL_MOVE',
    ],
  ])('shows a safe error for %s', (_name, fixture, code) => {
    const onComplete = jest.fn().mockResolvedValue(1);
    const { result } = setup(inputOf(fixture, onComplete));

    expect(result.current.phase).toBe('error');
    expect(result.current.error?.code).toBe(code);
    expect(result.current.error?.message).toBeTruthy();
    expect(result.current.inputDisabled).toBe(true);
    expect(play(result, 'e2', 'e4')).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
