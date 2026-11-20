import { DEFAULT_POSITION } from 'chess.js';

import { env } from '@/config/env';
import {
  MentorPracticeClientError,
  type MentorPracticeClient,
  type PracticeEvent,
  type PracticePair,
} from '@/features/play/services/MentorPracticeClient';
import {
  mentorPracticeWorkedExample,
  practicePositions,
} from '@/features/play/services/mentorPracticeFixtures';
import { createMentorPracticeClient } from '@/features/play/services/mentorPracticeSocketClient';

import { FakeSocket } from './mocks/FakeSocket';

const TIMEOUT_MS = 1_000;
const { mentorJoin, studentJoin, studentMove } = mentorPracticeWorkedExample;
const STUDENT: PracticePair = studentJoin.pair;

/** The server sends every payload as a JSON string. */
const wire = (payload: unknown) => JSON.stringify(payload);

/** Every join() gets its own FakeSocket, as in the app. */
function setup() {
  const sockets: FakeSocket[] = [];
  const createSocket = jest.fn((url: string) => {
    void url;
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  });
  const client = createMentorPracticeClient({
    url: 'http://chess.test',
    createSocket,
    timeoutMs: TIMEOUT_MS,
  });
  const events: PracticeEvent[] = [];
  client.subscribe((event) => events.push(event));
  const latest = () => sockets[sockets.length - 1];
  return { client, sockets, latest, createSocket, events };
}

/** Plays the server's side of a successful join. Returns the game's socket. */
async function joinAs(
  client: MentorPracticeClient,
  latest: () => FakeSocket,
  join: typeof studentJoin | typeof mentorJoin = studentJoin,
): Promise<FakeSocket> {
  const joined = client.join(join.pair);
  const socket = latest();
  socket.simulateConnect();
  socket.serverEmit(join.serverReply.event, wire(join.serverReply.payload));
  await expect(joined).resolves.toEqual(join.result);
  return socket;
}

afterEach(() => {
  jest.useRealTimers();
});

describe('createMentorPracticeClient: socket address', () => {
  it('uses the configured chess socket address by default', async () => {
    const socket = new FakeSocket();
    const createSocket = jest.fn((url: string) => {
      void url;
      return socket;
    });
    const client = createMentorPracticeClient({ createSocket });

    const joined = client.join(STUDENT);
    expect(createSocket).toHaveBeenCalledWith(env.chessSocketUrl);
    client.leave();
    await expect(joined).rejects.toThrow('Left the game');
  });

  it('does not connect until join()', () => {
    const { createSocket } = setup();
    expect(createSocket).not.toHaveBeenCalled();
  });
});

describe('createMentorPracticeClient: join', () => {
  it('emits newgame after connecting, in the verified format', async () => {
    const { client, latest } = setup();

    const joined = client.join(mentorJoin.pair);
    const socket = latest();
    expect(socket.connectCalls).toBe(1);
    expect(socket.emitted).toHaveLength(0);

    socket.simulateConnect();
    expect(socket.emitted).toEqual([
      {
        event: mentorJoin.emitted.event,
        payload: wire(mentorJoin.emitted.payload),
      },
    ]);

    socket.serverEmit('boardstate', wire(mentorJoin.serverReply.payload));
    await expect(joined).resolves.toEqual(mentorJoin.result);
  });

  it('takes the color from the server, not the role', async () => {
    const { client, latest } = setup();
    const joined = client.join(STUDENT);
    latest().simulateConnect();
    latest().serverEmit(
      'boardstate',
      wire({ boardState: DEFAULT_POSITION, color: 'black' }),
    );

    await expect(joined).resolves.toEqual({
      fen: DEFAULT_POSITION,
      color: 'black',
    });
  });

  it('rejects an invalid pair before opening a socket', async () => {
    const { client, createSocket } = setup();

    await expect(
      client.join({ ...STUDENT, mentor: STUDENT.student }),
    ).rejects.toThrow('different users');
    expect(createSocket).not.toHaveBeenCalled();
  });

  it('rejects a second join while one is in progress', async () => {
    const { client, createSocket } = setup();
    void client.join(STUDENT).catch(() => {});

    await expect(client.join(STUDENT)).rejects.toThrow('Already in a game');
    expect(createSocket).toHaveBeenCalledTimes(1);
  });
});

describe('createMentorPracticeClient: failed join', () => {
  it('rejects with the server gameerror message and closes the socket', async () => {
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    const socket = latest();
    socket.simulateConnect();
    socket.serverEmit('gameerror', 'Invalid role!');

    await expect(joined).rejects.toThrow(
      new MentorPracticeClientError('Invalid role!'),
    );
    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects when the server cannot be reached', async () => {
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    latest().simulateConnectError('xhr poll error');

    await expect(joined).rejects.toThrow(
      'Could not connect to the chess server: xhr poll error',
    );
    expect(latest().disconnectCalls).toBe(1);
  });

  it('rejects when the server does not reply in time', async () => {
    jest.useFakeTimers();
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    latest().simulateConnect();
    const assertion = expect(joined).rejects.toThrow(
      `Timed out after ${TIMEOUT_MS} ms joining the game.`,
    );
    await jest.advanceTimersByTimeAsync(TIMEOUT_MS);

    await assertion;
    expect(latest().disconnectCalls).toBe(1);
  });

  it('rejects a join reply that is not a valid position and color', async () => {
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    latest().simulateConnect();
    latest().serverEmit(
      'boardstate',
      wire({ boardState: 'not a fen', color: 'green' }),
    );

    await expect(joined).rejects.toThrow('Invalid boardstate payload');
  });

  it('rejects when the connection drops while joining', async () => {
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    latest().simulateConnect();
    latest().serverEmit('disconnect', 'transport close');

    await expect(joined).rejects.toThrow('Lost the connection');
  });

  it('allows a new join after a failed one', async () => {
    const { client, latest, sockets } = setup();
    const failed = client.join(STUDENT);
    latest().simulateConnectError();
    await expect(failed).rejects.toThrow(MentorPracticeClientError);

    await joinAs(client, latest);
    expect(sockets).toHaveLength(2);
  });
});

