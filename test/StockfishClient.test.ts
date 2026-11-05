import { DEFAULT_POSITION } from 'chess.js';

import { env } from '@/config/env';
import {
  createStockfishClient,
  StockfishClientError,
  type StockfishClient,
  type StockfishLevel,
} from '@/features/play/services/StockfishClient';
import {
  engineReplyFixtures,
  evaluationCompletePayload,
  stockfishWorkedExample,
} from '@/features/play/services/stockfishFixtures';

import { FakeSocket } from './mocks/FakeSocket';

const TIMEOUT_MS = 1_000;

// The position after 1. e4 (Black, the engine, to move), and the server's
// reply to it. See stockfishWorkedExample.
const MOVE_REQUEST = stockfishWorkedExample.request;
const ENGINE_REPLY = stockfishWorkedExample.serverReply;

// The position after 1. e4 e5 2. Nf3, and a legal reply to it.
const NEXT_REQUEST = { fen: engineReplyFixtures[1].fen, level: 3 } as const;
const NEXT_REPLY = evaluationCompletePayload(
  engineReplyFixtures[1].fen,
  engineReplyFixtures[1].move,
);

// While a session is in use, the client keeps one session-error listener.
const SESSION_WATCHER = 1;

/**
 * Lets pending promise callbacks run. Uses the real setImmediate so it still
 * works while Jest's fake timers are active.
 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) =>
    jest.requireActual('timers').setImmediate(resolve),
  );
}

function setup() {
  const socket = new FakeSocket();
  const createSocket = jest.fn((url: string) => {
    void url;
    return socket;
  });
  const client = createStockfishClient({
    url: 'http://stockfish.test',
    createSocket,
    timeoutMs: TIMEOUT_MS,
  });
  return { socket, createSocket, client };
}

/** Like setup(), but every connection gets its own FakeSocket, as in the app. */
function setupWithFreshSockets() {
  const sockets: FakeSocket[] = [];
  const client = createStockfishClient({
    url: 'http://stockfish.test',
    createSocket: () => {
      const created = new FakeSocket();
      sockets.push(created);
      return created;
    },
    timeoutMs: TIMEOUT_MS,
  });
  return { sockets, client };
}

/** startSession() for setupWithFreshSockets(); returns the session's socket. */
async function startFreshSession(
  client: StockfishClient,
  sockets: FakeSocket[],
): Promise<FakeSocket> {
  const started = client.startSession();
  const socket = sockets[sockets.length - 1];
  socket.simulateConnect();
  await flushPromises();
  socket.serverEmit('session-started', { success: true, id: 'socket-id' });
  await started;
  return socket;
}

/** Plays the server's side of a successful connect + start-session. */
async function startSession(
  client: StockfishClient,
  socket: FakeSocket,
): Promise<void> {
  const started = client.startSession();
  socket.simulateConnect();
  await flushPromises();
  socket.serverEmit('session-started', { success: true, id: 'socket-1' });
  await started;
}

afterEach(() => {
  jest.useRealTimers();
});

describe('createStockfishClient: connection', () => {
  it('uses the configured Stockfish URL by default', async () => {
    const socket = new FakeSocket();
    const createSocket = jest.fn((url: string) => {
      void url;
      return socket;
    });
    const client = createStockfishClient({ createSocket });

    await startSession(client, socket);

    expect(createSocket).toHaveBeenCalledWith(env.stockfishSocketUrl);
  });

  it('uses an explicitly provided URL', async () => {
    const { client, socket, createSocket } = setup();

    await startSession(client, socket);

    expect(createSocket).toHaveBeenCalledWith('http://stockfish.test');
  });

  it('connects only when a session is requested', () => {
    const { client, socket, createSocket } = setup();

    expect(createSocket).not.toHaveBeenCalled();
    expect(socket.connectCalls).toBe(0);

    void client.startSession().catch(() => undefined);

    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(socket.connectCalls).toBe(1);
    client.disconnect();
  });

  it('reports a connection failure and stops retrying', async () => {
    const { client, socket } = setup();

    const started = client.startSession();
    socket.simulateConnectError('Connection refused');

    await expect(started).rejects.toThrow(StockfishClientError);
    await expect(started).rejects.toThrow('Connection refused');
    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects when the connection times out', async () => {
    jest.useFakeTimers();
    const { client, socket } = setup();

    const started = client.startSession();
    const assertion = expect(started).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    expect(socket.listenerCount()).toBe(0);
  });
});

