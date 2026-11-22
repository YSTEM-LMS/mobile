import { Chess, type Move } from 'chess.js';

export type SolutionErrorCode =
  | 'MISSING_SOLUTION'
  | 'INVALID_POSITION'
  | 'UNSUPPORTED_FORMAT'
  | 'ILLEGAL_MOVE';

export class SolutionError extends Error {
  readonly code: SolutionErrorCode;

  constructor(code: SolutionErrorCode, message: string) {
    super(message);
    this.name = 'SolutionError';
    this.code = code;
  }
}

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type SolutionStep = {
  from: string;
  to: string;
  promotion?: PromotionPiece;
  /** Who plays this step: the learner, or the scripted reply. */
  actor: 'learner' | 'scripted';
};

export type ParsedSolution = {
  /** The side the learner plays: the side to move in the starting FEN. */
  learnerColor: 'w' | 'b';
  steps: readonly SolutionStep[];
};

// A coordinate move such as "e2e4", or a promotion such as "a7a8q".
const COORDINATE_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/**
 * Parses a lesson's `solution` once. Supported format: space-separated
 * coordinate moves. The learner plays the side to move; steps alternate
 * learner, scripted reply, learner, and so on. Every move is replayed in
 * chess.js from the starting FEN, so a bad solution is found here and not in
 * the middle of an exercise. SAN and PGN text are not supported yet.
 */
export function parseSolution(
  startFen: string,
  solution: string | null | undefined,
): ParsedSolution {
  if (typeof solution !== 'string' || solution.trim() === '') {
    throw new SolutionError(
      'MISSING_SOLUTION',
      'This lesson has no scripted solution.',
    );
  }

  let game: Chess;
  try {
    game = new Chess(startFen);
  } catch {
    throw new SolutionError(
      'INVALID_POSITION',
      'The starting position for this lesson is not valid.',
    );
  }

  const learnerColor = game.turn();
  const tokens = solution.trim().split(/\s+/);
  const steps: SolutionStep[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const match = COORDINATE_MOVE.exec(token);
    if (!match) {
      throw new SolutionError(
        'UNSUPPORTED_FORMAT',
        `Unsupported solution format. Expected coordinate moves such as e2e4, but found "${token.slice(0, 20)}".`,
      );
    }

    const [, from, to, promotion] = match;
    let played: Move;
    try {
      played = game.move({ from, to, promotion });
    } catch {
      throw new SolutionError(
        'ILLEGAL_MOVE',
        `Solution move ${index + 1} (${token}) is not legal in this position.`,
      );
    }
    // chess.js ignores a promotion letter on a move that does not promote.
    if (played.promotion !== promotion) {
      throw new SolutionError(
        'ILLEGAL_MOVE',
        `Solution move ${index + 1} (${token}) is not legal in this position.`,
      );
    }

    steps.push({
      from,
      to,
      ...(promotion ? { promotion: promotion as PromotionPiece } : {}),
      actor: index % 2 === 0 ? 'learner' : 'scripted',
    });
  }

  return { learnerColor, steps };
}
