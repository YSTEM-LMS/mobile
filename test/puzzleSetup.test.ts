import { Chess } from 'chess.js';

import {
  fullPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle } from '../src/features/puzzles/mapper';
import { initializePuzzle } from '../src/features/puzzles/puzzleSetup';

const fixtures = [fullPuzzleFixture, partialPuzzleFixture];

describe('initializePuzzle', () => {
  it.each(fixtures)(
    'applies exactly the opponent setup move for $puzzleId',
    (fixture) => {
      const puzzle = mapPuzzle(fixture);
      const expected = new Chess(puzzle.fen);
      const uci = puzzle.moves[0];
      if (!uci) throw new Error('Fixture has no setup move');
      const opponentMove = expected.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
      });

      const result = initializePuzzle(puzzle);

      expect(result.status).toBe('ready');
      if (result.status !== 'ready') return;

      expect(result.fen).toBe(expected.fen());
      expect(result.nextMoveIndex).toBe(1);
      expect(result.studentColor).toBe(expected.turn());
      expect(result.lastMove).toEqual({
        from: opponentMove.from,
        to: opponentMove.to,
      });
    },
  );

  it('supports an opponent setup move that promotes a pawn', () => {
    const result = initializePuzzle({
      fen: '8/P6k/8/8/8/8/8/K7 w - - 0 1',
      moves: ['a7a8q', 'h7g6'],
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;

    expect(new Chess(result.fen).get('a8')).toEqual({
      type: 'q',
      color: 'w',
    });
    expect(result.studentColor).toBe('b');
  });

  it('rejects an invalid starting FEN without throwing', () => {
    expect(
      initializePuzzle({ fen: 'invalid-fen', moves: ['e2e4', 'e7e5'] }),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('rejects an illegal opponent setup move without throwing', () => {
    expect(
      initializePuzzle({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        moves: ['a1a8', 'e7e5'],
      }),
    ).toMatchObject({ status: 'unplayable' });
  });

  it('rejects a puzzle without a student answer', () => {
    expect(
      initializePuzzle({
        fen: fullPuzzleFixture.FEN,
        moves: ['g1f3'],
      }),
    ).toMatchObject({ status: 'unplayable' });
  });
});
