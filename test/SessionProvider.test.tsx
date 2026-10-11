import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { Button, Text, View } from 'react-native';

import { QueryProvider } from '@/providers/QueryProvider';
import { SessionProvider, useSession } from '@/providers/SessionProvider';

function SessionTestHarness() {
  const { session, mockSignInAs, signOut } = useSession();

  return (
    <View>
      <Text>{session.status}</Text>

      {session.status === 'authenticated' ? (
        <Text>{session.user.role}</Text>
      ) : null}

      <Button title="Mock student" onPress={() => mockSignInAs('student')} />

      <Button title="Mock mentor" onPress={() => mockSignInAs('mentor')} />

      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

describe('SessionProvider', () => {
  it('finishes bootstrap as anonymous', async () => {
    render(
      <QueryProvider>
        <SessionProvider>
          <SessionTestHarness />
        </SessionProvider>
      </QueryProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeOnTheScreen();
    });
  });

  it('supports mocked student sign-in and sign-out', async () => {
    render(
      <QueryProvider>
        <SessionProvider>
          <SessionTestHarness />
        </SessionProvider>
      </QueryProvider>,
    );

    await screen.findByText('anonymous');

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Mock student',
      }),
    );

    expect(await screen.findByText('authenticated')).toBeOnTheScreen();

    expect(screen.getByText('student')).toBeOnTheScreen();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Sign out',
      }),
    );

    await screen.findByText('anonymous');
  });

  it('supports mocked mentor sign-in', async () => {
    render(
      <QueryProvider>
        <SessionProvider>
          <SessionTestHarness />
        </SessionProvider>
      </QueryProvider>,
    );

    await screen.findByText('anonymous');

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Mock mentor',
      }),
    );

    expect(await screen.findByText('mentor')).toBeOnTheScreen();
  });
});
