import {
  fullPuzzleFixture,
  minimalPuzzleFixture,
  partialPuzzleFixture,
  rawPuzzleFixtures,
} from '../src/features/puzzles/fixtures';
import {
  backendPuzzleSchema,
  backendPuzzlesResponseSchema,
} from '../src/features/puzzles/schema';

/**
 * Creates a copy of an object without the specified property.
 * Used to simulate backend responses with missing fields.
 *
 * @param value - Original object to copy.
 * @param key - Property to remove from the object.
 * @returns A new object without the specified property.
 */
function omit<T extends object, K extends keyof T>(
  value: T,
  key: K,
): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(value).filter(([name]) => name !== key),
  ) as Omit<T, K>;
}

/**
 * Creates a copy of an object with a renamed property.
 * Used to simulate incorrect backend field capitalization.
 *
 * @param value - Original object to copy.
 * @param from - Current property name.
 * @param to - Replacement property name.
 * @returns A new object with the specified property renamed.
 */
function renameKey(value: Record<string, unknown>, from: string, to: string) {
  return Object.fromEntries(
    Object.entries(value).map(([name, fieldValue]) => [
      name === from ? to : name,
      fieldValue,
    ]),
  );
}

describe('backendPuzzleSchema', () => {
  describe('valid data', () => {
    it.each([
      ['full', fullPuzzleFixture],
      ['partial', partialPuzzleFixture],
      ['minimal', minimalPuzzleFixture],
    ])('accepts the %s fixture', (_name, puzzle) => {
      expect(backendPuzzleSchema.safeParse(puzzle).success).toBe(true);
    });

    it('supports the exact backend capitalization (uppercase FEN, lowercase moves and themes)', () => {
      const result = backendPuzzleSchema.safeParse(fullPuzzleFixture);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FEN).toBe(fullPuzzleFixture.FEN);
        expect(result.data.moves).toBe(fullPuzzleFixture.moves);
        expect(result.data.themes).toBe(fullPuzzleFixture.themes);
      }
    });
  });

  describe('missing required fields', () => {
    it('rejects a puzzle with a missing FEN', () => {
      expect(
        backendPuzzleSchema.safeParse(omit(fullPuzzleFixture, 'FEN')).success,
      ).toBe(false);
    });

    it('rejects a puzzle with a missing puzzle ID', () => {
      expect(
        backendPuzzleSchema.safeParse(omit(fullPuzzleFixture, 'puzzleId'))
          .success,
      ).toBe(false);
    });

    it.each(['moves', 'rating'] as const)(
      'rejects a puzzle that is missing %s',
      (field) => {
        expect(
          backendPuzzleSchema.safeParse(omit(fullPuzzleFixture, field)).success,
        ).toBe(false);
      },
    );

    it.each(['FEN', 'puzzleId', 'moves'] as const)(
      'rejects a puzzle whose %s is empty',
      (field) => {
        expect(
          backendPuzzleSchema.safeParse({ ...fullPuzzleFixture, [field]: '' })
            .success,
        ).toBe(false);
      },
    );
  });

  describe('incorrect capitalization', () => {
    it.each([
      ['FEN', 'fen'],
      ['moves', 'Moves'],
      ['puzzleId', 'puzzleID'],
    ])('rejects "%s" sent as "%s"', (from, to) => {
      const payload = renameKey(fullPuzzleFixture, from, to);

      expect(backendPuzzleSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('incorrect field types', () => {
    it.each([
      ['rating as a string', { rating: '1936' }],
      ['moves as an array', { moves: ['c2d1', 'e6e1'] }],
      ['themes as an array', { themes: ['mate', 'mateIn2'] }],
      ['puzzleId as a number', { puzzleId: 8 }],
      ['FEN as a number', { FEN: 123 }],
      ['nbPlays as a string', { nbPlays: '5400' }],
    ])('rejects %s', (_label, override) => {
      expect(
        backendPuzzleSchema.safeParse({ ...fullPuzzleFixture, ...override })
          .success,
      ).toBe(false);
    });
  });
});

describe('backendPuzzlesResponseSchema', () => {
  it('accepts an array of valid puzzles', () => {
    const result = backendPuzzlesResponseSchema.safeParse(rawPuzzleFixtures);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(rawPuzzleFixtures.length);
    }
  });

  it('accepts an empty array', () => {
    expect(backendPuzzlesResponseSchema.safeParse([]).success).toBe(true);
  });

  it.each([
    ['an object instead of an array', { puzzles: rawPuzzleFixtures }],
    ['an error object', { message: 'Internal server error' }],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'not puzzles'],
    ['an array of unrelated objects', [{ message: 'hello' }]],
    ['an array containing null', [fullPuzzleFixture, null]],
    [
      'an array containing an invalid puzzle',
      [fullPuzzleFixture, { puzzleId: 'test-999' }],
    ],
  ])('rejects a malformed collection: %s', (_label, payload) => {
    expect(backendPuzzlesResponseSchema.safeParse(payload).success).toBe(false);
  });
});
