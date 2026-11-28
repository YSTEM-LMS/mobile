import { Chess } from 'chess.js';

import {
  fullPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle } from '../src/features/puzzles/mapper';
import {
  createPuzzleSession,
  retryPuzzleSession,
  submitPuzzleMove,
} from '../src/features/puzzles/puzzleSession';

const fullPuzzle = mapPuzzle(fullPuzzleFixture);
const partialPuzzle = mapPuzzle(partialPuzzleFixture);

describe('puzzleSession', () => {
  it('starts with the opponent setup move applied once', () => {
    const session = createPuzzleSession(fullPuzzle);
    expect(session).toMatchObject({
      status: 'playing',
      puzzleId: 'test-001',
      nextMoveIndex: 1,
      studentColor: 'b',
      lastMove: { from: 'g1', to: 'f3' },
      feedback: null,
    });
    if (session.status !== 'playing')
      throw new Error('Expected playable puzzle');

    const game = new Chess(fullPuzzle.fen);
    game.move({ from: 'g1', to: 'f3' });
    expect(session.fen).toBe(game.fen());
  });

  it('keeps the board and move index unchanged after a wrong attempt', () => {
    const before = createPuzzleSession(partialPuzzle);
    const after = submitPuzzleMove(partialPuzzle, before, 'e7', 'e5');

    expect(after).toMatchObject({
      status: 'playing',
      feedback: { kind: 'incorrect' },
    });
    if (before.status !== 'playing' || after.status !== 'playing') {
      throw new Error('Expected playable puzzle');
    }
    expect(after.fen).toBe(before.fen);
    expect(after.nextMoveIndex).toBe(before.nextMoveIndex);
    expect(after.lastMove).toEqual(before.lastMove);
  });

  it('allows a correct retry and completes a puzzle ending on a learner move', () => {
    const initial = createPuzzleSession(partialPuzzle);
    const wrong = submitPuzzleMove(partialPuzzle, initial, 'e7', 'e5');
    const completed = submitPuzzleMove(partialPuzzle, wrong, 'e7', 'e6');

    expect(completed).toMatchObject({
      status: 'complete',
      nextMoveIndex: 2,
      lastMove: { from: 'e7', to: 'e6' },
      feedback: { kind: 'complete', message: 'Puzzle complete!' },
    });
  });

  it('plays a scripted opponent reply and marks completion at the end', () => {
    const session = createPuzzleSession(fullPuzzle);
    const finished = submitPuzzleMove(fullPuzzle, session, 'b8', 'c6');

    expect(finished).toMatchObject({
      status: 'complete',
      nextMoveIndex: 3,
      lastMove: { from: 'f1', to: 'c4' },
      feedback: { kind: 'complete' },
    });
    if (finished.status !== 'complete') throw new Error('Expected completion');

    const game = new Chess(fullPuzzle.fen);
    game.move({ from: 'g1', to: 'f3' });
    game.move({ from: 'b8', to: 'c6' });
    game.move({ from: 'f1', to: 'c4' });
    expect(finished.fen).toBe(game.fen());
  });

  it('returns control to the learner after an opponent reply when another answer follows', () => {
    const puzzle = { ...fullPuzzle, moves: [...fullPuzzle.moves, 'g8f6'] };
    const session = createPuzzleSession(puzzle);
    const afterReply = submitPuzzleMove(puzzle, session, 'b8', 'c6');

    expect(afterReply).toMatchObject({
      status: 'playing',
      nextMoveIndex: 3,
      lastMove: { from: 'f1', to: 'c4' },
      feedback: { kind: 'correct' },
    });

    expect(submitPuzzleMove(puzzle, afterReply, 'g8', 'f6')).toMatchObject({
      status: 'complete',
      nextMoveIndex: 4,
      feedback: { kind: 'complete' },
    });
  });

  it('Retry restores the initial setup position, move index, and feedback', () => {
    const initial = createPuzzleSession(partialPuzzle);
    const wrong = submitPuzzleMove(partialPuzzle, initial, 'e7', 'e5');
    const retried = retryPuzzleSession(partialPuzzle);

    expect(retried).toEqual(initial);
    expect(retried).not.toEqual(wrong);
  });

  it('Retry clears completed feedback and restarts a completed puzzle', () => {
    const started = createPuzzleSession(partialPuzzle);
    const completed = submitPuzzleMove(partialPuzzle, started, 'e7', 'e6');
    expect(completed.status).toBe('complete');

    const retried = retryPuzzleSession(partialPuzzle);
    expect(retried).toEqual(started);
    expect(retried).toMatchObject({
      status: 'playing',
      nextMoveIndex: 1,
      feedback: null,
    });
  });

  it('Next Puzzle starts an independent board, index, and feedback state', () => {
    const first = createPuzzleSession(fullPuzzle);
    const previous = submitPuzzleMove(fullPuzzle, first, 'a7', 'a6');
    const second = createPuzzleSession(partialPuzzle);

    expect(previous).toMatchObject({ feedback: { kind: 'incorrect' } });
    expect(second).toMatchObject({
      status: 'playing',
      puzzleId: 'test-002',
      nextMoveIndex: 1,
      lastMove: { from: 'c2', to: 'c4' },
      studentColor: 'b',
      feedback: null,
    });
    if (first.status !== 'playing' || second.status !== 'playing') {
      throw new Error('Expected both puzzles to be playable');
    }
    expect(second.fen).not.toBe(first.fen);
  });

  it('returns an unplayable state for a record with invalid setup data', () => {
    const puzzle = { ...partialPuzzle, fen: 'invalid-fen' };
    const session = createPuzzleSession(puzzle);
    expect(session).toMatchObject({
      status: 'unplayable',
      puzzleId: 'test-002',
    });
    expect(submitPuzzleMove(puzzle, session, 'e7', 'e6')).toBe(session);
  });

  it('returns an unplayable state if a later scripted reply is invalid', () => {
    const puzzle = { ...fullPuzzle, moves: ['g1f3', 'b8c6', 'f1c9'] };
    const session = createPuzzleSession(puzzle);
    expect(submitPuzzleMove(puzzle, session, 'b8', 'c6')).toMatchObject({
      status: 'unplayable',
      puzzleId: puzzle.id,
    });
  });

  it('ignores moves after completion instead of replaying the solution', () => {
    const started = createPuzzleSession(partialPuzzle);
    const completed = submitPuzzleMove(partialPuzzle, started, 'e7', 'e6');
    expect(submitPuzzleMove(partialPuzzle, completed, 'e7', 'e5')).toBe(
      completed,
    );
  });

  it('does not apply an old session to another puzzle', () => {
    const oldSession = createPuzzleSession(fullPuzzle);
    expect(
      submitPuzzleMove(partialPuzzle, oldSession, 'e7', 'e6'),
    ).toMatchObject({
      status: 'unplayable',
      puzzleId: partialPuzzle.id,
    });
  });
});
