import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Screen } from '@/components/ui/Screen';
import { Spinner } from '@/components/ui/Spinner';
import { SessionProvider, useSession } from '@/providers/SessionProvider';
import { QueryProvider } from '@/providers/QueryProvider';

import '@/config/env';

import ErrorScreen from '@/features/auth/components/error-screen';

export default function RootLayout() {
  return (
    <QueryProvider>
      <SessionProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </SessionProvider>
    </QueryProvider>
  );
}

function RootNavigator() {
  const { session, restoreSession, signOut } = useSession();

  if (session.status === 'bootstrapping') {
    return (
      <Screen background="patterned" centered testID="session-bootstrap-screen">
        <Spinner label="Preparing your session" />
      </Screen>
    );
  }

  // If an error occured on launch while checking if a user has a session.
  if (session.status === 'error') {
    // Get error message from session
    const message = session.errorMessage;
    return (
      <Screen
        background="patterned"
        centered
        testID="session-error-screen"
        contentStyle={{ gap: 16 }}
      >
        <ErrorScreen
          message={message}
          restoreSession={restoreSession}
          signOut={signOut}
        />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected
        guard={session.status === 'anonymous' || session.status === 'expired'}
      >
        <Stack.Screen name="(public)" />
      </Stack.Protected>

      <Stack.Protected guard={session.status === 'authenticated'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
