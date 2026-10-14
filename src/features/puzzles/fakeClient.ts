import type { PuzzleApiClient } from './api';
import { rawPuzzleFixtures } from './fixtures';

/**
 * Configuration options for the fake puzzle API client.
 */
export type FakePuzzleClientOptions = {
  /** Custom response data used to simulate backend responses. */
  response?: unknown;

  /** Optional error used to simulate request failures. */
  error?: Error;

  /** Optional simulated request delay in milliseconds. */
  delayMs?: number;
}

/**
 * Creates a fake puzzle API client using predefined response data.
 * Simulates successful requests, failed requests, and network delays.
 * 
 * @param options - Configuration for the fake client's behavior.
 * @returns A fake client implementing the PuzzleApiClient interface.
 */
export function createFakePuzzleClient(options: FakePuzzleClientOptions = {}): PuzzleApiClient {
  const { response = rawPuzzleFixtures, error, delayMs = 0 } = options;

  return {
    async get() {
      if (delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }

      if (error) {
        throw error;
      }

      return response;
    },
  };
}