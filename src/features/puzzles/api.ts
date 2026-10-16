import { PuzzleDataError } from './errors';
import { mapPuzzles } from './mapper';
import { backendPuzzlesResponseSchema } from './schema';
import type { Puzzle } from './types';

// Default number of puzzles to request if no limit is specified.
export const DEFAULT_PUZZLE_LIMIT = 20;

/**
 * Defines the HTTP interface required by the puzzle API.
 *
 * Any client matching this type must have a get() method that:
 * - Accepts an API endpoint path (ex. '/puzzles/random?limit=20').
 * - Optionally accepts an AbortSignal to cancel the request.
 * - Returns a Promise containing the response data.
 *
 * Allows use of either a fake API client for development/testing or Brandon's API client when it is available.
 *
 * The response is typed as unknown because it hasn't been validated yet.
 */
export type PuzzleApiClient = {
  get(path: string, options?: { signal?: AbortSignal }): Promise<unknown>;
};

/**
 * Fetches random puzzles from the YSTEM backend.
 *
 * Validates the server response and converts the data into the app-facing Puzzle format.
 *
 * @param client - API client used to perform the request.
 * @param limit - Number of puzzles to request (default: 20).
 * @param signal - Optional AbortSignal for request cancellation.
 * @returns A promise containing an array of validated, mapped Puzzle objects.
 * @throws {PuzzleDataError} If the request fails or the response is invalid.
 */
export async function fetchRandomPuzzles(
  client: PuzzleApiClient,
  limit: number = DEFAULT_PUZZLE_LIMIT,
  signal?: AbortSignal,
): Promise<Puzzle[]> {
  // The backend response is initially unknown until Zod validates it.
  let payload: unknown;
  try {
    // Request puzzles from GET /puzzles/random?limit=<limit>.
    payload = await client.get(`/puzzles/random?limit=${limit}`, { signal });
  } catch (error) {
    // If the request fails (ex. network error), throw a controlled error with a message instead of exposing the original error.
    throw new PuzzleDataError(
      'request-failed',
      'Puzzles could not be loaded. Check your connection and try again.',
      error,
    );
  }

  // Validate the response against our backend puzzle schema.
  // safeParse() returns a success/failure result instead of throwing.
  const parsed = backendPuzzlesResponseSchema.safeParse(payload);

  if (!parsed.success) {
    // If the response has missing fields, incorrect types, or invalid structure, throw a controlled error.
    throw new PuzzleDataError(
      'invalid-response',
      'The puzzle server sent data the app could not read. Please try again later.',
      parsed.error,
    );
  }

  // If the response is validated, convert BackendPuzzle[] into Puzzle[].
  // The rest of the app can now work with UI-friendly puzzle data.
  return mapPuzzles(parsed.data);
}
