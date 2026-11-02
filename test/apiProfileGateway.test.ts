import { createApiProfileGateway } from '@/features/profile/api/ApiProfileGateway';
import { ProfileError } from '@/features/profile/api/profile.errors';
import { AppError } from '@/services/api/apiError';
import type { ApiClientInterface } from '@/types/apiClient.types';

const makeClient = (get: jest.Mock) =>
  ({
    get,
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }) as unknown as ApiClientInterface;

const valid = {
  username: 'alice',
  role: 'Student',
  first_name: ' Alice ',
  last_name: 'Lee',
  school: 'Test High',
  grade_level: '10',
  state: 'CA',
  country: 'USA',
};

describe('ApiProfileGateway', () => {
  it('calls the endpoint with an encoded username and forwards the signal', async () => {
    const get = jest.fn().mockResolvedValue(valid);
    const { signal } = new AbortController();
    await createApiProfileGateway(makeClient(get)).getProfile('a b+c/d?x=1&y', {
      signal,
    });

    expect(get).toHaveBeenCalledWith(
      `/user/getUser?username=${encodeURIComponent('a b+c/d?x=1&y')}`,
      { signal },
    );
  });

  it('validates and maps a valid response', async () => {
    const get = jest.fn().mockResolvedValue(valid);
    const profile = await createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );

    expect(profile).toMatchObject({
      username: 'alice',
      role: 'student',
      fullName: 'Alice Lee',
      gradeLevel: '10',
      location: 'CA, USA',
      email: null, // missing stays null, no inventing
    });
  });

  it('accepts a minimal response with missing optional fields', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({ username: 'alice', role: 'student' });
    const profile = await createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );
    expect(profile).toMatchObject({
      fullName: null,
      school: null,
      location: null,
    });
  });

  it.each([
    ['null body', null],
    ['wrong types', { username: 123, role: 'wizard' }],
    ['not an object', 'oops'],
  ])('throws invalid-data for %s', async (_name, body) => {
    const get = jest.fn().mockResolvedValue(body);
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toMatchObject({ name: 'ProfileError', kind: 'invalid-data' });
  });

  it('maps INVALID_RESPONSE from the client to invalid-data', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(new AppError('INVALID_RESPONSE', 'bad json', 200));
    await expect(
      createApiProfileGateway(makeClient(get)).getProfile('alice'),
    ).rejects.toMatchObject({ kind: 'invalid-data' });
  });

  it.each([
    new AppError('NETWORK_ERROR', 'offline'),
    new AppError('REQUEST_TIMEOUT', 'slow'),
    new AppError('SERVER_ERROR', 'boom', 500),
    new AppError('PERMISSION_DENIED', 'no', 403),
    new Error('something unexpected'),
  ])('maps %p to a safe network error', async (err) => {
    const get = jest.fn().mockRejectedValue(err);
    const promise = createApiProfileGateway(makeClient(get)).getProfile(
      'alice',
    );
    await expect(promise).rejects.toBeInstanceOf(ProfileError);
    await expect(promise).rejects.toMatchObject({ kind: 'network' });
  });

  it.each(['SESSION_EXPIRED', 'REQUEST_CANCEL'] as const)(
    'rethrows %s unchanged',
    async (code) => {
      const err = new AppError(
        code,
        'x',
        code === 'SESSION_EXPIRED' ? 401 : undefined,
      );
      const get = jest.fn().mockRejectedValue(err);
      await expect(
        createApiProfileGateway(makeClient(get)).getProfile('alice'),
      ).rejects.toBe(err);
    },
  );
});