describe('createStockfishClient: startSession', () => {
  it('sends the start-session payload', async () => {
    const { client, socket } = setup();

    await startSession(client, socket);

    expect(socket.payloadsFor('start-session')).toEqual([
      { sessionType: 'player-vs-computer', fen: DEFAULT_POSITION },
    ]);
  });

  it('does not create duplicate connections, sessions, or listeners', async () => {
    const { client, socket, createSocket } = setup();

    const first = client.startSession();
    const second = client.startSession();
    expect(socket.listenerCount('connect')).toBe(1);

    socket.simulateConnect();
    await flushPromises();
    expect(socket.listenerCount('session-started')).toBe(1);

    socket.serverEmit('session-started', { success: true, id: 'socket-1' });
    await Promise.all([first, second]);
    await client.startSession();

    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(socket.connectCalls).toBe(1);
    expect(socket.payloadsFor('start-session')).toHaveLength(1);
    expect(socket.listenerCount()).toBe(SESSION_WATCHER);
  });

  it('rejects when the server cannot start a session', async () => {
    const { client, socket } = setup();

    const started = client.startSession();
    socket.simulateConnect();
    await flushPromises();
    socket.serverEmit('session-error', {
      error: 'Chess engine failed to start',
    });

    await expect(started).rejects.toThrow('Chess engine failed to start');
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects a malformed session-started payload', async () => {
    const { client, socket } = setup();

    const started = client.startSession();
    socket.simulateConnect();
    await flushPromises();
    socket.serverEmit('session-started', { success: false });

    await expect(started).rejects.toThrow('Invalid session-started payload');
  });
});

