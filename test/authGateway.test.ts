import { fetch } from 'expo/fetch';
import { createApiClient } from '@/services/api/apiClient';
import { createAuthGateway } from '@/services/auth/AuthGateway';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

describe('AuthGateway', () => {
  it('Validation sends the correct bearer token.', async () => {
    const mockedFetch = jest.mocked(fetch);
    mockedFetch.mockReset();
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
    } as unknown as Awaited<ReturnType<typeof fetch>>);
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 10_000,
      tokenProvider: async () => 'different-stored-token',
    });
    const gateway = createAuthGateway(client);

    await expect(gateway.validate('token-to-validate')).resolves.toBe(true);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      'https://api.example.com/auth/validate',
      expect.objectContaining({ method: 'POST' }),
    );
    const headers = new Headers(mockedFetch.mock.calls[0][1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-to-validate');
    expect(headers.get('Accept')).toBe('text/plain');
  });
});
