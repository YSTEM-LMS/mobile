import { DEFAULT_POSITION } from 'chess.js';

import { createFakeMentorPracticeClient } from '@/features/play/services/fakeMentorPracticeClient';
import {
  MentorPracticeClientError,
  type PracticeEvent,
  type PracticePair,
} from '@/features/play/services/MentorPracticeClient';
import {
  mentorPracticeWorkedExample,
  practicePositions,
} from '@/features/play/services/mentorPracticeFixtures';

const STUDENT: PracticePair = mentorPracticeWorkedExample.studentJoin.pair;
const MENTOR: PracticePair = mentorPracticeWorkedExample.mentorJoin.pair;

/** Lets events queued by the fake reach their listeners. */
function flushEvents(): Promise<void> {
  return Promise.resolve();
}

function recordEvents(client: {
  subscribe: (l: (e: PracticeEvent) => void) => () => void;
}) {
  const events: PracticeEvent[] = [];
  const unsubscribe = client.subscribe((event) => events.push(event));
  return { events, unsubscribe };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('createFakeMentorPracticeClient', () => {
  it('plays the worked example from the student device', async () => {
    const { studentJoin, studentMove } = mentorPracticeWorkedExample;
    const client = createFakeMentorPracticeClient({ color: 'white' });
    const { events } = recordEvents(client);

    await expect(client.join(studentJoin.pair)).resolves.toEqual(
      studentJoin.result,
    );
    client.sendMove(studentMove.move);
    await flushEvents();

    expect(events).toEqual([studentMove.event]);
    expect(client.sentMoves).toEqual([studentMove.move]);
  });

  it('plays the worked example from the mentor device', async () => {
    const { mentorJoin, studentMove } = mentorPracticeWorkedExample;
    const client = createFakeMentorPracticeClient({ color: 'black' });
    const { events } = recordEvents(client);

    await expect(client.join(mentorJoin.pair)).resolves.toEqual(
      mentorJoin.result,
    );
    client.partnerMove(studentMove.move);
    await flushEvents();

    expect(events).toEqual([studentMove.event]);
    expect(client.sentMoves).toHaveLength(0);
  });

  it('defaults to white at the starting position', async () => {
    const client = createFakeMentorPracticeClient();

    await expect(client.join(STUDENT)).resolves.toEqual({
      fen: DEFAULT_POSITION,
      color: 'white',
    });
    expect(client.status).toBe('joined');
    expect(client.pair).toEqual(STUDENT);
    expect(client.joinCalls).toBe(1);
  });

  it('starts from a custom position', async () => {
    const { fen } = practicePositions.whiteMatesInOne;
    const client = createFakeMentorPracticeClient({ startingFen: fen });

    await expect(client.join(STUDENT)).resolves.toEqual({
      fen,
      color: 'white',
    });
  });

  it('rejects an invalid starting position when created', () => {
    expect(() =>
      createFakeMentorPracticeClient({ startingFen: 'not a fen' }),
    ).toThrow();
  });

  it('rejects invalid pairs before counting a join', async () => {
    const client = createFakeMentorPracticeClient();

    await expect(client.join({ ...STUDENT, mentor: ' ' })).rejects.toThrow(
      'usernames are required',
    );
    await expect(
      client.join({ ...STUDENT, mentor: STUDENT.student }),
    ).rejects.toThrow('different users');
    await expect(
      client.join({ ...STUDENT, role: 'coach' as 'student' }),
    ).rejects.toThrow('Role must be');
    expect(client.joinCalls).toBe(0);
    expect(client.status).toBe('idle');
  });

  it('rejects a second join while in a game', async () => {
    const client = createFakeMentorPracticeClient();
    await client.join(STUDENT);

    await expect(client.join(STUDENT)).rejects.toThrow('Already in a game');
    expect(client.joinCalls).toBe(1);
  });

  it('simulates a failed join and allows a retry', async () => {
    const joinError = new MentorPracticeClientError('Invalid role!');
    const client = createFakeMentorPracticeClient({ joinError });

    await expect(client.join(STUDENT)).rejects.toBe(joinError);
    expect(client.status).toBe('idle');
    await expect(client.join(STUDENT)).rejects.toBe(joinError);
    expect(client.joinCalls).toBe(2);
  });

  it('simulates join time, and leave() rejects a pending join', async () => {
    jest.useFakeTimers();
    const client = createFakeMentorPracticeClient({ joinDelayMs: 500 });

    const onJoined = jest.fn();
    const joined = client.join(STUDENT).then(onJoined);
    await jest.advanceTimersByTimeAsync(499);
    expect(onJoined).not.toHaveBeenCalled();
    expect(client.status).toBe('joining');
    await jest.advanceTimersByTimeAsync(1);
    await joined;
    expect(onJoined).toHaveBeenCalled();

    client.leave();
    const pending = client.join(STUDENT);
    client.leave();
    await expect(pending).rejects.toThrow('Left the game');
    expect(client.status).toBe('idle');
  });

  it('does not join when leave() runs just before join() resumes', async () => {
    const client = createFakeMentorPracticeClient();

    const pending = client.join(STUDENT);
    await Promise.resolve();
    client.leave();

    await expect(pending).rejects.toThrow('Left the game');
    expect(client.status).toBe('idle');
  });

  it('requires a game and valid squares to send a move', async () => {
    const client = createFakeMentorPracticeClient();

    expect(() => client.sendMove({ from: 'e2', to: 'e4' })).toThrow(
      'Call join() first',
    );
    await client.join(STUDENT);
    expect(() => client.sendMove({ from: 'e2', to: 'e9' })).toThrow(
      MentorPracticeClientError,
    );
    expect(client.sentMoves).toHaveLength(0);
  });

  it('reports an illegal move as move-rejected and keeps the position', async () => {
    const client = createFakeMentorPracticeClient();
    const { events } = recordEvents(client);
    await client.join(STUDENT);

    client.sendMove({ from: 'e2', to: 'e5' });
    await flushEvents();

    expect(events).toEqual([
      {
        type: 'move-rejected',
        message: 'Invalid move: {"from":"e2","to":"e5"}',
      },
    ]);
    expect(client.fen).toBe(DEFAULT_POSITION);
    expect(client.sentMoves).toEqual([{ from: 'e2', to: 'e5' }]);
  });

  it('rejects promotions, like the server', async () => {
    const { fen, move, message } = practicePositions.promotionRejected;
    const client = createFakeMentorPracticeClient({ startingFen: fen });
    const { events } = recordEvents(client);
    await client.join(STUDENT);

    client.sendMove(move);
    await flushEvents();

    expect(events).toEqual([{ type: 'move-rejected', message }]);
    expect(client.fen).toBe(fen);
  });

  it('does not check whose turn it is, like the server', async () => {
    // This device is black, but the server still accepts White's move.
    const client = createFakeMentorPracticeClient({ color: 'black' });
    const { events } = recordEvents(client);
    await client.join(MENTOR);

    client.sendMove({ from: 'e2', to: 'e4' });
    await flushEvents();

    expect(events).toEqual([mentorPracticeWorkedExample.studentMove.event]);
  });

  it('throws on an illegal partner move', async () => {
    const client = createFakeMentorPracticeClient();
    await client.join(STUDENT);

    expect(() => client.partnerMove({ from: 'e7', to: 'e5' })).toThrow(
      'Partner move is not legal',
    );
  });

  it('emits game-over with usernames when this device checkmates', async () => {
    const { fen, move, fenAfter } = practicePositions.whiteMatesInOne;
    const client = createFakeMentorPracticeClient({ startingFen: fen });
    const { events } = recordEvents(client);
    await client.join(STUDENT);

    client.sendMove(move);
    await flushEvents();

    expect(events).toEqual([
      { type: 'board', fen: fenAfter },
      {
        type: 'game-over',
        reason: 'checkmate',
        winner: 'student',
        loser: 'mentor',
      },
    ]);
  });

  it('emits game-over when the partner checkmates this device', async () => {
    const { fen, move } = practicePositions.whiteMatesInOne;
    const client = createFakeMentorPracticeClient({
      color: 'black',
      startingFen: fen,
    });
    const { events } = recordEvents(client);
    await client.join(MENTOR);

    client.partnerMove(move);
    await flushEvents();

    expect(events[1]).toEqual({
      type: 'game-over',
      reason: 'checkmate',
      winner: 'student',
      loser: 'mentor',
    });
  });

  it('emits game-over for a draw without usernames', async () => {
    const { fen, move, fenAfter } = practicePositions.whiteStalematesInOne;
    const client = createFakeMentorPracticeClient({ startingFen: fen });
    const { events } = recordEvents(client);
    await client.join(STUDENT);

    client.sendMove(move);
    await flushEvents();

    expect(events).toEqual([
      { type: 'board', fen: fenAfter },
      { type: 'game-over', reason: 'draw' },
    ]);
  });

  it('ends the session for good, and join() starts a new game', async () => {
    const client = createFakeMentorPracticeClient();
    const { events } = recordEvents(client);
    await client.join(STUDENT);
    client.sendMove({ from: 'e2', to: 'e4' });

    client.endSession();
    await flushEvents();

    expect(events.map((event) => event.type)).toEqual(['board', 'ended']);
    expect(client.status).toBe('ended');
    expect(() => client.sendMove({ from: 'e7', to: 'e5' })).toThrow(
      'not in a game',
    );

    await expect(client.join(STUDENT)).resolves.toEqual({
      fen: DEFAULT_POSITION,
      color: 'white',
    });
  });

  it('stops delivering to a listener after it unsubscribes', async () => {
    const client = createFakeMentorPracticeClient();
    const first = recordEvents(client);
    const second = recordEvents(client);
    await client.join(STUDENT);

    first.unsubscribe();
    client.sendMove({ from: 'e2', to: 'e4' });
    await flushEvents();

    expect(first.events).toHaveLength(0);
    expect(second.events).toHaveLength(1);
    expect(client.listenerCount).toBe(1);
  });

  it('leave() removes every listener and drops queued events', async () => {
    const client = createFakeMentorPracticeClient();
    const { events } = recordEvents(client);
    await client.join(STUDENT);

    client.sendMove({ from: 'e2', to: 'e4' });
    client.leave();
    await flushEvents();

    expect(events).toHaveLength(0);
    expect(client.listenerCount).toBe(0);
    expect(client.status).toBe('idle');
    expect(client.pair).toBeNull();
  });

  it('does not deliver an old game event to a new game', async () => {
    const client = createFakeMentorPracticeClient();
    await client.join(STUDENT);
    client.sendMove({ from: 'e2', to: 'e4' });
    client.leave();

    const { events } = recordEvents(client);
    await client.join(STUDENT);
    await flushEvents();

    expect(events).toHaveLength(0);
  });

  it('allows leave() more than once', () => {
    const client = createFakeMentorPracticeClient();

    client.leave();
    client.leave();

    expect(client.leaveCalls).toBe(2);
    expect(client.status).toBe('idle');
  });
});