describe('createStockfishClient: requestMove', () => {
  it('requires a started session', async () => {
    const { client, socket } = setup();

    await expect(client.requestMove(MOVE_REQUEST)).rejects.toThrow(
      'Call startSession()',
    );
    expect(socket.payloadsFor('evaluate-fen')).toHaveLength(0);
  });

  it('sends the position after the player move, with an empty move', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);

    expect(socket.payloadsFor('evaluate-fen')).toEqual([
      stockfishWorkedExample.emitted,
    ]);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await expect(result).resolves.toEqual(stockfishWorkedExample.engineMove);
  });

  it('never sends a player move, so it cannot be applied twice', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    // A caller that still passes the old `move` field (bypassing TypeScript).
    const result = client.requestMove({
      ...MOVE_REQUEST,
      move: 'e2e4',
    } as typeof MOVE_REQUEST);

    expect(socket.payloadsFor('evaluate-fen')).toEqual([
      { fen: MOVE_REQUEST.fen, move: '', level: 3 },
    ]);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await result;
  });

  it.each([
    'start',
    '',
    'not a fen',
    // No black king.
    'rnbq1bnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  ])(
    'rejects the invalid position %p without sending anything',
    async (fen) => {
      const { client, socket } = setup();
      await startSession(client, socket);

      await expect(client.requestMove({ fen, level: 3 })).rejects.toThrow(
        'Invalid position',
      );
      expect(socket.payloadsFor('evaluate-fen')).toHaveLength(0);

      // The session is untouched and still usable.
      const result = client.requestMove(MOVE_REQUEST);
      socket.serverEmit('evaluation-complete', ENGINE_REPLY);
      await expect(result).resolves.toEqual({ move: 'e7e5' });
      expect(socket.disconnectCalls).toBe(0);
    },
  );

  it.each([1, 2, 3, 4, 5] as const)(
    'sends difficulty level %i',
    async (level) => {
      const { client, socket } = setup();
      await startSession(client, socket);

      const result = client.requestMove({ ...MOVE_REQUEST, level });

      expect(socket.payloadsFor('evaluate-fen')).toEqual([
        expect.objectContaining({ level }),
      ]);
      socket.serverEmit('evaluation-complete', ENGINE_REPLY);
      await result;
    },
  );

  it.each([0, 6, 2.5, -1, Number.NaN])(
    'rejects invalid difficulty %p without sending anything',
    async (level) => {
      const { client, socket } = setup();
      await startSession(client, socket);

      const result = client.requestMove({
        ...MOVE_REQUEST,
        level: level as StockfishLevel,
      });

      await expect(result).rejects.toThrow(StockfishClientError);
      await expect(result).rejects.toThrow('Difficulty level');
      expect(socket.payloadsFor('evaluate-fen')).toHaveLength(0);
    },
  );

  it('resolves with the engine move when evaluation-complete arrives', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(result).resolves.toEqual({ move: 'e7e5' });
    expect(socket.listenerCount()).toBe(SESSION_WATCHER);
  });

  it('rejects a malformed evaluation-complete payload', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-complete', { mode: 'move' });

    await expect(result).rejects.toThrow('Invalid evaluation-complete payload');
    expect(socket.listenerCount()).toBe(0);
    expect(socket.disconnectCalls).toBe(1);
  });

  it('rejects and resets when the server reports an evaluation error', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-error', { error: 'Session not found!' });

    await expect(result).rejects.toThrow('Session not found!');
    expect(socket.listenerCount()).toBe(0);
    expect(socket.disconnectCalls).toBe(1);
    await expect(client.requestMove(MOVE_REQUEST)).rejects.toThrow(
      'Call startSession()',
    );
  });

  it('rejects and resets when the connection drops mid-request', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.connected = false;
    socket.serverEmit('disconnect', 'transport close');

    await expect(result).rejects.toThrow('transport close');
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects on timeout and removes its listeners', async () => {
    jest.useFakeTimers();
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    const assertion = expect(result).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects a second request while one is in progress', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const first = client.requestMove(MOVE_REQUEST);
    const second = client.requestMove(NEXT_REQUEST);

    await expect(second).rejects.toThrow('already in progress');
    expect(socket.payloadsFor('evaluate-fen')).toHaveLength(1);

    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await expect(first).resolves.toEqual({ move: 'e7e5' });
  });

  it('does not accumulate listeners across requests', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    for (const [request, reply] of [
      [MOVE_REQUEST, ENGINE_REPLY],
      [NEXT_REQUEST, NEXT_REPLY],
      [MOVE_REQUEST, ENGINE_REPLY],
    ] as const) {
      const result = client.requestMove(request);
      expect(socket.listenerCount('evaluation-complete')).toBe(1);
      socket.serverEmit('evaluation-complete', reply);
      await result;
    }

    expect(socket.listenerCount()).toBe(SESSION_WATCHER);
  });
});

describe('createStockfishClient: move validation', () => {
  it.each(engineReplyFixtures)(
    'resolves a legal reply: $name',
    async ({ fen, move }) => {
      const { client, socket } = setup();
      await startSession(client, socket);

      const result = client.requestMove({ fen, level: 3 });
      socket.serverEmit(
        'evaluation-complete',
        evaluationCompletePayload(fen, move),
      );

      await expect(result).resolves.toEqual({ move });
    },
  );

  it.each([
    '',
    'e7',
    'e7e5 ',
    'E7E5',
    'e9e5',
    'i7i5',
    'e7e8k',
    'e7e8Q',
    'e6e7q', // promotion must land on the last rank
    'e7e5d7d5',
    '0000',
    'none',
  ])('rejects the malformed move %p', async (move) => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-complete', { ...ENGINE_REPLY, move });

    await expect(result).rejects.toThrow(StockfishClientError);
    await expect(result).rejects.toThrow('Invalid evaluation-complete payload');
  });

  it.each([
    ['a move for the wrong side', MOVE_REQUEST.fen, 'd2d4'],
    ['a move from an empty square', MOVE_REQUEST.fen, 'e5e4'],
    ['"(none)" when legal moves exist', MOVE_REQUEST.fen, '(none)'],
    ['a promotion without a piece', '7k/8/8/8/8/8/p6K/8 b - - 0 1', 'a2a1'],
    ['a promotion by a rook', '7k/8/8/8/8/8/r6K/8 b - - 0 1', 'a2a1q'],
  ])('rejects and resets on %s', async (_, fen, move) => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove({ fen, level: 3 });
    socket.serverEmit('evaluation-complete', { ...ENGINE_REPLY, move });

    await expect(result).rejects.toThrow('not legal in the requested position');
    expect(socket.disconnectCalls).toBe(1);
  });
});

