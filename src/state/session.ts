export type UserRole = 'student' | 'mentor';

export type SessionUser = {
  readonly username: string;
  readonly displayName: string;
  readonly role: UserRole;
};

export type SessionState =
  | {
      readonly status: 'bootstrapping';
    }
  | {
      readonly status: 'anonymous';
    }
  | {
      readonly status: 'authenticated';
      readonly user: SessionUser;
    }
  | {
      readonly status: 'expired';
      readonly expiredMessage: string;
    }
  | {
      readonly status: 'error';
      readonly errorMessage: string;
    };

export type SessionAction =
  | {
      readonly type: 'bootstrapCompleted';
    }
  | {
      readonly type: 'authenticated';
      readonly user: SessionUser;
    }
  | {
      readonly type: 'signedOut';
    }
  | {
      readonly type: 'anonymous';
    }
  | {
      readonly type: 'error';
      readonly errorMessage: string;
    }
  | {
      readonly type: 'restore';
    }
  | {
      readonly type: 'expired';
      readonly expiredMessage: string;
    };

export const initialSessionState: SessionState = {
  status: 'bootstrapping',
};

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'bootstrapCompleted':
      return state.status === 'bootstrapping' ? { status: 'anonymous' } : state;
    case 'authenticated':
      return {
        status: 'authenticated',
        user: action.user,
      };
    case 'signedOut':
      return state.status === 'anonymous' ? state : { status: 'anonymous' };
    case 'anonymous':
      return { status: 'anonymous' };
    case 'expired':
      return { status: 'expired', expiredMessage: action.expiredMessage };
    case 'error':
      return {
        status: 'error',
        errorMessage: action.errorMessage,
      };
    case 'restore':
      return { status: 'bootstrapping' };

    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}