describe('createMentorPracticeClient: moves and board updates', () => {
  it('plays the worked example: the move goes out, the board comes back', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    client.sendMove(studentMove.move);
    expect(socket.payloadsFor('move')).toEqual([
      wire(studentMove.emitted.payload),
    ]);

    socket.serverEmit('boardstate', wire(studentMove.serverReply.payload));
    expect(events).toEqual([studentMove.event]);
  });

  it("delivers the partner's move, which arrives as a board update", async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest, mentorJoin);

    socket.serverEmit('boardstate', wire(studentMove.serverReply.payload));

    expect(events).toEqual([studentMove.event]);
  });

  it('reports a server error as move-rejected', async () => {
    const { move, message } = practicePositions.promotionRejected;
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    client.sendMove(move);
    socket.serverEmit('error', message);

    expect(socket.payloadsFor('move')).toEqual([
      wire({ ...move, promotion: 'q' }),
    ]);
    expect(events).toEqual([{ type: 'move-rejected', message }]);
  });

  it('requires a game and a valid move to send', async () => {
    const { client, latest } = setup();

    expect(() => client.sendMove({ from: 'e2', to: 'e4' })).toThrow(
      'Call join() first',
    );
    const socket = await joinAs(client, latest);
    expect(() => client.sendMove({ from: 'e2', to: 'e9' })).toThrow(
      MentorPracticeClientError,
    );
    expect(socket.payloadsFor('move')).toHaveLength(0);
  });

  it('ends the session when a board update cannot be trusted', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit('boardstate', wire({ boardState: 'garbage' }));

    expect(events).toEqual([{ type: 'ended' }]);
    expect(socket.disconnectCalls).toBe(1);
  });
});

describe('createMentorPracticeClient: game over', () => {
  it('maps a checkmate to game-over with usernames', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit(
      'gameover',
      wire({
        over: true,
        reason: 'checkmate',
        winnerUsername: 'student',
        loserUsername: 'mentor',
      }),
    );

    expect(events).toEqual([
      {
        type: 'game-over',
        reason: 'checkmate',
        winner: 'student',
        loser: 'mentor',
      },
    ]);
  });

  it('maps a draw to game-over without usernames', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit('gameover', wire({ over: true, reason: 'draw' }));

    expect(events).toEqual([{ type: 'game-over', reason: 'draw' }]);
  });

  it('maps a resignation to game-over', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit(
      'gameover',
      wire({
        over: true,
        reason: 'resign',
        winnerUsername: 'student',
        loserUsername: 'mentor',
      }),
    );

    expect(events[0]).toMatchObject({ type: 'game-over', reason: 'resign' });
  });
});

describe('createMentorPracticeClient: session end', () => {
  it('turns reset into ended and allows a new game', async () => {
    const { client, latest, events, sockets } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit('reset');

    expect(events).toEqual([{ type: 'ended' }]);
    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
    expect(() => client.sendMove({ from: 'e2', to: 'e4' })).toThrow(
      'not in a game',
    );

    await joinAs(client, latest);
    expect(sockets).toHaveLength(2);
  });

  it('turns a lost connection into ended', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    socket.serverEmit('disconnect', 'transport close');

    expect(events).toEqual([{ type: 'ended' }]);
  });
});

describe('createMentorPracticeClient: leave', () => {
  it('removes every listener and closes the socket', async () => {
    const { client, latest, events } = setup();
    const socket = await joinAs(client, latest);

    client.leave();

    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
    // The client's own disconnect is not reported as the session ending.
    expect(events).toHaveLength(0);
  });

  it('stops delivering events to subscribers', async () => {
    const { client, latest } = setup();
    const socket = await joinAs(client, latest);
    const listener = jest.fn();
    client.subscribe(listener);

    client.leave();
    socket.serverEmit('boardstate', wire(studentMove.serverReply.payload));

    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects a pending join', async () => {
    const { client, latest } = setup();

    const joined = client.join(STUDENT);
    client.leave();

    await expect(joined).rejects.toThrow('Left the game before joining');
    expect(latest().disconnectCalls).toBe(1);
  });

  it('is safe to call more than once and before joining', () => {
    const { client } = setup();

    expect(() => {
      client.leave();
      client.leave();
    }).not.toThrow();
  });

  it('can join again after leaving, as after a remount', async () => {
    const { client, latest, sockets } = setup();
    await joinAs(client, latest);
    client.leave();

    const events: PracticeEvent[] = [];
    client.subscribe((event) => events.push(event));
    const socket = await joinAs(client, latest);
    socket.serverEmit('boardstate', wire(studentMove.serverReply.payload));

    expect(sockets).toHaveLength(2);
    expect(events).toEqual([studentMove.event]);
  });
});
