import { useQuery } from "@tanstack/react-query";

import { DEFAULT_PUZZLE_LIMIT, fetchRandomPuzzles, type PuzzleApiClient } from "./api";
import { defaultPuzzleClient } from "./defaultClient";
import { PuzzleDataError } from "./errors";
import { Puzzle } from "./types";

/** Query keys used to identify and cache puzzle requests. */
export const puzzleQueryKeys = {
  random: (limit: number) => ['puzzles', 'random', limit] as const,
};

/**
 * Retrieves and caches a batch of random puzzles.
 * Uses the default puzzle client unless another client is provided.
 * 
 * @param limit - Number of puzzles to request (default: 20).
 * @param client - API client used to retrieve puzzles.
 * @returns Puzzle data, loading and error states, and refetch functionality.
 */
export function useRandomPuzzles(
  limit: number = DEFAULT_PUZZLE_LIMIT,
  client: PuzzleApiClient = defaultPuzzleClient
) {
  const query = useQuery<Puzzle[], PuzzleDataError>({
    queryKey: puzzleQueryKeys.random(limit),
    queryFn: ({ signal }) => fetchRandomPuzzles(client, limit, signal),
    staleTime: Infinity,
  });

  return {
    puzzles: query.data,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}