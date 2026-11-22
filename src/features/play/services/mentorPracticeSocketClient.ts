import { validateFen } from 'chess.js';
import { io } from 'socket.io-client';
import { z } from 'zod';

import { env } from '@/config/env';

import {
  MentorPracticeClientError,
  validatePracticeMove,
  validatePracticePair,
  type MentorPracticeClient,
  type PracticeEvent,
  type PracticeEventListener,
  type PracticeJoinResult,
  type PracticeMove,
  type PracticePair,
} from './MentorPracticeClient';
import type { SocketListener, StockfishSocket } from './StockfishClient';

/**
 * The Socket.IO calls the client makes. It is the same shape the Stockfish
 * client uses, so tests can pass the shared FakeSocket.
 */
export type PracticeSocket = StockfishSocket;

export interface MentorPracticeClientOptions {
  /** Defaults to EXPO_PUBLIC_CHESS_SOCKET_URL. */
  url?: string;
  /** Tests pass a factory that returns a FakeSocket. */
  createSocket?: (url: string) => PracticeSocket;
  /** How long join() waits to connect and get the server's reply. */
  timeoutMs?: number;
}

function createRealSocket(url: string): PracticeSocket {
  return io(url, {
    // Nothing connects until join() calls socket.connect().
    autoConnect: false,
    // React Native works best with WebSocket only (no HTTP long-polling).
    transports: ['websocket'],
    // The server deletes the game when the socket drops, so reconnecting
    // would only reach a socket with no game. join() starts a new one.
    reconnection: false,
  });
}

// ----- Payload validation (the server is untrusted input) -----

const fenSchema = z
  .string()
  .refine((fen) => validateFen(fen).ok, 'expected a valid FEN');

// The reply to `newgame`: the only `boardstate` that carries a color.
const joinReplySchema = z.object({
  boardState: fenSchema,
  color: z.enum(['white', 'black']),
});

// Sent to both devices after every accepted move (and undo or setstate).
const boardSchema = z.object({ boardState: fenSchema });

const gameOverSchema = z.object({
  reason: z.enum(['checkmate', 'draw', 'resign']),
  winnerUsername: z.string().optional(),
  loserUsername: z.string().optional(),
});

/**
 * Parses a server payload. The server sends every payload as a JSON string.
 */
function parsePayload<T>(
  event: string,
  schema: z.ZodType<T>,
  payload: unknown,
): T {
  let data = payload;
  if (typeof payload === 'string') {
    try {
      data = JSON.parse(payload);
    } catch {
      throw new MentorPracticeClientError(
        `Invalid ${event} payload: not JSON.`,
      );
    }
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
      .join('; ');
    throw new MentorPracticeClientError(`Invalid ${event} payload: ${issues}`);
  }
  return result.data;
}

/** The server sends errors as plain strings; connect_error sends an Error. */
function describe(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload instanceof Error && payload.message) return payload.message;
  return fallback;
}

// ----- The client -----

type Status = 'idle' | 'joining' | 'joined' | 'ended';

