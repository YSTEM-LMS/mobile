jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@/config/env', () => ({ env: { apiBaseUrl: 'https://api.test' } }));

import { fetch } from 'expo/fetch';
import { createApiClient } from '@/services/api/apiClient';
import { createApiProfileGateway } from '@/features/profile/api/ApiProfileGateway';

const mockFetch = fetch as unknown as jest.Mock;
const sent = (i = 0) => ({
  url: mockFetch.mock.calls[i][0] as string,
  headers: mockFetch.mock.calls[i][1].headers as Headers,
});

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ username: 'alice', role: 'student' }),
  });
});

describe('profile request authentication', () => {
  it('sends the bearer token supplied by the client tokenProvider', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.test',
      timeoutMs: 1000,
      tokenProvider: async () => 'test-token',
    });
    await createApiProfileGateway(client).getProfile('a b');

    expect(sent().url).toBe('https://api.test/user/getUser?username=a%20b');
    expect(sent().headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('reads the current token on every request', async () => {
    let token: string | null = 'first';
    const client = createApiClient({
      baseUrl: 'https://api.test',
      timeoutMs: 1000,
      tokenProvider: async () => token,
    });
    const gateway = createApiProfileGateway(client);

    await gateway.getProfile('alice');
    token = 'second';
    await gateway.getProfile('alice');
    token = null;
    await gateway.getProfile('alice');

    expect(sent(0).headers.get('Authorization')).toBe('Bearer first');
    expect(sent(1).headers.get('Authorization')).toBe('Bearer second');
    expect(sent(2).headers.get('Authorization')).toBeNull();
  });
});
