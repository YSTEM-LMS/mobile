import type { BackendPuzzle } from './schema';

/**
 * Synthetic chess examples matching the YSTEM backend response format.
 * Each FEN is a valid chess position and each move sequence uses legal UCI moves.
 * No real player or game data is used.
 */

/** Sample puzzle containing all backend fields (after 1. e4 e5). */
export const fullPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-001',
  FEN: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  moves: 'g1f3 b8c6 f1c4',
  rating: 1000,
  ratingDeviation: 50,
  popularity: 90,
  nbPlays: 100,
  themes: 'theme1 theme2 theme3',
  gameUrl: 'https://example.com/game/1',
  openingTags: 'opening1 opening2',
};

/** Sample puzzle with some optional fields omitted (after 1. d4 d5). */
export const partialPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-002',
  FEN: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
  moves: 'c2c4 e7e6',
  rating: 1500,
  popularity: 75,
  themes: 'theme4 theme5',
};

/** Sample puzzle containing only the required backend fields (starting position). */
export const minimalPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-003',
  FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: 'e2e4 e7e5',
};

/** Sample response containing multiple backend puzzle objects. */
export const rawPuzzleFixtures: BackendPuzzle[] = [
  fullPuzzleFixture,
  partialPuzzleFixture,
  minimalPuzzleFixture,
];

/** Sample puzzle containing null optional fields (after 1. f3 e5). */
export const nullOptionalFieldsPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-null',
  FEN: 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq e6 0 2',
  moves: 'g2g4 d8h4',
  rating: null,
  ratingDeviation: null,
  popularity: null,
  nbPlays: null,
  themes: null,
  gameUrl: null,
  openingTags: null,
};
