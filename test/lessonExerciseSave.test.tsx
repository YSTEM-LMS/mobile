import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { lessonProgressGateway } from '@/features/lessons/api/lessonProgressGatewayProvider';
import { demoIntroduction } from '@/features/lessons/exercise/exercise.fixtures';
import { LessonExerciseBoard } from '@/features/lessons/exercise/LessonExerciseBoard';
import { useSaveLessonCompletion } from '@/features/lessons/hooks/useLessonProgress';
import { useSession } from '@/providers/SessionProvider';
import { AppError } from '@/services/api/apiError';
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
const mockCount = lessonProgressGateway.getCompletedLessonCount as jest.Mock;
const mockSave = lessonProgressGateway.saveLessonCompletion as jest.Mock;

const signedIn: SessionState = {
  status: 'authenticated',
  user: {
    username: 'demo.student',
    displayName: 'Demo Student',
    role: 'student',
  },
};

let queryClient: QueryClient;

function setSession(session: SessionState) {
  mockUseSession.mockReturnValue({
    session,
    expiredSession: mockExpiredSession,
  });
}

// The same wiring Lesson Detail uses: the exercise board, with the progress
// adapter's mutation as the completion callback.
function SavingExercise() {
  const save = useSaveLessonCompletion();
  return (
    <LessonExerciseBoard {...demoIntroduction} onComplete={save.mutateAsync} />
  );
}

function renderExercise() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SavingExercise />
    </QueryClientProvider>,
  );
}

function playCorrectMove() {
  fireEvent.press(screen.getByLabelText('Chess square e2'));
  fireEvent.press(screen.getByLabelText('Chess square e4'));
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  mockCount.mockReset().mockResolvedValue(demoIntroduction.lesson.lessonNumber);
  mockSave.mockReset().mockResolvedValue(undefined);
  mockExpiredSession.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  act(() => queryClient.clear());
});

describe('lesson exercise with the progress adapter', () => {
  it('saves once with the lesson identifier and shows it as saved', async () => {
    setSession(signedIn);
    renderExercise();

    playCorrectMove();

    expect(await screen.findByText('Progress saved.')).toBeTruthy();
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(demoIntroduction.lesson);
    expect(mockCount).toHaveBeenCalledWith(demoIntroduction.lesson.piece);
  });

  it('does not show a failed save as saved', async () => {
    setSession(signedIn);
    mockSave.mockRejectedValue(
      new AppError('NETWORK_ERROR', 'Unable to connect to the server.'),
    );
    renderExercise();

    playCorrectMove();

    expect(await screen.findByText('Progress not saved')).toBeTruthy();
    expect(screen.getByText('Unable to connect to the server.')).toBeTruthy();
    expect(screen.queryByText('Progress saved.')).toBeNull();
  });

  it('does not show an unconfirmed save as saved', async () => {
    setSession(signedIn);
    mockCount.mockResolvedValue(0);
    renderExercise();

    playCorrectMove();

    expect(
      await screen.findByText(
        'The server did not confirm the lesson completion.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Progress saved.')).toBeNull();
  });

  it('does not save for a signed-out session', async () => {
    setSession({ status: 'anonymous' });
    renderExercise();

    playCorrectMove();

    expect(
      await screen.findByText('Sign in to save lesson progress.'),
    ).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves again when the student finishes a new attempt', async () => {
    setSession(signedIn);
    renderExercise();

    playCorrectMove();
    await screen.findByText('Progress saved.');
    fireEvent.press(screen.getByText('Try again'));
    playCorrectMove();

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  });
});
