import { router } from 'expo-router';
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

async function renderAnonymous(initialUrl = '/') {
  const renderedRouter = renderRouter('./app', {
    initialUrl,
  });

  await waitFor(() => {
    expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  });

  return renderedRouter;
}

describe('session-aware navigation', () => {
  it('redirects an anonymous user away from a protected route', async () => {
    const renderedRouter = await renderAnonymous('/mentor');

    expect(renderedRouter.getPathname()).toBe('/sign-in');
    expect(screen.getByText('Welcome back')).toBeOnTheScreen();
  });

  it('allows a student into the app but denies the mentor route', async () => {
    const renderedRouter = await renderAnonymous();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue as student',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });

    expect(
      screen.queryByRole('button', {
        name: 'Open mentor area',
      }),
    ).not.toBeOnTheScreen();

    act(() => {
      router.push('/mentor');
    });

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });
  });

  it('allows a mentor to open the mentor route', async () => {
    const renderedRouter = await renderAnonymous();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue as mentor',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Open mentor area',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/mentor');
      expect(
        screen.getByText('Signed in as Mock Mentor (mentor).'),
      ).toBeOnTheScreen();
    });
  });

  it('keeps an authenticated user out of the public sign-in route', async () => {
    const renderedRouter = await renderAnonymous();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue as student',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });

    act(() => {
      router.push('/sign-in');
    });

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });
  });

  it('does not expose authenticated screens after sign-out', async () => {
    const renderedRouter = await renderAnonymous();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Continue as student',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/');
      expect(screen.getByText('Quick Actions')).toBeOnTheScreen();
    });

    act(() => {
      router.push('/profile');
    });

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/profile');
      expect(screen.getByText('Mock Student')).toBeOnTheScreen();
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Sign out',
      }),
    );

    await waitFor(() => {
      expect(renderedRouter.getPathname()).toBe('/sign-in');
      expect(screen.getByText('Welcome back')).toBeOnTheScreen();
    });

    if (router.canGoBack()) {
      act(() => {
        router.back();
      });

      await waitFor(() => {
        expect(renderedRouter.getPathname()).toBe('/sign-in');
        expect(screen.getByText('Welcome back')).toBeOnTheScreen();
      });
    }
  });
});