describe('createStockfishClient: recovery', () => {
  it('abandons the socket after a move request times out', async () => {
    jest.useFakeTimers();
    const { client, sockets } = setupWithFreshSockets();
    const first = await startFreshSession(client, sockets);

    const timedOut = client.requestMove(MOVE_REQUEST);
    const assertion = expect(timedOut).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    expect(first.disconnectCalls).toBe(1);
    expect(first.listenerCount()).toBe(0);
    await expect(client.requestMove(MOVE_REQUEST)).rejects.toThrow(
      'Call startSession()',
    );
    expect(first.payloadsFor('evaluate-fen')).toHaveLength(1);
  });

  it('does not match a late reply to a newer request after a timeout', async () => {
    jest.useFakeTimers();
    const { client, sockets } = setupWithFreshSockets();
    const first = await startFreshSession(client, sockets);

    const timedOut = client.requestMove(MOVE_REQUEST);
    const assertion = expect(timedOut).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    const second = await startFreshSession(client, sockets);
    const result = client.requestMove(NEXT_REQUEST);

    // The engine's late answer to the first position must not resolve the
    // newer request.
    first.serverEmit('evaluation-complete', ENGINE_REPLY);
    second.serverEmit('evaluation-complete', NEXT_REPLY);

    await expect(result).resolves.toEqual({ move: 'b8c6' });
  });

  it('does not let a stray reply complete a later request', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const first = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await expect(first).resolves.toEqual({ move: 'e7e5' });

    // A duplicate of the first reply arrives while the next request waits.
    // e7e5 is not legal after 1. e4 e5 2. Nf3, so it is rejected, and the
    // session is reset so the real reply cannot be mismatched either.
    const second = client.requestMove(NEXT_REQUEST);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(second).rejects.toThrow('not legal in the requested position');
    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
  });

  it('ignores a reply that arrives after the request completed', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await result;

    expect(() =>
      socket.serverEmit('evaluation-complete', ENGINE_REPLY),
    ).not.toThrow();
    expect(socket.listenerCount('evaluation-complete')).toBe(0);
    expect(socket.disconnectCalls).toBe(0);
  });

  it('recovers after a failed request by starting a new session', async () => {
    const { client, sockets } = setupWithFreshSockets();
    const first = await startFreshSession(client, sockets);

    const failed = client.requestMove(MOVE_REQUEST);
    first.serverEmit('evaluation-error', { error: 'Session not found!' });
    await expect(failed).rejects.toThrow('Session not found!');

    // The documented recovery: startSession(), then repeat the request.
    const second = await startFreshSession(client, sockets);
    const retried = client.requestMove(MOVE_REQUEST);
    second.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(retried).resolves.toEqual({ move: 'e7e5' });
    expect(sockets).toHaveLength(2);
  });

  it('invalidates the session on a session-error after session-started', async () => {
    const { client, sockets } = setupWithFreshSockets();
    const first = await startFreshSession(client, sockets);

    first.serverEmit('session-error', {
      error: 'Chess engine failed to start',
    });

    expect(first.disconnectCalls).toBe(1);
    expect(first.listenerCount()).toBe(0);
    await expect(client.requestMove(MOVE_REQUEST)).rejects.toThrow(
      'Call startSession()',
    );

    const second = await startFreshSession(client, sockets);
    const result = client.requestMove(MOVE_REQUEST);
    second.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(result).resolves.toEqual({ move: 'e7e5' });
    expect(first.payloadsFor('start-session')).toHaveLength(1);
    expect(second.payloadsFor('start-session')).toHaveLength(1);
  });

  it('rejects a pending move request when the session fails', async () => {
    const { client, sockets } = setupWithFreshSockets();
    const socket = await startFreshSession(client, sockets);

    const result = client.requestMove(MOVE_REQUEST);
    socket.serverEmit('session-error', {
      error: 'Chess engine failed to start',
    });

    await expect(result).rejects.toThrow('Chess engine failed to start');
    expect(socket.listenerCount()).toBe(0);
  });

  it('retries on a fresh socket after the session start times out', async () => {
    jest.useFakeTimers();
    const { client, sockets } = setupWithFreshSockets();

    const started = client.startSession();
    sockets[0].simulateConnect();
    await flushPromises();
    const assertion = expect(started).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    // The server may still create the session on the old socket. Retrying
    // there would fail with "Session already exists!", so it is abandoned.
    expect(sockets[0].disconnectCalls).toBe(1);
    sockets[0].serverEmit('session-started', { success: true, id: 'late' });

    const second = await startFreshSession(client, sockets);
    const result = client.requestMove(MOVE_REQUEST);
    second.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(result).resolves.toEqual({ move: 'e7e5' });
    expect(sockets).toHaveLength(2);
    expect(sockets[0].payloadsFor('start-session')).toHaveLength(1);
    expect(sockets[0].listenerCount()).toBe(0);
  });

  it('retries on a fresh socket after the server rejects the session', async () => {
    const { client, sockets } = setupWithFreshSockets();

    const started = client.startSession();
    sockets[0].simulateConnect();
    await flushPromises();
    sockets[0].serverEmit('session-error', {
      error: 'Session already exists!',
    });
    await expect(started).rejects.toThrow('Session already exists!');

    const second = await startFreshSession(client, sockets);

    expect(sockets).toHaveLength(2);
    expect(sockets[0].disconnectCalls).toBe(1);
    expect(second.payloadsFor('start-session')).toHaveLength(1);
  });
});

