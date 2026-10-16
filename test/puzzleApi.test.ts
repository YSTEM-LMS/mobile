import {
  DEFAULT_PUZZLE_LIMIT,
  fetchRandomPuzzles,
} from '../src/features/puzzles/api';
import type { PuzzleApiClient } from '../src/features/puzzles/api';
import { PuzzleDataError } from '../src/features/puzzles/errors';
import { createFakePuzzleClient } from '../src/features/puzzles/fakeClient';
import {
  fullPuzzleFixture,
  rawPuzzleFixtures,
} from '../src/features/puzzles/fixtures';

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
 * Creates an API client with a mocked GET method.
 * Allows tests to configure API responses and inspect requests.
 *
 * @returns A mock API client and its Jest mock function.
 */
function createMockClient(): { client: PuzzleApiClient; get: jest.Mock } {
  const get = jest.fn();
  return { client: { get }, get };
}

/**
 * Retrieves the error from a rejected Promise for testing.
 *
 * @param promise - Promise expected to reject.
 * @returns The value the Promise rejected with.
 * @throws {Error} If the Promise resolves instead of rejecting.
 */
async function getError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }

  throw new Error('Expected the promise to reject, but it resolved.');
}

/**
 * Tests puzzle API requests, response validation, and error handling.
 */
describe('fetchRandomPuzzles', () => {
  describe('the request', () => {
    it('requests GET /puzzles/random with the default limit of 20', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue(rawPuzzleFixtures);

      await fetchRandomPuzzles(client);

      expect(DEFAULT_PUZZLE_LIMIT).toBe(20);
      expect(get).toHaveBeenCalledTimes(1);
      expect(get.mock.calls[0][0]).toBe('/puzzles/random?limit=20');
    });

    it('uses a custom limit', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue(rawPuzzleFixtures);

      await fetchRandomPuzzles(client, 5);

      expect(get.mock.calls[0][0]).toBe('/puzzles/random?limit=5');
    });

    it('passes the abort signal to the client so requests can be cancelled', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue(rawPuzzleFixtures);
      const controller = new AbortController();

      await fetchRandomPuzzles(client, 20, controller.signal);

      expect(get.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });
  });

  describe('a valid response', () => {
    it('returns validated, mapped puzzles', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue(rawPuzzleFixtures);

      const puzzles = await fetchRandomPuzzles(client);

      expect(puzzles).toHaveLength(rawPuzzleFixtures.length);
      expect(puzzles[0]).toMatchObject({
        id: 'test-001',
        fen: 'sample-position-1',
        moves: ['move1', 'move2', 'move3'],
        themes: ['theme1', 'theme2', 'theme3'],
      });
    });

    it('returns an empty array when the backend has no puzzles', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue([]);

      await expect(fetchRandomPuzzles(client)).resolves.toEqual([]);
    });
  });

  describe('an invalid response', () => {
    it('rejects with an invalid-response error when a puzzle is missing its FEN', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue([omit(fullPuzzleFixture, 'FEN')]);

      const error = await getError(fetchRandomPuzzles(client));

      expect(error).toBeInstanceOf(PuzzleDataError);
      expect((error as PuzzleDataError).kind).toBe('invalid-response');
    });

    it('rejects with an invalid-response error when the body is not an array', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue({ puzzles: rawPuzzleFixtures });

      await expect(fetchRandomPuzzles(client)).rejects.toMatchObject({
        kind: 'invalid-response',
      });
    });

    it('rejects with an invalid-response error when the body is empty', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue(undefined);

      await expect(fetchRandomPuzzles(client)).rejects.toMatchObject({
        kind: 'invalid-response',
      });
    });

    it('does not put raw backend data in the error message', async () => {
      const { client, get } = createMockClient();
      get.mockResolvedValue([{ ...fullPuzzleFixture, rating: 'not a number' }]);

      const error = (await getError(
        fetchRandomPuzzles(client),
      )) as PuzzleDataError;

      expect(error.message).not.toContain('not a number');
      expect(error.message).not.toContain(fullPuzzleFixture.FEN);
    });
  });

  describe('a network failure', () => {
    it('is represented as a request-failed PuzzleDataError', async () => {
      const { client, get } = createMockClient();
      get.mockRejectedValue(new TypeError('Network request failed'));

      const error = await getError(fetchRandomPuzzles(client));

      expect(error).toBeInstanceOf(PuzzleDataError);
      expect((error as PuzzleDataError).kind).toBe('request-failed');
    });

    it('keeps the original error for debugging but hides it from the message', async () => {
      const networkError = new Error('socket hang up at 10.0.0.1:3000');
      const { client, get } = createMockClient();
      get.mockRejectedValue(networkError);

      const error = (await getError(
        fetchRandomPuzzles(client),
      )) as PuzzleDataError;

      expect(error.originalError).toBe(networkError);
      expect(error.message).not.toContain('10.0.0.1');
    });

    it('also handles a non-Error rejection safely', async () => {
      const { client, get } = createMockClient();
      get.mockRejectedValue('offline');

      await expect(fetchRandomPuzzles(client)).rejects.toBeInstanceOf(
        PuzzleDataError,
      );
    });
  });
});

/**
 * Tests the fake API client's default and configurable behaviors.
 * Verifies fixture responses, custom responses, and simulated failures.
 */
describe('createFakePuzzleClient', () => {
  it('returns the sample fixtures by default, and they pass the full pipeline', async () => {
    const puzzles = await fetchRandomPuzzles(createFakePuzzleClient());

    expect(puzzles.map((puzzle) => puzzle.id)).toEqual([
      'test-001',
      'test-002',
      'test-003',
    ]);
  });

  it('can return a custom response', async () => {
    const client = createFakePuzzleClient({ response: [] });

    await expect(fetchRandomPuzzles(client)).resolves.toEqual([]);
  });

  it('can simulate a network failure', async () => {
    const client = createFakePuzzleClient({ error: new Error('offline') });

    await expect(fetchRandomPuzzles(client)).rejects.toMatchObject({
      kind: 'request-failed',
    });
  });
});
