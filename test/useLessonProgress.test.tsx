import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';

import { useSaveLessonCompletion } from '@/features/lessons/hooks/useLessonProgress';
import { lessonProgressGateway } from '@/features/lessons/api/lessonProgressGatewayProvider';
import { AppError } from '@/services/api/apiError';
import { useSession } from '@/providers/SessionProvider';
import type { SessionState } from '@/state/session';

jest.mock('@/providers/SessionProvider', () => ({ useSession: jest.fn() }));
jest.mock('@/features/lessons/api/lessonProgressGatewayProvider', () => ({
  lessonProgressGateway: {
    getCompletedLessonCount: jest.fn(),
    saveLessonCompletion: jest.fn(),
  },
}));

const mockUseSession = useSession as jest.Mock;
const mockExpiredSession = jest.fn();
const mockGetCount = lessonProgressGateway.getCompletedLessonCount as jest.Mock;
const mockSaveCompletion = lessonProgressGateway.saveLessonCompletion as jest.Mock;

const completion = { piece: 'pawn', lessonNumber: 1 };
let queryClient: QueryClient;

const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

function setSession(session: SessionState) {
  mockUseSession.mockReturnValue({
    session,
    expiredSession: mockExpiredSession,
  });
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  mockGetCount.mockReset().mockResolvedValue(1);
  mockSaveCompletion.mockReset().mockResolvedValue(undefined);
  mockExpiredSession.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  act(() => queryClient.clear());
});

describe('useSaveLessonCompletion', () => {
  it('does not save progress for an unauthenticated session', async () => {
    setSession({ status: 'anonymous' });
    const { result } = renderHook(() => useSaveLessonCompletion(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(completion)).rejects.toMatchObject({
        code: 'PERMISSION_DENIED',
      });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSaveCompletion).not.toHaveBeenCalled();
  });

  it('reads back the completion count before resolving successfully', async () => {
    setSession({
      status: 'authenticated',
      user: {
        username: 'demo.student',
        displayName: 'Demo Student',
        role: 'student',
      },
    });
    const { result } = renderHook(() => useSaveLessonCompletion(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(completion)).resolves.toBe(1);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSaveCompletion).toHaveBeenCalledWith(completion);
    expect(mockGetCount).toHaveBeenCalledWith('pawn');
  });

  it('expires the session when the save request reports an expired token', async () => {
    setSession({
      status: 'authenticated',
      user: {
        username: 'demo.student',
        displayName: 'Demo Student',
        role: 'student',
      },
    });
    mockSaveCompletion.mockRejectedValue(
      new AppError('SESSION_EXPIRED', 'Your session has expired.'),
    );
    const { result } = renderHook(() => useSaveLessonCompletion(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync(completion)).rejects.toMatchObject(
        { code: 'SESSION_EXPIRED' },
      );
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(mockExpiredSession).toHaveBeenCalledTimes(1);
    });
  });
});
