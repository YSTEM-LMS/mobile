import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import {
  useProfile,
  profileQueryKey,
} from '@/features/profile/hooks/useProfile';
import { createFakeProfileGateway } from '@/features/profile/api/fakeProfileGateway';
import { profileGateway } from '@/features/profile/api/gatewayProvider';
import { ProfileError } from '@/features/profile/api/profile.errors';
import { useSession } from '@/providers/SessionProvider';
import type { SessionState } from '@/state/session';
import { createQueryClient } from '@/providers/QueryProvider';

jest.mock('@/providers/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('@/features/profile/api/gatewayProvider', () => ({
  profileGateway: { getProfile: jest.fn() },
}));

const getProfile = profileGateway.getProfile as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockExpiredSession = jest.fn();
const authed = (username: string): SessionState => ({
  status: 'authenticated',
  user: { username, displayName: `${username} Test`, role: 'student' },
});

const setSession = (session: SessionState | string) =>
  mockUseSession.mockReturnValue({
    session: typeof session === 'string' ? authed(session) : session,
    expiredSession: mockExpiredSession,
  });

let queryClient: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity },
  });
  getProfile
    .mockReset()
    .mockImplementation(async (username: string) => ({ username }));
  mockExpiredSession.mockReset();
});

afterEach(() => {
  queryClient.clear();
});

describe('useProfile', () => {
  it.each<[string, SessionState]>([
    ['bootstrapping', { status: 'bootstrapping' }],
    ['anonymous', { status: 'anonymous' }],
    ['expired', { status: 'expired', expiredMessage: 'Session expired' }],
    ['error', { status: 'error', errorMessage: 'Something went wrong' }],
  ])('does not request a profile while the session is %s', (_name, session) => {
    setSession(session);
    const { result } = renderHook(() => useProfile(), { wrapper });

    expect(getProfile).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('requests the profile for the session username', async () => {
    setSession('alice');
    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getProfile).toHaveBeenCalledWith('alice', {
      signal: expect.any(AbortSignal),
    });
    expect(result.current.data).toMatchObject({ username: 'alice' });
  });

  it('handles an expired session from the profile gateway', async () => {
    setSession('alice');
    getProfile.mockRejectedValue(
      new ProfileError('session-expired', 'expired'),
    );
    renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(mockExpiredSession).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps query data separate per username and never shows the previous profile', async () => {
    const fakeGateway = createFakeProfileGateway({ delayMs: 0 });
    getProfile.mockImplementation(
      (username: string, options?: { signal?: AbortSignal }) =>
        fakeGateway.getProfile(username, options),
    );
    setSession('alice');
    const { result, rerender } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.data?.username).toBe('alice'));

    setSession('bob');
    rerender({});
    expect(result.current.data).toBeUndefined(); // alice's data is not shown for bob

    await waitFor(() => expect(result.current.data?.username).toBe('bob'));
    expect(queryClient.getQueryData(profileQueryKey('alice'))).toMatchObject({
      username: 'alice',
    });
    expect(queryClient.getQueryData(profileQueryKey('bob'))).toMatchObject({
      username: 'bob',
    });
  });

  it('shows no profile after signing out', async () => {
    setSession('alice');
    const { result, rerender } = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    setSession({ status: 'anonymous' });
    queryClient.clear();
    rerender({});

    expect(result.current.data).toBeUndefined();
    expect(queryClient.getQueryData(profileQueryKey('alice'))).toBeUndefined();
  });
});
