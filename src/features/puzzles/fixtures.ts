import type { BackendPuzzle } from './schema';

/**
 * Sanitized puzzle fixtures matching the YSTEM backend response format.
 * Uses placeholder values for testing validation, mapping, and API behavior.
 */

/** Sample puzzle containing all backend fields. */
export const fullPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-001',
  FEN: 'sample-position-1',
  moves: 'move1 move2 move3',
  rating: 1000,
  ratingDeviation: 50,
  popularity: 90,
  nbPlays: 100,
  themes: 'theme1 theme2 theme3',
  gameUrl: 'https://example.com/game/1',
  openingTags: 'opening1 opening2',
};

/** Sample puzzle with some optional fields omitted. */
export const partialPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-002',
  FEN: 'sample-position-2',
  moves: 'move4 move5',
  rating: 1500,
  popularity: 75,
  themes: 'theme4 theme5',
};

/** Sample puzzle containing only the required backend fields. */
export const minimalPuzzleFixture: BackendPuzzle = {
  puzzleId: 'test-003',
  FEN: 'sample-position-3',
  moves: 'move6 move7',
  rating: 2000,
};

/** Sample response containing multiple backend puzzle objects. */
export const rawPuzzleFixtures: BackendPuzzle[] = [
  fullPuzzleFixture,
  partialPuzzleFixture,
  minimalPuzzleFixture,
];
