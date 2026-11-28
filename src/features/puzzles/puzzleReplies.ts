import { Chess, type Square } from 'chess.js';

import type { Puzzle } from './types';

type PuzzlePosition = {
  fen: string;
  nextMoveIndex: number;
};

export type OpponentReplyResult =
  | {
      status: 'played';
      fen: string;
      nextMoveIndex: number;
      lastMove: { from: Square; to: Square };
      isComplete: boolean;
    }
  | {
      status: 'no-reply';
      fen: string;
      nextMoveIndex: number;
      isComplete: true;
    }
  | {
      status: 'unplayable';
      message: string;
    };

const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const UNPLAYABLE_MESSAGE = 'This puzzle cannot be played. Try the next puzzle.';

/**
 * Advance by one scripted opponent move after a correct learner move.
 * Opponent replies occupy even indexes after the initial setup move.
 * This function does not mutate the given position or fetch from Stockfish.
 */
export function playOpponentReply(
  puzzle: Pick<Puzzle, 'moves'>,
  position: PuzzlePosition,
): OpponentReplyResult {
  const { nextMoveIndex } = position;

  // A learner has just moved, so the next index is even and at least 2.
  if (
    !Number.isInteger(nextMoveIndex) ||
    nextMoveIndex < 2 ||
    nextMoveIndex > puzzle.moves.length
  ) {
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }

  // All recorded moves are consumed; a reply cannot be replayed.
  if (nextMoveIndex === puzzle.moves.length) {
    return {
      status: 'no-reply',
      fen: position.fen,
      nextMoveIndex,
      isComplete: true,
    };
  }

  // Between moves, only an even index can belong to the opponent.
  if (nextMoveIndex % 2 !== 0) {
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }

  const replyUci = puzzle.moves[nextMoveIndex];
  if (!replyUci || !UCI_MOVE_PATTERN.test(replyUci)) {
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }

  try {
    const game = new Chess(position.fen);
    const move = game.move({
      from: replyUci.slice(0, 2),
      to: replyUci.slice(2, 4),
      ...(replyUci.length === 5 ? { promotion: replyUci[4] } : {}),
    });
    const followingMoveIndex = nextMoveIndex + 1;

    return {
      status: 'played',
      fen: game.fen(),
      nextMoveIndex: followingMoveIndex,
      lastMove: { from: move.from, to: move.to },
      isComplete: followingMoveIndex === puzzle.moves.length,
    };
  } catch {
    // Invalid FEN or an illegal scripted reply is recoverable content failure.
    return { status: 'unplayable', message: UNPLAYABLE_MESSAGE };
  }
}
