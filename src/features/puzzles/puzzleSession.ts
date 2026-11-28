import type { Square } from 'chess.js';

import { attemptLearnerMove } from './puzzleMoves';
import { playOpponentReply } from './puzzleReplies';
import { initializePuzzle } from './puzzleSetup';
import type { Puzzle } from './types';

/** The puzzle fields needed by the gameplay controller. */
type SessionPuzzle = Pick<Puzzle, 'id' | 'fen' | 'moves'>;
type PromotionPiece = 'q' | 'r' | 'b' | 'n';
type LastMove = { from: Square; to: Square };

export type PuzzleFeedback = {
  kind: 'incorrect' | 'correct' | 'complete';
  message: string;
};

export type PuzzleSession =
  | {
      status: 'playing' | 'complete';
      puzzleId: string;
      fen: string;
      nextMoveIndex: number;
      studentColor: 'w' | 'b';
      lastMove: LastMove;
      feedback: PuzzleFeedback | null;
    }
  | {
      status: 'unplayable';
      puzzleId: string;
      message: string;
      feedback: null;
    };

function unplayable(puzzleId: string, message: string): PuzzleSession {
  return { status: 'unplayable', puzzleId, message, feedback: null };
}

/**
 * Start a puzzle from scratch. Use this for the initial load, Retry, and
 * Next Puzzle so no board position, move index, or feedback is carried over.
 */
export function createPuzzleSession(puzzle: SessionPuzzle): PuzzleSession {
  const setup = initializePuzzle(puzzle);
  if (setup.status === 'unplayable') {
    return unplayable(puzzle.id, setup.message);
  }

  return {
    status: 'playing',
    puzzleId: puzzle.id,
    fen: setup.fen,
    nextMoveIndex: setup.nextMoveIndex,
    studentColor: setup.studentColor,
    lastMove: setup.lastMove,
    feedback: null,
  };
}

/** Retry the same puzzle, reapplying its setup move exactly once. */
export function retryPuzzleSession(puzzle: SessionPuzzle): PuzzleSession {
  return createPuzzleSession(puzzle);
}

/**
 * Check one learner attempt, then play any pending scripted opponent reply.
 * A wrong attempt keeps the current board and move index unchanged.
 */
export function submitPuzzleMove(
  puzzle: SessionPuzzle,
  session: PuzzleSession,
  from: Square,
  to: Square,
  promotion?: PromotionPiece,
): PuzzleSession {
  // Ignore input after completion or when the record cannot be played.
  if (session.status !== 'playing') return session;

  // Never apply a move from a previous puzzle to a newly selected puzzle.
  if (session.puzzleId !== puzzle.id) {
    return unplayable(puzzle.id, 'Puzzle changed. Please try the next puzzle.');
  }

  const attempt = attemptLearnerMove(puzzle, session, from, to, promotion);
  if (attempt.status === 'unplayable') {
    return unplayable(puzzle.id, attempt.message);
  }
  if (attempt.status === 'incorrect') {
    return {
      ...session,
      feedback: { kind: 'incorrect', message: attempt.message },
    };
  }

  if (attempt.isComplete) {
    return {
      ...session,
      status: 'complete',
      fen: attempt.fen,
      nextMoveIndex: attempt.nextMoveIndex,
      lastMove: attempt.lastMove,
      feedback: { kind: 'complete', message: 'Puzzle complete!' },
    };
  }

  const reply = playOpponentReply(puzzle, attempt);
  if (reply.status === 'unplayable') {
    return unplayable(puzzle.id, reply.message);
  }

  const isComplete = reply.isComplete;
  return {
    ...session,
    status: isComplete ? 'complete' : 'playing',
    fen: reply.fen,
    nextMoveIndex: reply.nextMoveIndex,
    lastMove: reply.status === 'played' ? reply.lastMove : attempt.lastMove,
    feedback: isComplete
      ? { kind: 'complete', message: 'Puzzle complete!' }
      : { kind: 'correct', message: 'Correct! Your turn again.' },
  };
}
