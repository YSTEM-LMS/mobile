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
} from '@/features/lessons/exercise/exercise.fixtures';
import {
  parseSolution,
  SolutionError,
} from '@/features/lessons/exercise/parseSolution';

function failure(
  startFen: string,
  solution: string | null | undefined,
): SolutionError {
  try {
    parseSolution(startFen, solution);
  } catch (error) {
    return error as SolutionError;
  }
  throw new Error('Expected parseSolution to throw');
}

describe('parseSolution: supported solutions', () => {
  it.each([
    ['demo record 1', demoIntroduction, 'e2', 'e4'],
    ['demo record 2', demoChallenge, 'd2', 'd4'],
    ['a different position', knightMove, 'b1', 'c3'],
  ])('parses a single learner move: %s', (_name, fixture, from, to) => {
    const parsed = parseSolution(fixture.startFen, fixture.solution);

    expect(parsed.learnerColor).toBe('w');
    expect(parsed.steps).toEqual([{ from, to, actor: 'learner' }]);
  });

  it('assigns learner and scripted steps in alternating order', () => {
    const parsed = parseSolution(
      scriptedReply.startFen,
      scriptedReply.solution,
    );

    expect(parsed.steps.map((step) => step.actor)).toEqual([
      'learner',
      'scripted',
      'learner',
    ]);
  });

  it('takes the learner side from the starting FEN', () => {
    const parsed = parseSolution(blackLearner.startFen, blackLearner.solution);

    expect(parsed.learnerColor).toBe('b');
    expect(parsed.steps).toEqual([{ from: 'e7', to: 'e5', actor: 'learner' }]);
  });

  it('keeps the promotion piece', () => {
    const parsed = parseSolution(promotion.startFen, promotion.solution);

    expect(parsed.steps).toEqual([
      { from: 'a7', to: 'a8', promotion: 'q', actor: 'learner' },
    ]);
  });

  it('ignores extra whitespace', () => {
    const parsed = parseSolution(START_POSITION, '  e2e4   e7e5 ');

    expect(parsed.steps).toHaveLength(2);
  });
});

describe('parseSolution: unsupported or invalid solutions', () => {
  it.each([
    ['SAN text', sanSolution],
    ['PGN text', pgnSolution],
    ['an unknown word', 'castle'],
  ])('rejects %s as an unsupported format', (_name, solution) => {
    const error = failure(START_POSITION, solution);

    expect(error).toBeInstanceOf(SolutionError);
    expect(error.code).toBe('UNSUPPORTED_FORMAT');
  });

  it.each([null, undefined, '', '   '])(
    'rejects a missing solution: %p',
    (solution) => {
      expect(failure(START_POSITION, solution).code).toBe('MISSING_SOLUTION');
    },
  );

  it('rejects a starting position that is not a valid FEN', () => {
    expect(failure('sanitized-fen', 'e2e4').code).toBe('INVALID_POSITION');
  });

  it.each([
    ['a move that is not legal', 'e2e5'],
    ['a move for the wrong side', 'e7e5'],
    ['a promotion letter on a move that does not promote', 'e2e4q'],
    ['a later move that is not legal', 'e2e4 e2e4'],
  ])('rejects %s', (_name, solution) => {
    expect(failure(START_POSITION, solution).code).toBe('ILLEGAL_MOVE');
  });
});
