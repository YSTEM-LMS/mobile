import { readonly } from "zod";

export type UserRole = 'student' | 'mentor';

export type SessionUser = {
  readonly id: string;
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
  |
   {
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
      readonly type: 'launchError';
      readonly errorMessage: string;
    }
  | {
      readonly type: 'launchRestore';
    }
  

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
    case 'launchError':
      return { 
        status: 'error', 
        errorMessage: action.errorMessage, 
      };
    case 'anonymous':
      return { status: 'anonymous' };
    case 'launchRestore':
      return { status: 'bootstrapping'}
    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}
