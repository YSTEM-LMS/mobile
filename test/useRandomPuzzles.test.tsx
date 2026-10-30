import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { PuzzleApiClient } from '../src/features/puzzles/api';
import { PuzzleDataError } from '../src/features/puzzles/errors';
import { rawPuzzleFixtures } from '../src/features/puzzles/fixtures';
import { useRandomPuzzles } from '../src/features/puzzles/useRandomPuzzles';

/**
 * Creates an isolated TanStack Query environment for testing.
 * Disables automatic retries and cache garbage collection during tests.
 *
 * @returns A QueryClientProvider wrapper and its QueryClient instance.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
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
 * Tests the puzzle query hook's loading, success, error, and refetch behavior.
 */
describe('useRandomPuzzles', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    const created = createWrapper();
    queryClient = created.queryClient;
    wrapper = created.Wrapper;
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('starts in a loading state, then exposes the mapped puzzles', async () => {
    const { client, get } = createMockClient();
    get.mockResolvedValue(rawPuzzleFixtures);

    const { result } = renderHook(() => useRandomPuzzles(5, client), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.puzzles).toBeUndefined();
    expect(result.current.isError).toBe(false);

    await waitFor(() => expect(result.current.puzzles).toBeDefined());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.puzzles).toHaveLength(rawPuzzleFixtures.length);
    expect(result.current.puzzles?.[0].moves).toEqual([
      'move1',
      'move2',
      'move3',
    ]);
    expect(get.mock.calls[0][0]).toBe('/puzzles/random?limit=5');
  });

  it('exposes a request-failed error when the request fails', async () => {
    const { client, get } = createMockClient();
    get.mockRejectedValue(new Error('Network request failed'));

    const { result } = renderHook(() => useRandomPuzzles(20, client), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.puzzles).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(PuzzleDataError);
    expect(result.current.error?.kind).toBe('request-failed');
  });

  it('exposes an invalid-response error instead of crashing on bad data', async () => {
    const { client, get } = createMockClient();
    get.mockResolvedValue([
      { puzzleId: 'test-999', moves: 'move1 move2', rating: 1000 },
    ]);

    const { result } = renderHook(() => useRandomPuzzles(20, client), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.puzzles).toBeUndefined();
    expect(result.current.error?.kind).toBe('invalid-response');
  });

  it('can retry after an error and then succeed', async () => {
    const { client, get } = createMockClient();
    get.mockRejectedValueOnce(new Error('Network request failed'));
    get.mockResolvedValueOnce(rawPuzzleFixtures);

    const { result } = renderHook(() => useRandomPuzzles(20, client), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.puzzles).toBeDefined());

    expect(get).toHaveBeenCalledTimes(2);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.puzzles).toHaveLength(rawPuzzleFixtures.length);
  });

  it('fetches a fresh batch when refetch is called after a success', async () => {
    const { client, get } = createMockClient();
    get.mockResolvedValueOnce([rawPuzzleFixtures[0]]);
    get.mockResolvedValueOnce([rawPuzzleFixtures[1]]);

    const { result } = renderHook(() => useRandomPuzzles(1, client), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.puzzles?.[0].id).toBe('test-001'),
    );

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() =>
      expect(result.current.puzzles?.[0].id).toBe('test-002'),
    );
    expect(get).toHaveBeenCalledTimes(2);
  });
});
