import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import {
  initialSessionState,
  sessionReducer,
  type SessionState,
  type UserRole,
} from '@/state/session';

// Temporary AppError import until API is merged
import { AppError, tokenStore } from '@/services/storage/TokenStore';

import { useQueryClient } from '@tanstack/react-query';
import {
  authGateway,
  studentToken,
  mentorToken,
} from '@/services/auth/AuthGateway';
import { decodeJWT } from '@/services/auth/decodeJWT';
import type { AuthGateway } from '@/types/authGateway';

type SessionContextValue = {
  session: SessionState;
  mockSignInAs: (role: UserRole) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  expiredSession: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const fakeAuthGateway: AuthGateway = {
  async login(username) {
    if (username === 'student') return studentToken;
    if (username === 'mentor') return mentorToken;
    throw new AppError('UNKNOWN', 'Unknown test account.');
  },
  async logout() {
    try {
      await tokenStore.deleteToken();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('UNKNOWN', 'Sign out failed. Please try again.');
    }
  },
  async validate(token) {
    return token === studentToken || token === mentorToken;
  },
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);

  // Used to clear cache when signing out.
  const queryClient = useQueryClient();

  const expiringRef = useRef(false);
  const expiredSession = useCallback(async () => {
    if (expiringRef.current) {
      return;
    }

    expiringRef.current = true;

    // This ensures if deleteToken fails cancelQueries still gets called
    try {
      await queryClient.cancelQueries();
      queryClient.clear();

      await tokenStore.deleteToken();

      dispatch({
        type: 'expired',
        expiredMessage: 'Your session has expired. Please sign in again.',
      });
    } catch {
      dispatch({
        type: 'error',
        errorMessage:
          'Your session has expired, but we could not sign you out. Please sign out.',
      });
    } finally {
      expiringRef.current = false;
    }
  }, [queryClient]);

  const restoreRef = useRef(false);

  const restoreSession = useCallback(async (): Promise<void> => {
    // This prevents a user from pressing on the retry button multiple times.
    // Which will cause this function to run multiple times.
    if (restoreRef.current) {
      return;
    }

    restoreRef.current = true;

    dispatch({ type: 'restore' });

    try {
      const token = await tokenStore.getToken();

      if (token) {
        // For dev testing
        const isFakeToken =
          __DEV__ && (token === studentToken || token === mentorToken);
        const validToken = isFakeToken
          ? await fakeAuthGateway.validate(token)
          : await authGateway.validate(token);

        if (validToken) {
          const decoded = decodeJWT(token);

          if (
            typeof decoded.firstName !== 'string' ||
            typeof decoded.lastName !== 'string' ||
            typeof decoded.username !== 'string' ||
            (decoded.role !== 'student' && decoded.role !== 'mentor')
          ) {
            throw new Error('Missing user claims');
          }

          dispatch({
            type: 'authenticated',
            user: {
              username: decoded.username,
              displayName: decoded.firstName + ' ' + decoded.lastName,
              role: decoded.role,
            },
          });
        } else {
          // token is invalid. Session state is expired
          await expiredSession();
        }
      } else {
        // There is no saved token / previous session so state is anonymous
        dispatch({ type: 'anonymous' });
      }
    } catch (error) {
      // Show an error state. Ask to refetch, since there may be a valid token.
      // Error is caused either by secure token get failing, or connection failure when validating.
      if (error instanceof AppError && error.code === 'SESSION_EXPIRED') {
        await expiredSession();
      } else {
        const message =
          error instanceof AppError
            ? error.message
            : 'Failed to restore session. Please try again.';

        dispatch({
          type: 'error',
          errorMessage: message,
        });
      }
    } finally {
      restoreRef.current = false;
    }
  }, [expiredSession]);

  async function mockSignInAs(role: UserRole) {
    if (!__DEV__) return;

    const token = await fakeAuthGateway.login(role, '');

    const decoded = decodeJWT(token);

    if (
      typeof decoded.firstName !== 'string' ||
      typeof decoded.lastName !== 'string' ||
      typeof decoded.username !== 'string' ||
      (decoded.role !== 'student' && decoded.role !== 'mentor')
    ) {
      throw new Error('Missing user claims');
    }

    await tokenStore.setToken(token);

    dispatch({
      type: 'authenticated',
      user: {
        username: decoded.username,
        displayName: decoded.firstName + ' ' + decoded.lastName,
        role: decoded.role,
      },
    });
  }

  async function signIn(username: string, password: string): Promise<void> {
    try {
      const token = await authGateway.login(username, password);

      if (!token) {
        // Empty token recieved
        throw new AppError(
          'INVALID_RESPONSE',
          'The server returned an invalid response.',
        );
      }

      const decoded = decodeJWT(token);

      if (
        typeof decoded.firstName !== 'string' ||
        typeof decoded.lastName !== 'string' ||
        typeof decoded.username !== 'string' ||
        (decoded.role !== 'student' && decoded.role !== 'mentor')
      ) {
        throw new Error('Missing user claims');
      }

      await tokenStore.setToken(token);

      dispatch({
        type: 'authenticated',
        user: {
          username: decoded.username,
          displayName: decoded.firstName + ' ' + decoded.lastName,
          role: decoded.role,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError('UNKNOWN', 'Sign in failed. Please try again.');
      }
    }
  }

  async function signOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();

      await authGateway.logout();

      dispatch({ type: 'signedOut' });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError('UNKNOWN', 'Sign out failed. Please try again.');
      }
    }
  }

  // On launch check if a user has a valid session
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <SessionContext.Provider
      value={{
        session,
        mockSignInAs,
        signIn,
        signOut,
        expiredSession,
        restoreSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (context === null) {
    throw new Error('useSession must be used within SessionProvider');
  }

  return context;
}
