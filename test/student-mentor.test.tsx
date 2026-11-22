import { router } from 'expo-router';
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import { Text } from 'react-native';

import { createMentorPracticeClient } from '@/features/play/services/mentorPracticeSocketClient';
import {
  createFakeMentorPracticeClient,
  type FakeMentorPracticeClient,
} from '@/features/play/services/fakeMentorPracticeClient';
import { mentorPracticeWorkedExample } from '@/features/play/services/mentorPracticeFixtures';

import StudentMentorRoute from '../app/(app)/student-mentor';

jest.mock('@/features/play/services/mentorPracticeSocketClient', () => ({
  createMentorPracticeClient: jest.fn(),
}));

jest.mock('@/providers/SessionProvider', () => ({
  useSession: () => ({
    session: {
      status: 'authenticated',
      user: { username: 'student', displayName: 'Student', role: 'student' },
    },
  }),
}));

beforeEach(() => {
  jest.mocked(createMentorPracticeClient).mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

function openPractice(client: FakeMentorPracticeClient) {
  jest.mocked(createMentorPracticeClient).mockReturnValue(client);
  const navigation = renderRouter({
    index: () => <Text>Practice home</Text>,
    'student-mentor': StudentMentorRoute,
  });

  act(() => router.push('/student-mentor'));
  return navigation;
}

async function waitUntilJoined(client: FakeMentorPracticeClient) {
  await waitFor(() => {
    expect(client.status).toBe('joined');
    expect(screen.queryByText('Starting game…')).toBeNull();
  });
}

describe('student–mentor practice screen', () => {
  it('The shared board updates when the fake client sends a confirmed position.', async () => {
    const client = createFakeMentorPracticeClient({ color: 'white' });
    openPractice(client);
    await waitUntilJoined(client);

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    fireEvent.press(screen.getByLabelText('Chess square e4'));

    expect(client.sentMoves).toEqual([
      { from: 'e2', to: 'e4', promotion: 'q' },
    ]);

    expect(screen.getByLabelText('White p on e2')).toBeTruthy();
    expect(screen.queryByLabelText('White p on e4')).toBeNull();

    await waitFor(() => {
      expect(screen.getByLabelText('White p on e4')).toBeTruthy();
      expect(screen.queryByLabelText('White p on e2')).toBeNull();
    });

    fireEvent.press(screen.getByLabelText('Chess square d2'));
    expect(screen.queryByTestId('legal-move-d3')).toBeNull();
    fireEvent.press(screen.getByLabelText('Chess square d4'));
    expect(client.sentMoves).toHaveLength(1);

    await act(async () => {
      client.partnerMove({ from: 'e7', to: 'e5' });
    });

    expect(screen.getByLabelText('Black p on e5')).toBeTruthy();
    expect(screen.queryByLabelText('Black p on e7')).toBeNull();
    expect(screen.getByLabelText('White p on e4')).toBeTruthy();

    // The remote reply gives control back to this screen's White player.
    fireEvent.press(screen.getByLabelText('Chess square d2'));
    expect(screen.getByTestId('legal-move-d3')).toBeTruthy();
    expect(client.sentMoves).toHaveLength(1);
  });

  it('The board is locked while waiting for the other player and when disconnected.', async () => {
    const client = createFakeMentorPracticeClient({ color: 'black' });
    openPractice(client);
    await waitUntilJoined(client);

    fireEvent.press(screen.getByLabelText('Chess square e2'));
    expect(screen.queryByTestId('legal-move-e4')).toBeNull();
    fireEvent.press(screen.getByLabelText('Chess square e4'));
    expect(client.sentMoves).toHaveLength(0);
    expect(screen.getByLabelText('White p on e2')).toBeTruthy();

    await act(async () => {
      client.partnerMove({ from: 'e2', to: 'e4' });
    });

    fireEvent.press(screen.getByLabelText('Chess square e7'));
    expect(screen.getByTestId('legal-move-e5')).toBeTruthy();

    await act(async () => {
      client.endSession();
    });

    expect(screen.getByText('Session Ended')).toBeTruthy();
    expect(screen.queryByTestId('chessboard-grid')).toBeNull();
    expect(screen.queryByLabelText('Chess square e7')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeTruthy();
    expect(client.sentMoves).toHaveLength(0);
  });

  it('Leaving stops subsequent updates from changing the screen.', async () => {
    const client = createFakeMentorPracticeClient({ color: 'black' });
    const subscribe = jest.spyOn(client, 'subscribe');
    const navigation = openPractice(client);
    await waitUntilJoined(client);
    const lateListener = subscribe.mock.calls[0][0];

    act(() => {
      client.partnerMove({ from: 'e2', to: 'e4' });
      fireEvent.press(screen.getByLabelText('Exit game'));
    });

    await waitFor(() => {
      expect(navigation.getPathname()).toBe('/');
      expect(screen.getByText('Practice home')).toBeTruthy();
      expect(client.listenerCount).toBe(0);
      expect(client.leaveCalls).toBe(1);
    });

    await act(async () => {
      lateListener(mentorPracticeWorkedExample.studentMove.event);
      lateListener({ type: 'ended' });
    });

    expect(navigation.getPathname()).toBe('/');
    expect(screen.getByText('Practice home')).toBeTruthy();
    expect(screen.queryByTestId('chessboard-grid')).toBeNull();
    expect(screen.queryByText('Session Ended')).toBeNull();
    expect(client.listenerCount).toBe(0);
    expect(client.leaveCalls).toBe(1);
  });
});
