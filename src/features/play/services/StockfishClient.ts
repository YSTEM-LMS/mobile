import { Chess, DEFAULT_POSITION } from 'chess.js';
import { io } from 'socket.io-client';
import { z } from 'zod';

import { env } from '@/config/env';

/** Engine search depth: level 3 means `go depth 3` on the server. */
export type StockfishLevel = 1 | 2 | 3 | 4 | 5;

/**
 * The engine's reply move in UCI format (e.g. "e7e5", promotions like "e7e8q"),
 * or `null` when the engine has no legal move (checkmate or stalemate; the
 * server sends "(none)").
 *
 * The server's `newFEN` field is deliberately not exposed. Callers apply `move`
 * to their own board, as the website does. See docs/stockfish-socket-contract.md.
 */
export interface EngineMove {
  move: string | null;
}

export interface MoveRequest {
  /**
   * The position AFTER the player's move, with the engine to move. The board
   * has already applied the player's move (including any promotion), so the
   * client never sends the move separately and it cannot be applied twice.
   */
  fen: string;
  level: StockfishLevel;
}

export interface StockfishClient {
  startSession(): Promise<void>; // connects lazily, then starts the session
  requestMove(request: MoveRequest): Promise<EngineMove>;
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

/**
 * Checks a move request before anything is sent and returns its position.
 * The server does not validate FENs: an invalid one can leave the engine
 * without a reply, so it is rejected here instead.
 */
export function validateMoveRequest({ fen, level }: MoveRequest): Chess {
  // TypeScript can be bypassed (e.g. `as StockfishLevel`), so check at runtime.
  if (!isStockfishLevel(level)) {
    throw new StockfishClientError(
      `Difficulty level must be an integer from 1 to 5 (received ${String(level)})`,
    );
  }

  try {
    return new Chess(fen);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new StockfishClientError(`Invalid position: ${detail}`);
  }
}

/**
 * Whether `move` is a legal reply in `position` (a legal move is played on
 * `position`). `null` ("(none)") is only legal when the side to move has no
 * moves at all.
 */
export function isLegalEngineMove(
  position: Chess,
  move: string | null,
): boolean {
  if (move === null) {
    return position.moves().length === 0;
  }

  const promotion = move.slice(4) || undefined;
  try {
    const played = position.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion,
    });
    // chess.js ignores a promotion letter on a move that does not promote.
    return played.promotion === promotion;
  } catch {
    return false;
  }
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

// Stockfish's `bestmove (none)`: the side to move has no legal moves.
const NO_LEGAL_MOVE = '(none)';

// A UCI move such as "e2e4", or a promotion such as "e7e8q" / "e2e1n". Only a
// pawn on its seventh rank can promote, so promotions go 7->8 or 2->1.
const UCI_MOVE = /^(?:[a-h][1-8][a-h][1-8]|[a-h](?:7[a-h]8|2[a-h]1)[qrbn])$/;

// Only the fields the client uses are validated. `newFEN` and `moveDetails`
// are ignored (see EngineMove and the contract's Caveats).
const evaluationCompleteSchema = z.object({
  mode: z.literal('move'),
  move: z
    .string()
    .refine(
      (move) => move === NO_LEGAL_MOVE || UCI_MOVE.test(move),
      `expected a UCI move (e.g. "e7e5" or "e7e8q") or "${NO_LEGAL_MOVE}"`,
    ),
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
  const { move } = result.data;
  return { move: move === NO_LEGAL_MOVE ? null : move };
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
  let stopWatchingSession: (() => void) | null = null;
  /** Why the client last reset; reported by a session start it interrupted. */
  let resetReason: Error | null = null;
  const cancellers = new Set<Canceller>();

  /**
   * Abandons the socket and session and rejects everything still waiting.
   * Replies carry no request ID, so once a request fails or the session
   * fails, the old socket cannot be trusted: a reply may still be on its way.
   * The next startSession() opens a fresh socket and session.
   */
  function reset(reason: Error): void {
    const current = socket;

    resetReason = reason;
    socket = null;
    connecting = null;
    session = null;
    sessionReady = false;
    stopWatchingSession?.();
    stopWatchingSession = null;

    [...cancellers].forEach((cancel) => cancel(reason));

    current?.disconnect();
  }

  /**
   * The server can emit session-error after session-started (e.g. when the
   * engine fails to launch), so keep listening while the session is in use.
   */
  function watchSession(current: StockfishSocket): void {
    const onSessionError: SocketListener = (payload) => {
      reset(
        new StockfishClientError(describeFailure('session-error', payload)),
      );
    };
    current.on('session-error', onSessionError);
    stopWatchingSession = () => current.off('session-error', onSessionError);
  }

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

    // Watch for session-error before session-started arrives: the server can
    // send both back-to-back, and the second must not slip through while this
    // function waits to resume after the first.
    watchSession(current);

    const reply = waitForReply({
      socket: current,
      successEvent: 'session-started',
      failureEvents: ['session-error', 'disconnect'],
      timeoutMs,
      cancellers,
      parse: parseSessionStarted,
    });
    // Every evaluate-fen carries its own position, so the session's starting
    // position is never searched. A valid FEN avoids relying on the server
    // ignoring an invalid one.
    current.emit('start-session', {
      sessionType: 'player-vs-computer',
      fen: DEFAULT_POSITION,
    });
    await reply.catch((error: Error) => {
      // After a timeout the server may still create the session, and a retry
      // on this socket would fail with "Session already exists!". Retry on a
      // fresh socket instead.
      if (socket === current) reset(error);
      throw error;
    });

    // The session failed (e.g. a session-error right after session-started)
    // or disconnect() ran before this resumed. Report it instead of success.
    if (socket !== current) {
      throw (
        resetReason ??
        new StockfishClientError('Stockfish session ended before it was ready.')
      );
    }
    sessionReady = true;
  }

  function startSession(): Promise<void> {
    // The connection dropped since the last session: the server has already
    // deleted that session, so start over.
    if (sessionReady && !socket?.connected) {
      reset(
        new StockfishClientError(
          'Connection to the Stockfish server was lost.',
        ),
      );
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

  /** Asks the engine for its reply to the position after the player's move. */
  async function requestMove(request: MoveRequest): Promise<EngineMove> {
    const position = validateMoveRequest(request);

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
      // `move` is always empty: the player's move is already in `fen`. The
      // server would throw on a missing `move`, so it is sent as ''.
      // Difficulty maps directly to the server's search depth, so `level` is
      // sent unchanged.
      current.emit('evaluate-fen', {
        fen: request.fen,
        move: '',
        level: request.level,
      });
      const result = await reply;

      // A reply that is not legal here answers some other request (or the
      // server is out of step), so it must not reach the board.
      if (!isLegalEngineMove(position, result.move)) {
        throw new StockfishClientError(
          `Engine reply ${result.move ?? '(none)'} is not legal in the requested position`,
        );
      }
      return result;
    } catch (error) {
      // After a timeout, server error, disconnect, or bad reply, a late reply
      // could still arrive and be matched to the next request. Abandon the
      // socket; callers start a new session before requesting again. If the
      // client was already reset (disconnect() or session-error), skip this.
      if (socket === current) {
        reset(
          new StockfishClientError(
            'Stockfish session was reset after a failed move request.',
          ),
        );
      }
      throw error;
    } finally {
      pending = false;
    }
  }

  function disconnect(): void {
    reset(new StockfishClientError('Stockfish client disconnected.'));
  }

  return { startSession, requestMove, disconnect };
}
