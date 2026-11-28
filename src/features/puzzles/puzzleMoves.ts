import { Chess, type Square } from 'chess.js';

import type { Puzzle } from './types';

type PuzzlePosition = {
  fen: string;
  nextMoveIndex: number;
};

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export type PuzzleMoveAttempt =
  | {
      status: 'correct';
      fen: string;
      nextMoveIndex: number;
      lastMove: { from: Square; to: Square };
      isComplete: boolean;
    }
  | {
      status: 'incorrect';
      message: string;
    }
  | {
      status: 'unplayable';
      message: string;
    };

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const INCORRECT_MOVE_MESSAGE = 'Not quite. Try another move.';
const UNPLAYABLE_MESSAGE = 'This puzzle cannot be played. Try the next puzzle.';

/**
 * Check one learner move against the recorded solution without mutating the board.
 * Opponent replies (even move indexes) will be handled in a later step.
 */
export function attemptLearnerMove(
  puzzle: Pick<Puzzle, 'moves'>,
  position: PuzzlePosition,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
): PuzzleMoveAttempt {
  const { nextMoveIndex } = position;
  const expectedUci = puzzle.moves[nextMoveIndex];

  // Learner moves occupy odd indexes: moves[1], moves[3], and so on.
  if (
    !Number.isInteger(nextMoveIndex) ||
    nextMoveIndex < 1 ||
    nextMoveIndex % 2 !== 1 ||
    !expectedUci ||
    !UCI_MOVE_PATTERN.test(expectedUci)
  ) {
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }

  try {
    const game = new Chess(position.fen);
    const expectedIsLegal = game
      .moves({ verbose: true })
      .some(
        (move) =>
          `${move.from}${move.to}${move.promotion ?? ''}` === expectedUci,
      );

    // A syntactically valid but illegal stored solution is unusable content.
    if (!expectedIsLegal) {
      return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
    }

    const attemptedUci =
      `${from}${to}` + (expectedUci.length === 5 ? (promotion ?? 'q') : '');

    if (attemptedUci !== expectedUci) {
      // Return no new FEN or index, so a wrong attempt cannot advance the puzzle.
      return { status: 'incorrect', message: INCORRECT_MOVE_MESSAGE };
    }

    const move = game.move({
      from,
      to,
      ...(expectedUci.length === 5 ? { promotion: promotion ?? 'q' } : {}),
    });
    const followingMoveIndex = nextMoveIndex + 1;

    return {
      status: 'correct',
      fen: game.fen(),
      nextMoveIndex: followingMoveIndex,
      lastMove: { from: move.from, to: move.to },
      // A subsequent opponent move must run before asking the learner again.
      isComplete: followingMoveIndex === puzzle.moves.length,
    };
  } catch {
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }
}
