import { io } from 'socket.io-client';
import { z } from 'zod';

import { env } from '@/config/env';

export type StockfishLevel = 1 | 2 | 3 | 4 | 5;

/**
 * The engine's reply move in UCI format (e.g. "e7e5", promotions like "e7e8q").
 *
 * The server's `newFEN` field is deliberately not exposed: when a player move
 * is sent, the server applies the engine's reply to the position *before* the
 * player's move, so `newFEN` is wrong. Callers apply `move` to their own board
 * instead, as the website does. See docs/stockfish-socket-contract.md.
 */
export interface EngineMove {
  move: string;
}

export interface StockfishClient {
  startSession(): Promise<void>; // connects lazily, then starts the session
  requestMove(input: {
    fen: string;
    move: string;
    level: StockfishLevel;
  }): Promise<EngineMove>;
  disconnect(): void;
}

export type SocketListener = (...args: unknown[]) => void;

export interface StockfishSocket {
  readonly connected: boolean;
  connect(): void;
  disconnect(): void;
  emit(event: string, payload?: unknown): void;
  on(event: string, listener: SocketListener): void;
  off(event: string, listener: SocketListener): void;
}

export class StockfishClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockfishClientError';
  }
}

export interface StockfishClientOptions {
  /** Defaults to EXPO_PUBLIC_STOCKFISH_SOCKET_URL. */
  url?: string;
  /** Tests pass a factory that returns a FakeSocket. */
  createSocket?: (url: string) => StockfishSocket;
  /** How long to wait for each server reply. */
  timeoutMs?: number;
}

export function isStockfishLevel(value: unknown): value is StockfishLevel {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function createRealSocket(url: string): StockfishSocket {
  return io(url, {
    // Lazy: nothing connects until the client calls socket.connect().
    autoConnect: false,
    // React Native works best with WebSocket only (no HTTP long-polling).
    transports: ['websocket'],
    // The server deletes the Stockfish session when the socket drops, so a
    // silent automatic reconnect would leave us without a session. Instead,
    // callers start a new session with startSession().
    reconnection: false,
  });
}

// ----- Payload validation (the server is untrusted input) -----

const sessionStartedSchema = z.object({
  success: z.literal(true),
});

// Only the fields the client uses are validated. `newFEN` and `moveDetails`
// are unreliable when a player move is sent (see EngineMove) and are ignored.
const evaluationCompleteSchema = z.object({
  mode: z.literal('move'),
  move: z.string().min(1),
});

function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
    .join('; ');
}

function parseSessionStarted(payload: unknown): void {
  const result = sessionStartedSchema.safeParse(payload);
  if (!result.success) {
    throw new StockfishClientError(
      `Invalid session-started payload: ${describeIssues(result.error)}`,
    );
  }
}

function parseEvaluationComplete(payload: unknown): EngineMove {
  const result = evaluationCompleteSchema.safeParse(payload);
  if (!result.success) {
    throw new StockfishClientError(
      `Invalid evaluation-complete payload: ${describeIssues(result.error)}`,
    );
  }
  return { move: result.data.move };
}

/** Turns a failure event's payload into a readable message. */
function describeFailure(event: string, payload: unknown): string {
  let detail = 'no details provided';

  if (payload instanceof Error) {
    detail = payload.message; // connect_error
  } else if (typeof payload === 'string') {
    detail = payload; // disconnect reason
  } else if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    detail = payload.error; // session-error / evaluation-error
  }

  return `Stockfish ${event}: ${detail}`;
}

// ----- Event -> Promise helper -----

type Canceller = (error: Error) => void;

interface ReplyOptions<T> {
  socket: StockfishSocket;
  successEvent: string;
  failureEvents: readonly string[];
  timeoutMs: number;
  /** Every in-flight wait registers here so disconnect() can cancel it. */
  cancellers: Set<Canceller>;
  parse: (payload: unknown) => T;
}

/**
 * Waits for successEvent, a failure event, a timeout, or cancellation —
 * whichever happens first. Every path removes the listeners and clears the
 * timer, so nothing leaks.
 *
 * Listeners are registered immediately, so call this BEFORE emitting the
 * request; otherwise a fast reply could be missed.
 */
function waitForReply<T>({
  socket,
  successEvent,
  failureEvents,
  timeoutMs,
  cancellers,
  parse,
}: ReplyOptions<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const failureHandlers = failureEvents.map((event) => {
      const handler: SocketListener = (payload) => {
        cleanup();
        reject(new StockfishClientError(describeFailure(event, payload)));
      };
      return { event, handler };
    });

    const onSuccess: SocketListener = (payload) => {
      cleanup();
      try {
        resolve(parse(payload));
      } catch (error) {
        reject(error);
      }
    };

    const cancel: Canceller = (error) => {
      cleanup();
      reject(error);
    };

    function cleanup(): void {
      clearTimeout(timer);
      socket.off(successEvent, onSuccess);
      failureHandlers.forEach(({ event, handler }) =>
        socket.off(event, handler),
      );
      cancellers.delete(cancel);
    }

    socket.on(successEvent, onSuccess);
    failureHandlers.forEach(({ event, handler }) => socket.on(event, handler));
    cancellers.add(cancel);

    timer = setTimeout(() => {
      cleanup();
      reject(
        new StockfishClientError(
          `Timed out after ${timeoutMs} ms waiting for ${successEvent}`,
        ),
      );
    }, timeoutMs);
  });
}

