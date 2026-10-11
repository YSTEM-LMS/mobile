import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ProfileRoute from '../app/(app)/(tabs)/profile';
import { createFakeProfileGateway } from '../src/features/profile/api/fakeProfileGateway';
import type { ProfileGateway } from '../src/features/profile/api/profile.gateway';

let mockGateway: ProfileGateway;
const mockSignOut = jest.fn();

jest.mock('@/features/profile/api/gatewayProvider', () => ({
  get profileGateway() {
    return mockGateway;
  },
}));

jest.mock('@/providers/SessionProvider', () => ({
  useSession: () => ({
    session: { status: 'authenticated' },
    signOut: mockSignOut,
  }),
}));

let queryClient: QueryClient;

function renderScreen(
  options: Parameters<typeof createFakeProfileGateway>[0] = {},
) {
  mockGateway = createFakeProfileGateway({ delayMs: 0, ...options });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileRoute />
    </QueryClientProvider>,
  );
}

const LOAD_ERROR = "We couldn't load your profile. Please try again.";

beforeEach(() => mockSignOut.mockClear());

afterEach(() => {
  queryClient?.clear();
});

describe('Profile screen', () => {
  test('shows a loading state, then the profile', async () => {
    renderScreen();
    expect(screen.getByLabelText('Loading profile')).toBeTruthy();
    expect(await screen.findByText('Sample Student')).toBeTruthy();
    expect(screen.queryByLabelText('Loading profile')).toBeNull();
  }, 30000);

  test('displays a valid student profile', async () => {
    renderScreen({ scenario: 'student' });
    expect(await screen.findByText('Sample Student')).toBeTruthy();
    expect(screen.getByText('sample.student')).toBeTruthy();
    expect(screen.getAllByText('Student').length).toBeGreaterThan(0);
    expect(screen.getByText('Sample High School')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('Sample State, Sampleland')).toBeTruthy();
  });

  test('displays a valid mentor profile', async () => {
    renderScreen({ scenario: 'mentor' });
    expect(await screen.findByText('Sample Mentor')).toBeTruthy();
    expect(screen.getAllByText('Mentor').length).toBeGreaterThan(0);
    expect(screen.queryByText('Student')).toBeNull();
  });

  test('missing optional info shows "Not provided" or omits the row, without crashing', async () => {
    renderScreen({ scenario: 'missing-data' });
    expect((await screen.findAllByText('Not provided')).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText('Location')).toBeNull();
  });

  test('shows a useful error when loading fails', async () => {
    renderScreen({ scenario: 'failure' });
    expect(await screen.findByText(LOAD_ERROR)).toBeTruthy();
  });

  test('user can retry after an error', async () => {
    renderScreen({ failTimes: 1 });
    expect(await screen.findByText(LOAD_ERROR)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Try again'));

    expect(await screen.findByText('Sample Student')).toBeTruthy();
    expect(screen.queryByText(LOAD_ERROR)).toBeNull();
  });

  test('handles invalid profile data safely', async () => {
    renderScreen({ scenario: 'invalid-data' });
    expect(
      await screen.findByText("We couldn't read your profile information."),
    ).toBeTruthy();
  });

  test('shows the expired session state without a retry button', async () => {
    renderScreen({ scenario: 'session-expired' });
    expect(
      await screen.findByText(
        'Your session has expired. Please sign in again.',
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Try again')).toBeNull();
  });

  test('Sign out works when the profile loaded', async () => {
    renderScreen();
    await screen.findByText('Sample Student');
    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  test('Sign out still works when loading failed', async () => {
    renderScreen({ scenario: 'failure' });
    await screen.findByText(LOAD_ERROR);
    fireEvent.press(screen.getByLabelText('Sign out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
