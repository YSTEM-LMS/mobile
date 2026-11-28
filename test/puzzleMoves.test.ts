import { Chess } from 'chess.js';

import {
  fullPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle } from '../src/features/puzzles/mapper';
import { attemptLearnerMove } from '../src/features/puzzles/puzzleMoves';
import { initializePuzzle } from '../src/features/puzzles/puzzleSetup';

const fullPuzzle = mapPuzzle(fullPuzzleFixture);
const partialPuzzle = mapPuzzle(partialPuzzleFixture);

function readyPosition(puzzle: typeof fullPuzzle) {
  const position = initializePuzzle(puzzle);
  if (position.status !== 'ready') {
    throw new Error('Test fixture must be playable');
  }
  return position;
}

describe('attemptLearnerMove', () => {
  it('accepts the correct move for a puzzle that has an opponent reply pending', () => {
    const position = readyPosition(fullPuzzle);
    const expectedGame = new Chess(position.fen);
    expectedGame.move({ from: 'b8', to: 'c6' });

    const result = attemptLearnerMove(fullPuzzle, position, 'b8', 'c6');

    expect(result).toMatchObject({
      status: 'correct',
      fen: expectedGame.fen(),
      nextMoveIndex: 2,
      lastMove: { from: 'b8', to: 'c6' },
      isComplete: false,
    });
    // The setup position is unchanged; the caller must explicitly save the result.
    expect(position.nextMoveIndex).toBe(1);
  });

  it('marks the final correct learner move as complete for a second puzzle', () => {
    const position = readyPosition(partialPuzzle);
    const expectedGame = new Chess(position.fen);
    expectedGame.move({ from: 'e7', to: 'e6' });

    expect(
      attemptLearnerMove(partialPuzzle, position, 'e7', 'e6'),
    ).toMatchObject({
      status: 'correct',
      fen: expectedGame.fen(),
      nextMoveIndex: 2,
      isComplete: true,
    });
  });

  it('rejects a wrong legal move without changing the board, then allows retry', () => {
    const position = readyPosition(partialPuzzle);
    const initialFen = position.fen;

    expect(
      attemptLearnerMove(partialPuzzle, position, 'e7', 'e5'),
    ).toMatchObject({
      status: 'incorrect',
      message: 'Not quite. Try another move.',
    });
    expect(position.fen).toBe(initialFen);
    expect(position.nextMoveIndex).toBe(1);

    expect(
      attemptLearnerMove(partialPuzzle, position, 'e7', 'e6'),
    ).toMatchObject({ status: 'correct', isComplete: true });
  });

  it('rejects an illegal learner move without advancing', () => {
    const position = readyPosition(partialPuzzle);
    expect(
      attemptLearnerMove(partialPuzzle, position, 'a8', 'a1'),
    ).toMatchObject({ status: 'incorrect' });
    expect(position.nextMoveIndex).toBe(1);
  });

  it('returns a recoverable error for an invalid expected move', () => {
    const position = readyPosition(partialPuzzle);
    expect(
      attemptLearnerMove({ moves: ['c2c4', 'e7e9'] }, position, 'e7', 'e6'),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('returns a recoverable error for an illegal stored solution', () => {
    const position = readyPosition(partialPuzzle);
    expect(
      attemptLearnerMove({ moves: ['c2c4', 'a8a1'] }, position, 'e7', 'e6'),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('returns a recoverable error when the position is invalid', () => {
    expect(
      attemptLearnerMove(
        partialPuzzle,
        { fen: 'not-a-fen', nextMoveIndex: 1 },
        'e7',
        'e6',
      ),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('does not accept a learner move during an opponent turn', () => {
    const position = readyPosition(fullPuzzle);
    expect(
      attemptLearnerMove(
        fullPuzzle,
        { ...position, nextMoveIndex: 2 },
        'f1',
        'c4',
      ),
    ).toMatchObject({ status: 'unplayable' });
  });
});