interface PendingJoin {
  resolve: (result: PracticeJoinResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Creates the real MentorPracticeClient for the chess server's `newgame`
 * flow. Each join() opens its own socket, and the game ends when that socket
 * closes. See docs/mentor-practice-socket-contract.md.
 */
export function createMentorPracticeClient({
  url = env.chessSocketUrl,
  createSocket = createRealSocket,
  timeoutMs = 10_000,
}: MentorPracticeClientOptions = {}): MentorPracticeClient {
  const listeners = new Set<PracticeEventListener>();
  let socket: PracticeSocket | null = null;
  let stopListening: (() => void) | null = null;
  let status: Status = 'idle';
  let pendingJoin: PendingJoin | null = null;

  function deliver(event: PracticeEvent): void {
    for (const listener of [...listeners]) listener(event);
  }

  /**
   * Stops listening to the socket, then closes it. The order matters: the
   * client's own disconnect must not be reported as the session ending. The
   * server deletes the game when the socket closes and resets the partner.
   */
  function closeSocket(): void {
    const current = socket;
    socket = null;
    stopListening?.();
    stopListening = null;
    current?.disconnect();
  }

  function failJoin(error: Error): void {
    const pending = pendingJoin;
    if (!pending) return;
    pendingJoin = null;
    clearTimeout(pending.timer);
    closeSocket();
    status = 'idle';
    pending.reject(error);
  }

  /** The game is gone on the server; nothing resumes. */
  function endSession(): void {
    closeSocket();
    status = 'ended';
    deliver({ type: 'ended' });
  }

  function listen(current: PracticeSocket, pair: PracticePair): void {
    const handlers: Record<string, SocketListener> = {
      connect: () => {
        if (status === 'joining') {
          current.emit('newgame', JSON.stringify(pair));
        }
      },

      connect_error: (error) => {
        failJoin(
          new MentorPracticeClientError(
            `Could not connect to the chess server: ${describe(error, 'no details provided')}`,
          ),
        );
      },

      boardstate: (payload) => {
        if (status === 'joining') {
          let reply: z.infer<typeof joinReplySchema>;
          try {
            reply = parsePayload('boardstate', joinReplySchema, payload);
          } catch (error) {
            failJoin(error as Error);
            return;
          }
          const pending = pendingJoin;
          pendingJoin = null;
          if (pending) clearTimeout(pending.timer);
          status = 'joined';
          pending?.resolve({ fen: reply.boardState, color: reply.color });
          return;
        }

        if (status === 'joined') {
          try {
            const { boardState } = parsePayload(
              'boardstate',
              boardSchema,
              payload,
            );
            deliver({ type: 'board', fen: boardState });
          } catch {
            // The board can no longer be trusted.
            endSession();
          }
        }
      },

      // Sent only in reply to newgame.
      gameerror: (message) => {
        failJoin(
          new MentorPracticeClientError(
            describe(message, 'The chess server could not start the game.'),
          ),
        );
      },

      // Sent when a move (or another request) fails. The position is unchanged.
      error: (message) => {
        if (status === 'joined') {
          deliver({
            type: 'move-rejected',
            message: describe(message, 'The chess server rejected the move.'),
          });
        }
      },

      gameover: (payload) => {
        if (status !== 'joined') return;
        try {
          const outcome = parsePayload('gameover', gameOverSchema, payload);
          deliver({
            type: 'game-over',
            reason: outcome.reason,
            ...(outcome.winnerUsername !== undefined && {
              winner: outcome.winnerUsername,
            }),
            ...(outcome.loserUsername !== undefined && {
              loser: outcome.loserUsername,
            }),
          });
        } catch {
          endSession();
        }
      },

      // The partner left or disconnected, and the server deleted the game.
      reset: () => {
        if (status === 'joining') {
          failJoin(
            new MentorPracticeClientError(
              'The game ended before joining finished.',
            ),
          );
        } else if (status === 'joined') {
          endSession();
        }
      },

      // Only a lost connection gets here: closeSocket() stops listening first.
      disconnect: () => {
        if (status === 'joining') {
          failJoin(
            new MentorPracticeClientError(
              'Lost the connection to the chess server while joining.',
            ),
          );
        } else if (status === 'joined') {
          endSession();
        }
      },
    };

    // Ignore anything from a socket the client has already closed.
    const guarded = Object.entries(handlers).map(([event, handler]) => {
      const listener: SocketListener = (...args) => {
        if (socket === current) handler(...args);
      };
      current.on(event, listener);
      return { event, listener };
    });
    stopListening = () => {
      guarded.forEach(({ event, listener }) => current.off(event, listener));
    };
  }

  function join(requested: PracticePair): Promise<PracticeJoinResult> {
    let pair: PracticePair;
    try {
      pair = validatePracticePair(requested);
    } catch (error) {
      return Promise.reject(error);
    }
    if (status === 'joining' || status === 'joined') {
      return Promise.reject(
        new MentorPracticeClientError(
          'Already in a game. Call leave() before joining again.',
        ),
      );
    }

    status = 'joining';
    const current = createSocket(url);
    socket = current;
    listen(current, pair);

    return new Promise<PracticeJoinResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        failJoin(
          new MentorPracticeClientError(
            `Timed out after ${timeoutMs} ms joining the game.`,
          ),
        );
      }, timeoutMs);
      pendingJoin = { resolve, reject, timer };
      current.connect();
    });
  }

  function sendMove(move: PracticeMove): void {
    const validated = validatePracticeMove(move);
    if (status !== 'joined' || !socket) {
      throw new MentorPracticeClientError(
        'Cannot send a move: not in a game. Call join() first.',
      );
    }
    socket.emit('move', JSON.stringify(validated));
  }

  function subscribe(listener: PracticeEventListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function leave(): void {
    listeners.clear();
    failJoin(
      new MentorPracticeClientError('Left the game before joining finished.'),
    );
    closeSocket();
    status = 'idle';
  }

  return { join, sendMove, subscribe, leave };
}
