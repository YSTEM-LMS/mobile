import { router } from 'expo-router';
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';
import { render } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Button, Text, View } from 'react-native';

import { authGateway } from '@/services/auth/AuthGateway';
import { tokenStore } from '@/services/storage/TokenStore';
import { createQueryClient } from '@/providers/QueryProvider';
import { SessionProvider, useSession } from '@/providers/SessionProvider';
import { renderAnonymous } from './fixtures/renderAnonymous';
// Temporary AppError import until API is merged
import { AppError } from '@/services/storage/TokenStore';

const studentToken =
  'eyJ0eXAiOiJKV1QifQ.eyJ1c2VybmFtZSI6InRlc3Qtc3R1ZGVudCIsImZpcnN0TmFtZSI6IlRlc3QiLCJsYXN0TmFtZSI6IlN0dWRlbnQiLCJyb2xlIjoic3R1ZGVudCJ9.fake';

function submitSignIn(username: string, password: string) {
  fireEvent.changeText(screen.getByTestId('username-input'), username);
  fireEvent.changeText(screen.getByTestId('password-input'), password);
  fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
}

function MockScreen() {
  const { session, mockSignInAs, signOut } = useSession();

  return (
    <View>
      <Text>{session.status}</Text>
      <Button title="Mock student" onPress={() => mockSignInAs('student')} />
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}

describe('authentication', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Successful login stores the token.', async () => {
    let savedToken: string | null = null;
    const login = jest
      .spyOn(authGateway, 'login')
      .mockResolvedValue(studentToken);
    const setToken = jest
      .spyOn(tokenStore, 'setToken')
      .mockImplementation(async (token) => {
        savedToken = token;
      });
    jest
      .spyOn(tokenStore, 'getToken')
      .mockResolvedValueOnce(null)
      .mockImplementation(async () => savedToken);

    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });
    await screen.findByText('Welcome back');
    submitSignIn('User', 'password123');

    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));
    expect(login).toHaveBeenCalledWith('User', 'password123');
    expect(setToken).toHaveBeenCalledWith(studentToken);
    expect(await tokenStore.getToken()).toBe(studentToken);
  });

  it('Invalid credentials show an error.', async () => {
    const login = jest
      .spyOn(authGateway, 'login')
      .mockRejectedValue(
        new AppError('UNKNOWN', 'Invalid username or password.'),
      );
    const renderedRouter = await renderAnonymous('/sign-in');
    submitSignIn('User', 'wrong-password');

    expect(
      await screen.findByText('Invalid username or password.'),
    ).toBeOnTheScreen();
    expect(renderedRouter.getPathname()).toBe('/sign-in');
    expect(login).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['', ''],
    ['   ', '   '],
    ['User', ''],
    ['', 'password123'],
  ])('Blank fields are rejected (%s, %s).', async (username, password) => {
    const login = jest.spyOn(authGateway, 'login');
    const renderedRouter = await renderAnonymous('/sign-in');
    submitSignIn(username, password);

    expect(
      await screen.findByText('Please enter your username and password'),
    ).toBeOnTheScreen();
    expect(renderedRouter.getPathname()).toBe('/sign-in');
    expect(login).not.toHaveBeenCalled();
  });

  it('Connection failure shows a retryable error.', async () => {
    const login = jest
      .spyOn(authGateway, 'login')
      .mockRejectedValueOnce(
        new AppError('NETWORK_ERROR', 'Unable to connect to the server.'),
      )
      .mockResolvedValue(studentToken);
    const renderedRouter = await renderAnonymous('/sign-in');
    submitSignIn('User', 'password123');

    expect(
      await screen.findByText('Unable to connect to the server.'),
    ).toBeOnTheScreen();
    expect(renderedRouter.getPathname()).toBe('/sign-in');

    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));
    expect(login).toHaveBeenCalledTimes(2);
  });

  it('A stored valid token restores the session.', async () => {
    const getToken = jest
      .spyOn(tokenStore, 'getToken')
      .mockResolvedValue(studentToken);
    const validate = jest
      .spyOn(authGateway, 'validate')
      .mockResolvedValue(true);
    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });

    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));
    expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    expect(getToken).toHaveBeenCalled();
    expect(validate).toHaveBeenCalledWith(studentToken);
  });

  it('An expired token is deleted.', async () => {
    let savedToken: string | null = studentToken;
    jest
      .spyOn(tokenStore, 'getToken')
      .mockImplementation(async () => savedToken);
    const deleteToken = jest
      .spyOn(tokenStore, 'deleteToken')
      .mockImplementation(async () => {
        savedToken = null;
      });
    const validate = jest
      .spyOn(authGateway, 'validate')
      .mockResolvedValue(false);
    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });

    expect(
      await screen.findByText(
        'Your session has expired. Please sign in again.',
      ),
    ).toBeOnTheScreen();
    expect(renderedRouter.getPathname()).toBe('/sign-in');

    expect(validate).toHaveBeenCalledWith(studentToken);
    expect(deleteToken).toHaveBeenCalledTimes(1);
    expect(await tokenStore.getToken()).toBeNull();
  });

  it('A validation connection failure does not immediately destroy a potentially valid token.', async () => {
    const getToken = jest
      .spyOn(tokenStore, 'getToken')
      .mockResolvedValue(studentToken);
    const deleteToken = jest.spyOn(tokenStore, 'deleteToken');
    const validate = jest
      .spyOn(authGateway, 'validate')
      .mockRejectedValueOnce(
        new AppError('NETWORK_ERROR', 'Unable to connect to the server.'),
      )
      .mockResolvedValue(true);
    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });

    expect(await screen.findByTestId('session-error-screen')).toBeOnTheScreen();
    expect(deleteToken).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));
    expect(getToken).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenCalledTimes(2);
    expect(deleteToken).not.toHaveBeenCalled();
  });

  it('Sign Out deletes the token.', async () => {
    let savedToken: string | null = null;
    jest.spyOn(authGateway, 'login').mockResolvedValue(studentToken);
    jest.spyOn(tokenStore, 'setToken').mockImplementation(async (token) => {
      savedToken = token;
    });
    jest
      .spyOn(tokenStore, 'getToken')
      .mockResolvedValueOnce(null)
      .mockImplementation(async () => savedToken);
    const deleteToken = jest
      .spyOn(tokenStore, 'deleteToken')
      .mockImplementation(async () => {
        savedToken = null;
      });
    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });
    await screen.findByText('Welcome back');
    submitSignIn('User', 'password123');
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));

    act(() => router.push('/profile'));
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/profile'));
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/sign-in'));
    expect(deleteToken).toHaveBeenCalledTimes(1);
    expect(await tokenStore.getToken()).toBeNull();
  });

  it('Sign Out clears private cached data.', async () => {
    const queryClient = createQueryClient();
    const privateKey = ['student', 'profile'];
    render(
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <MockScreen />
        </SessionProvider>
      </QueryClientProvider>,
    );

    await screen.findByText('anonymous');
    fireEvent.press(screen.getByRole('button', { name: 'Mock student' }));
    expect(await screen.findByText('authenticated')).toBeOnTheScreen();
    queryClient.setQueryData(privateKey, { name: 'Test Student' });
    expect(queryClient.getQueryData(privateKey)).toBeDefined();
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeOnTheScreen();
      expect(queryClient.getQueryData(privateKey)).toBeUndefined();
    });
  });

  it('The password is never stored.', async () => {
    jest.spyOn(authGateway, 'login').mockResolvedValue(studentToken);
    const setToken = jest
      .spyOn(tokenStore, 'setToken')
      .mockResolvedValue(undefined);
    await renderAnonymous('/sign-in');
    submitSignIn('User', 'password123');

    await screen.findByText('Quick Actions');
    expect(setToken).toHaveBeenCalledTimes(1);
    expect(setToken).toHaveBeenCalledWith(studentToken);
    expect(setToken).not.toHaveBeenCalledWith('password123');
  });

  it('Protected screens cannot be reopened after Sign Out.', async () => {
    jest.spyOn(authGateway, 'login').mockResolvedValue(studentToken);
    const renderedRouter = await renderAnonymous('/sign-in');
    submitSignIn('User', 'password123');
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/'));

    act(() => router.push('/profile'));
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/profile'));
    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/sign-in'));

    if (router.canGoBack()) {
      act(() => router.back());
      await waitFor(() =>
        expect(renderedRouter.getPathname()).toBe('/sign-in'),
      );
    }
    act(() => router.push('/profile'));
    await waitFor(() => expect(renderedRouter.getPathname()).toBe('/sign-in'));
  });

  it('Sign Out from the error screen allows retry after failure.', async () => {
    let savedToken: string | null = studentToken;

    jest
      .spyOn(tokenStore, 'getToken')
      .mockImplementation(async () => savedToken);

    jest
      .spyOn(authGateway, 'validate')
      .mockRejectedValue(
        new AppError('NETWORK_ERROR', 'Unable to connect to the server.'),
      );

    const deleteToken = jest
      .spyOn(tokenStore, 'deleteToken')
      .mockRejectedValueOnce(
        new AppError('UNKNOWN', 'Sign out failed. Please try again.'),
      )
      .mockImplementationOnce(async () => {
        savedToken = null;
      });

    const renderedRouter = renderRouter('./app', { initialUrl: '/sign-in' });

    await screen.findByTestId('session-error-screen');
    fireEvent.press(screen.getByRole('button', { name: 'Sign Out' }));

    const loadingButton = screen.getByRole('button', {
      name: 'Signing out',
      busy: true,
    });
    expect(loadingButton).toBeDisabled();

    fireEvent.press(loadingButton);
    await waitFor(() => expect(deleteToken).toHaveBeenCalledTimes(1));

    expect(
      await screen.findByText('Unable to sign out. Please try again.'),
    ).toBeOnTheScreen();

    const retryButton = screen.getByRole('button', { name: 'Sign Out' });
    expect(retryButton).toBeEnabled();
    fireEvent.press(retryButton);

    expect(await screen.findByText('Welcome back')).toBeOnTheScreen();
    expect(renderedRouter.getPathname()).toBe('/sign-in');
    expect(deleteToken).toHaveBeenCalledTimes(2);
    expect(savedToken).toBeNull();
  });
});
