import { Chess } from 'chess.js';

import {
  fullPuzzleFixture,
  minimalPuzzleFixture,
  nullOptionalFieldsPuzzleFixture,
  partialPuzzleFixture,
} from '../src/features/puzzles/fixtures';

// Check all four fixtures, including the null-optional fixture that is not
// part of rawPuzzleFixtures.
const fixtures = [
  fullPuzzleFixture,
  partialPuzzleFixture,
  minimalPuzzleFixture,
  nullOptionalFieldsPuzzleFixture,
];

describe('puzzle fixture chess legality', () => {
  it.each(fixtures)(
    'has a valid FEN and legal UCI moves: $puzzleId',
    (fixture) => {
      // chess.js throws if the supplied FEN is not a valid chess position.
      const game = new Chess(fixture.FEN);

      // Replay the moves in order because legality depends on previous moves.
      for (const uci of fixture.moves.trim().split(/\s+/)) {
        // Four characters for normal moves; five when a promotion is included.
        expect(uci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

        // chess.js throws for illegal moves and advances for legal moves.
        const move = game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          ...(uci.length === 5 ? { promotion: uci[4] } : {}),
        });

        expect(move).not.toBeNull();
      }
    },
  );
});
