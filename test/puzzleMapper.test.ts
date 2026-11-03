import {
  fullPuzzleFixture,
  minimalPuzzleFixture,
  partialPuzzleFixture,
  rawPuzzleFixtures,
} from '../src/features/puzzles/fixtures';
import { mapPuzzle, mapPuzzles } from '../src/features/puzzles/mapper';

/**
 * Tests conversion of individual backend puzzles into app-facing Puzzle objects.
 * Verifies field mapping, string splitting, and optional field handling.
 */
describe('mapPuzzle', () => {
  it('maps a full backend puzzle to the app-facing Puzzle', () => {
    expect(mapPuzzle(fullPuzzleFixture)).toEqual({
      id: 'test-001',
      fen: 'sample-position-1',
      moves: ['move1', 'move2', 'move3'],
      rating: 1000,
      ratingDeviation: 50,
      popularity: 90,
      plays: 100,
      themes: ['theme1', 'theme2', 'theme3'],
      gameUrl: 'https://example.com/game/1',
      openingTags: ['opening1', 'opening2'],
    });
  });

  it('renames backend fields: puzzleId -> id, FEN -> fen, nbPlays -> plays', () => {
    const puzzle = mapPuzzle(fullPuzzleFixture);

    expect(puzzle.id).toBe(fullPuzzleFixture.puzzleId);
    expect(puzzle.fen).toBe(fullPuzzleFixture.FEN);
    expect(puzzle.plays).toBe(fullPuzzleFixture.nbPlays);
  });

  it('maps moves into an ordered array', () => {
    const puzzle = mapPuzzle({ ...fullPuzzleFixture, moves: 'c2d1 e6e1 d1e1' });

    expect(puzzle.moves).toEqual(['c2d1', 'e6e1', 'd1e1']);
  });

  it('maps themes into an array', () => {
    const puzzle = mapPuzzle({
      ...fullPuzzleFixture,
      themes: 'backRankMate mate mateIn2',
    });

    expect(puzzle.themes).toEqual(['backRankMate', 'mate', 'mateIn2']);
  });

  it('maps a single move or theme into a one-item array', () => {
    const puzzle = mapPuzzle({
      ...fullPuzzleFixture,
      moves: 'e2e4',
      themes: 'mate',
    });

    expect(puzzle.moves).toEqual(['e2e4']);
    expect(puzzle.themes).toEqual(['mate']);
  });

  it('ignores extra whitespace in moves, themes and openingTags', () => {
    const puzzle = mapPuzzle({
      ...fullPuzzleFixture,
      moves: '  a8b8   b1b8 ',
      themes: ' mate  mateIn1 ',
      openingTags: '\tItalian_Game  Italian_Game_Classical_Variation\n',
    });

    expect(puzzle.moves).toEqual(['a8b8', 'b1b8']);
    expect(puzzle.themes).toEqual(['mate', 'mateIn1']);
    expect(puzzle.openingTags).toEqual([
      'Italian_Game',
      'Italian_Game_Classical_Variation',
    ]);
  });

  it('keeps provided optional fields and empties the missing ones (partial fixture)', () => {
    const puzzle = mapPuzzle(partialPuzzleFixture);

    expect(puzzle.themes).toEqual(['theme4', 'theme5']);
    expect(puzzle.popularity).toBe(75);
    expect(puzzle.openingTags).toEqual([]);
    expect(puzzle.ratingDeviation).toBeUndefined();
    expect(puzzle.plays).toBeUndefined();
    expect(puzzle.gameUrl).toBeUndefined();
  });

  it('turns missing themes and openingTags into empty arrays (minimal fixture)', () => {
    const puzzle = mapPuzzle(minimalPuzzleFixture);

    expect(puzzle.themes).toEqual([]);
    expect(puzzle.openingTags).toEqual([]);
    expect(puzzle.ratingDeviation).toBeUndefined();
    expect(puzzle.popularity).toBeUndefined();
  });

  it('turns blank themes and openingTags into empty arrays', () => {
    const puzzle = mapPuzzle({
      ...fullPuzzleFixture,
      themes: '',
      openingTags: '   ',
    });

    expect(puzzle.themes).toEqual([]);
    expect(puzzle.openingTags).toEqual([]);
  });
});

/**
 * Tests mapping collections of backend puzzles.
 * Verifies that the mapper preserves puzzle order and handles empty arrays.
 */
describe('mapPuzzles', () => {
  it('maps every puzzle and keeps the backend order', () => {
    const puzzles = mapPuzzles(rawPuzzleFixtures);

    expect(puzzles.map((puzzle) => puzzle.id)).toEqual([
      'test-001',
      'test-002',
      'test-003',
    ]);
  });

  it('returns an empty array for an empty response', () => {
    expect(mapPuzzles([])).toEqual([]);
  });
});
