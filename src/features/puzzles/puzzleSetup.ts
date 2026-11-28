import { Chess, type Square } from 'chess.js';

import type { Puzzle } from './types';

/** The initial opponent move has been applied; moves[1] is the student's turn. */
export type PuzzleSetupResult =
  | {
      status: 'ready';
      fen: string;
      nextMoveIndex: number;
      studentColor: 'w' | 'b';
      lastMove: { from: Square; to: Square };
    }
  | {
      status: 'unplayable';
      message: string;
    };

const INVALID_PUZZLE_MESSAGE =
  'This puzzle cannot be played. Try the next puzzle.';
const UCI_MOVE_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

/**
 * Prepare an API-loaded puzzle for play without changing the source puzzle.
 * The first recorded move is the opponent's setup move, not the student's.
 */
export function initializePuzzle(
  puzzle: Pick<Puzzle, 'fen' | 'moves'>,
): PuzzleSetupResult {
  const setupMove = puzzle.moves[0];

  // A playable puzzle needs an opponent setup move and a student answer.
  if (
    !setupMove ||
    puzzle.moves.length < 2 ||
    !UCI_MOVE_PATTERN.test(setupMove)
  ) {
    return { status: 'unplayable', message: INVALID_PUZZLE_MESSAGE };
  }

  try {
    const game = new Chess(puzzle.fen);
    const move = game.move({
      from: setupMove.slice(0, 2),
      to: setupMove.slice(2, 4),
      ...(setupMove.length === 5 ? { promotion: setupMove[4] } : {}),
    });

    return {
      status: 'ready',
      fen: game.fen(),
      nextMoveIndex: 1,
      studentColor: game.turn(),
      lastMove: { from: move.from, to: move.to },
    };
  } catch {
    // Invalid FENs and illegal setup moves are recoverable per Issue #45.
    return { status: 'unplayable', message: INVALID_PUZZLE_MESSAGE };
  }
}
