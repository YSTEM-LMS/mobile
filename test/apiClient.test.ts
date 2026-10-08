import { fetch } from 'expo/fetch';
import { createApiClient } from '@/services/api/apiClient';

jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

const mockedFetch = jest.mocked(fetch);

// Helper function to simulate pending fetch
function mockPendingFetchUntilAbort() {
  mockedFetch.mockImplementation(
    (_input, options) =>
      new Promise<Awaited<ReturnType<typeof fetch>>>((_resolve, reject) => {
        const signal = options?.signal;

        const rejectWhenAborted = () => {
          reject(new Error('Request aborted'));
        };

        if (signal?.aborted) {
          rejectWhenAborted();
        } else {
          signal?.addEventListener('abort', rejectWhenAborted, {
            once: true,
          });
        }
      }),
  );
}

// Generic API client, some tests create and use their own API client
const client = createApiClient({
  baseUrl: 'https://api.example.com',
  timeoutMs: 10_000,
});

describe('ApiClient', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns JSON from a successful GET request', async () => {
    const responseData = {
      id: 'get-item',
      title: 'Fetching item',
    };

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const result = await client.get<{
      id: string;
      title: string;
    }>('/item/item-123');

    expect(result).toEqual(responseData);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example.com/item/item-123',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('sends and returns JSON from a successful POST request', async () => {
    const requestBody = {
      name: 'Test item',
    };

    const responseData = {
      id: 'item-123',
      name: 'Example item',
    };

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 201,
      text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const result = await client.post<
      { id: string; name: string },
      { name: string }
    >('/items', requestBody);

    expect(result).toEqual(responseData);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestBody),
      }),
    );

    const requestOptions = mockedFetch.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Accept')).toBe('application/json');
  });

  it('returns null for empty successful response', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn().mockResolvedValue('   '),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(client.delete('/items/item-123')).resolves.toBeNull();
  });

  it('adds login token to Authorization header', async () => {
    const tokenProvider = jest.fn().mockResolvedValue('test-login-token');

    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          id: 'protected-item',
        }),
      ),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const authenticatedClient = createApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 10_000,
      tokenProvider,
    });

    await authenticatedClient.get<{ id: string }>('/protected');

    expect(tokenProvider).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    const requestOptions = mockedFetch.mock.calls[0][1];
    const headers = new Headers(requestOptions?.headers);

    expect(headers.get('Authorization')).toBe('Bearer test-login-token');
  });

  it('throws backend error', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(client.get('/items')).rejects.toMatchObject({
      name: 'AppError',
      code: 'SERVER_ERROR',
      status: 500,
      message: 'The server could not complete the request.',
    });
  });

  it('throws network error', async () => {
    mockedFetch.mockRejectedValue(new TypeError('Network request failed'));

    await expect(client.get('/items')).rejects.toMatchObject({
      name: 'AppError',
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server.',
    });
  });

  it('throws timeout error', async () => {
    mockPendingFetchUntilAbort();

    const timeoutClient = createApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 1,
    });

    await expect(timeoutClient.get('/items')).rejects.toMatchObject({
      name: 'AppError',
      code: 'REQUEST_TIMEOUT',
      message: 'The request took too long to complete.',
    });
  });

  it('throws invalid response error', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('not valid JSON'),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(client.get('/items')).rejects.toMatchObject({
      name: 'AppError',
      code: 'INVALID_RESPONSE',
      status: 200,
      message: 'The server returned an invalid response.',
    });
  });

  it('throws session-expired error', async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn(),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(client.get('/protected')).rejects.toMatchObject({
      name: 'AppError',
      code: 'SESSION_EXPIRED',
      status: 401,
      message: 'Your session has expired.',
    });
  });

  it('throws cancel error', async () => {
    mockPendingFetchUntilAbort();

    const controller = new AbortController();
    const requestExpectation = expect(
      client.get('/items', { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'AppError',
      code: 'REQUEST_CANCEL',
      message: 'The request was cancelled.',
    });

    controller.abort();

    await requestExpectation;
  });
});
