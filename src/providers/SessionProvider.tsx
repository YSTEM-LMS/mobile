import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from 'react';

import {
  initialSessionState,
  sessionReducer,
  type SessionState,
  type SessionUser,
  type UserRole,
} from '@/state/session';

import { tokenStore } from '@/features/auth/secureStore';

import { useQueryClient } from '@tanstack/react-query';

type SessionContextValue = {
  session: SessionState;
  mockSignInAs: (role: UserRole) => void;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

const mockUsers: Record<UserRole, SessionUser> = {
  student: {
    id: 'mock-student',
    displayName: 'Mock Student',
    role: 'student',
  },
  mentor: {
    id: 'mock-mentor',
    displayName: 'Mock Mentor',
    role: 'mentor',
  },
};

// FAKE GATEWAY
interface AuthGateway {
  login: (username: string, password: string) => Promise<string>;
  validate: (token: string) => Promise<boolean>;
}

const authGateway: AuthGateway = {
  async login(username: string, password: string): Promise<string> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    return 'token123';
  },
  async validate(token: string): Promise<boolean> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });

    return true;
  },
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, dispatch] = useReducer(sessionReducer, initialSessionState);

  // Used to clear cache when signing out.
  const queryClient = useQueryClient();

  // On launch check if a user has a valid session
  useEffect(() => {
    restoreSession();
  }, []);
  
  const restoreRef = useRef(false);
  async function restoreSession(): Promise<void> {
    // This prevents a user from pressing on the retry button multiple times.
    // Which will cause this function to run multiple times.
    if (restoreRef.current) {
      return;
    }

    restoreRef.current = true;

    dispatch({ type: 'launchRestore'})
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
    try {
      const token = await tokenStore.getToken();

      // A saved token exist, now validate it.
      if (token) {
        const validToken = await authGateway.validate(token);

        // for now mock role
        const role = 'student';

        if (validToken) {
          dispatch({
            type: 'authenticated',
            user: mockUsers[role],
          });
        } else {
          // token is invalid. Make an expired token state

          // Delete the expired token
          await tokenStore.deleteToken();

          // For now just make state anonymous
          dispatch({ type: 'bootstrapCompleted' });
        }
      } else {
        // There is no saveed token so state is anonymous
        dispatch({ type: 'anonymous' });
      }
    } catch (error) {
      // Show an error state. Ask to refetch, since there may be a valid token.
      // Error is caused either by secure token get failing, or connection failure when validating.
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to restore session. Please try again.';

      dispatch({
        type: 'launchError',
        errorMessage: message,
      });
    } finally {
      restoreRef.current = false;
    }
  }

  function mockSignInAs(role: UserRole) {
    dispatch({
      type: 'authenticated',
      user: mockUsers[role],
    });
  }

  async function signIn(username: string, password: string): Promise<void> {
    try {
      const token = await authGateway.login(username, password);

      if (!token) {
        // Empty token recieved
        throw new Error('Invalid token. Please try again.');
      }

      // Validate token
      const valid = await authGateway.validate(token);

      if (!valid) {
        throw new Error('Invalid token. Please sign in again.');
      }

      await tokenStore.setToken(token);

      // For now assume role until we're able to decode the token and get users role
      const role = 'student';

      dispatch({
        type: 'authenticated',
        user: mockUsers[role],
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Sign in failed. Please try again.';
      throw Error(message);
    }
  }

  async function signOut() {
    try {
      // delete the saved token
      await tokenStore.deleteToken();

      // cancel any on going queries and clear cache.
      await queryClient.cancelQueries();
      queryClient.clear();

      // make the users sign out and their status anonymous
      dispatch({ type: 'signedOut' });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Sign out failed. Please try again.';
      throw Error(message);
    }
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        mockSignInAs,
        signIn,
        signOut,
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