describe('createStockfishClient: disconnect', () => {
  it('disconnects cleanly and removes every listener', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    client.disconnect();

    expect(socket.disconnectCalls).toBe(1);
    expect(socket.connected).toBe(false);
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects a pending move request', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove(MOVE_REQUEST);
    client.disconnect();

    await expect(result).rejects.toThrow('disconnected');
    expect(socket.listenerCount()).toBe(0);
  });

  it('cancels a connection attempt that is still in progress', async () => {
    const { client, socket } = setup();

    const started = client.startSession();
    client.disconnect();

    await expect(started).rejects.toThrow('disconnected');
    expect(socket.disconnectCalls).toBe(1);
    expect(socket.listenerCount()).toBe(0);
  });

  it('is safe to call before connecting and more than once', () => {
    const { client, socket, createSocket } = setup();

    expect(() => {
      client.disconnect();
      client.disconnect();
    }).not.toThrow();
    expect(createSocket).not.toHaveBeenCalled();
    expect(socket.disconnectCalls).toBe(0);
  });

  it('creates a fresh socket for a new session after disconnecting', async () => {
    const { client, sockets } = setupWithFreshSockets();
    await startFreshSession(client, sockets);

    client.disconnect();
    await startFreshSession(client, sockets);

    expect(sockets).toHaveLength(2);
    expect(sockets[0].listenerCount()).toBe(0);
    expect(sockets[1].payloadsFor('start-session')).toHaveLength(1);
  });

  it('starts a new session after the connection drops', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    // The server or network closes the connection.
    socket.connected = false;
    socket.serverEmit('disconnect', 'transport close');

    await expect(client.requestMove(MOVE_REQUEST)).rejects.toThrow(
      'Call startSession() again',
    );

    await startSession(client, socket);

    expect(socket.connectCalls).toBe(2);
    expect(socket.payloadsFor('start-session')).toHaveLength(2);
  });
});
