import {
  initialSessionState,
  sessionReducer,
  type SessionUser,
} from '@/state/session';

const student: SessionUser = {
  username: 'test-student',
  displayName: 'Test Student',
  role: 'student',
};

describe('sessionReducer', () => {
  it('starts in the bootstrapping state', () => {
    expect(initialSessionState).toEqual({
      status: 'bootstrapping',
    });
  });

  it('becomes anonymous after bootstrap completes', () => {
    const state = sessionReducer(initialSessionState, {
      type: 'bootstrapCompleted',
    });

    expect(state).toEqual({
      status: 'anonymous',
    });
  });

  it('stores an authenticated user', () => {
    const state = sessionReducer(
      { status: 'anonymous' },
      {
        type: 'authenticated',
        user: student,
      },
    );

    expect(state).toEqual({
      status: 'authenticated',
      user: student,
    });
  });

  it('becomes anonymous after sign out', () => {
    const state = sessionReducer(
      {
        status: 'authenticated',
        user: student,
      },
      {
        type: 'signedOut',
      },
    );

    expect(state).toEqual({
      status: 'anonymous',
    });
  });
});