// ----- The client -----

export function createStockfishClient({
  url = env.stockfishSocketUrl,
  createSocket = createRealSocket,
  timeoutMs = 10_000,
}: StockfishClientOptions = {}): StockfishClient {
  let socket: StockfishSocket | null = null;
  let connecting: Promise<StockfishSocket> | null = null;
  let session: Promise<void> | null = null;
  let sessionReady = false;
  let pending = false;
  const cancellers = new Set<Canceller>();

  function ensureConnected(): Promise<StockfishSocket> {
    if (!socket) {
      socket = createSocket(url);
    }
    const current = socket;

    if (current.connected) {
      return Promise.resolve(current);
    }

    // Reuse an attempt that is already in progress instead of connecting twice.
    if (connecting) {
      return connecting;
    }

    const attempt = waitForReply({
      socket: current,
      successEvent: 'connect',
      failureEvents: ['connect_error'],
      timeoutMs,
      cancellers,
      parse: () => current,
    });
    connecting = attempt;

    attempt.then(
      () => {
        if (connecting === attempt) connecting = null;
      },
      () => {
        if (connecting === attempt) connecting = null;
        // Stop Socket.IO from retrying in the background. If disconnect()
        // already tore this socket down, there is nothing left to do.
        if (socket === current) {
          socket = null;
          current.disconnect();
        }
      },
    );

    current.connect();
    return attempt;
  }

  async function openSession(): Promise<void> {
    const current = await ensureConnected();

    const reply = waitForReply({
      socket: current,
      successEvent: 'session-started',
      failureEvents: ['session-error', 'disconnect'],
      timeoutMs,
      cancellers,
      parse: parseSessionStarted,
    });
    current.emit('start-session', {
      sessionType: 'player-vs-computer',
      fen: 'start',
    });
    await reply;

    if (socket === current) {
      sessionReady = true;
    }
  }

  function startSession(): Promise<void> {
    // The connection dropped since the last session: the server has already
    // deleted that session, so start over.
    if (sessionReady && !socket?.connected) {
      session = null;
      sessionReady = false;
    }

    // The server rejects a second start-session on the same socket, so
    // concurrent callers share one attempt.
    if (!session) {
      const attempt = openSession();
      session = attempt;
      attempt.catch(() => {
        if (session === attempt) session = null;
      });
    }

    return session;
  }

  // Returns an engine move promise based on the current board state and difficulty level.
  async function requestMove({
    fen,
    move,
    level,
  }: {
    fen: string;
    move: string;
    level: StockfishLevel;
  }): Promise<EngineMove> {
    // TypeScript can be bypassed (e.g. `as StockfishLevel`), so check at runtime.
    if (!isStockfishLevel(level)) {
      throw new StockfishClientError(
        `Difficulty level must be an integer from 1 to 5 (received ${String(level)})`,
      );
    }

    const current = socket;
    if (!current || !sessionReady) {
      throw new StockfishClientError(
        'No Stockfish session. Call startSession() before requesting a move.',
      );
    }
    if (!current.connected) {
      throw new StockfishClientError(
        'Connection to the Stockfish server was lost. Call startSession() again.',
      );
    }

    // evaluation-complete carries no request ID, so only one request may be
    // in flight at a time; otherwise replies could be matched to the wrong call.
    if (pending) {
      throw new StockfishClientError('A move request is already in progress.');
    }

    pending = true;
    try {
      const reply = waitForReply({
        socket: current,
        successEvent: 'evaluation-complete',
        failureEvents: ['evaluation-error', 'disconnect'],
        timeoutMs,
        cancellers,
        parse: parseEvaluationComplete,
      });
      // Difficulty maps directly to the server's search depth (level 3 means
      // `go depth 3`), as confirmed by the team, so it is sent unchanged.
      current.emit('evaluate-fen', { fen, move, level });
      return await reply;
    } finally {
      pending = false;
    }
  }

  function disconnect(): void {
    const current = socket;

    socket = null;
    connecting = null;
    session = null;
    sessionReady = false;

    // Reject everything still waiting and remove its listeners.
    const error = new StockfishClientError('Stockfish client disconnected.');
    [...cancellers].forEach((cancel) => cancel(error));

    current?.disconnect();
  }

  return { startSession, requestMove, disconnect };
}
