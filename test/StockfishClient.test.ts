import { env } from '@/config/env';
import {
  createStockfishClient,
  StockfishClientError,
  type StockfishClient,
  type StockfishLevel,
} from '@/features/play/services/StockfishClient';

import { FakeSocket } from './mocks/FakeSocket';

const TIMEOUT_MS = 1_000;

// Position after 1. e4 (the player's move is applied by the server).
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E5_FEN =
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

// Shape copied from stockfishServer/src/managers/StockfishManager.js (move mode).
const ENGINE_REPLY = {
  mode: 'move',
  move: 'e7e5',
  moveDetails: { from: 'e7', to: 'e5', piece: 'p', color: 'b', san: 'e5' },
  newFEN: AFTER_E5_FEN,
};

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
      { sessionType: 'player-vs-computer', fen: 'start' },
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
    expect(socket.listenerCount()).toBe(0);
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

    await expect(
      client.requestMove({ fen: START_FEN, move: 'e2e4', level: 3 }),
    ).rejects.toThrow('Call startSession()');
    expect(socket.payloadsFor('evaluate-fen')).toHaveLength(0);
  });

  it('sends the FEN and the player move', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });

    expect(socket.payloadsFor('evaluate-fen')).toEqual([
      { fen: START_FEN, move: 'e2e4', level: 3 },
    ]);
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await result;
  });

  it.each([1, 2, 3, 4, 5] as const)(
    'sends difficulty level %i',
    async (level) => {
      const { client, socket } = setup();
      await startSession(client, socket);

      const result = client.requestMove({
        fen: START_FEN,
        move: 'e2e4',
        level,
      });

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
        fen: START_FEN,
        move: 'e2e4',
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

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
    socket.serverEmit('evaluation-complete', ENGINE_REPLY);

    await expect(result).resolves.toEqual({
      move: 'e7e5',
      newFen: AFTER_E5_FEN,
    });
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects a malformed evaluation-complete payload', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
    socket.serverEmit('evaluation-complete', { mode: 'move' });

    await expect(result).rejects.toThrow('Invalid evaluation-complete payload');
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects when the server reports an evaluation error', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
    socket.serverEmit('evaluation-error', {
      error: 'Invalid move from engine',
    });

    await expect(result).rejects.toThrow('Invalid move from engine');
    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects on timeout and removes its listeners', async () => {
    jest.useFakeTimers();
    const { client, socket } = setup();
    await startSession(client, socket);

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
    const assertion = expect(result).rejects.toThrow('Timed out');
    jest.advanceTimersByTime(TIMEOUT_MS);
    await assertion;

    expect(socket.listenerCount()).toBe(0);
  });

  it('rejects a second request while one is in progress', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    const first = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
    const second = client.requestMove({
      fen: START_FEN,
      move: 'd2d4',
      level: 3,
    });

    await expect(second).rejects.toThrow('already in progress');
    expect(socket.payloadsFor('evaluate-fen')).toHaveLength(1);

    socket.serverEmit('evaluation-complete', ENGINE_REPLY);
    await expect(first).resolves.toEqual({
      move: 'e7e5',
      newFen: AFTER_E5_FEN,
    });
  });

  it('does not accumulate listeners across requests', async () => {
    const { client, socket } = setup();
    await startSession(client, socket);

    for (let i = 0; i < 3; i += 1) {
      const result = client.requestMove({
        fen: START_FEN,
        move: 'e2e4',
        level: 3,
      });
      expect(socket.listenerCount('evaluation-complete')).toBe(1);
      socket.serverEmit('evaluation-complete', ENGINE_REPLY);
      await result;
    }

    expect(socket.listenerCount()).toBe(0);
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

    const result = client.requestMove({
      fen: START_FEN,
      move: 'e2e4',
      level: 3,
    });
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

    // The socket is only created once startSession() runs, so play the
    // server's side by hand instead of using the startSession helper.
    const started = client.startSession();
    sockets[0].simulateConnect();
    await flushPromises();
    sockets[0].serverEmit('session-started', { success: true, id: 'socket-1' });
    await started;

    client.disconnect();
    const restarted = client.startSession();
    sockets[1].simulateConnect();
    await flushPromises();
    sockets[1].serverEmit('session-started', { success: true, id: 'socket-2' });
    await restarted;

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

    await expect(
      client.requestMove({ fen: START_FEN, move: 'e2e4', level: 3 }),
    ).rejects.toThrow('Call startSession() again');

    await startSession(client, socket);

    expect(socket.connectCalls).toBe(2);
    expect(socket.payloadsFor('start-session')).toHaveLength(2);
  });
});
