import { engineRepliesByFen } from './stockfishFixtures';
import {
  isLegalEngineMove,
  StockfishClientError,
  validateMoveRequest,
  type MoveRequest,
  type StockfishClient,
} from './StockfishClient';

/**
 * Configuration options for the fake Stockfish client.
 */
export type FakeStockfishClientOptions = {
  /**
   * Engine replies by FEN (the position after the player's move). `null`
   * means the engine has no legal move. Positions not listed get the first
   * legal move chess.js generates. Defaults to the fixture replies.
   */
  replies?: Readonly<Record<string, string | null>>;

  /** Makes every startSession() reject with this error. */
  startError?: Error;

  /** Makes every requestMove() reject with this error. */
  moveError?: Error;

  /** Simulated engine thinking time in milliseconds. */
  delayMs?: number;
};

export interface FakeStockfishClient extends StockfishClient {
  /** Every request that passed validation, in order. */
  readonly requests: readonly MoveRequest[];
  readonly sessionsStarted: number;
  readonly disconnectCalls: number;
  readonly hasSession: boolean;
}

/**
 * Creates a deterministic, offline StockfishClient for screen tests.
 *
 * It follows the real client's contract: requestMove() needs a started
 * session, rejects invalid levels and FENs, allows one request at a time,
 * and ends the session after any failure or disconnect(), so the caller must
 * call startSession() again. Replies are always legal in the requested
 * position.
 *
 * @param options - Configuration for the fake client's behavior.
 * @returns A fake client implementing the StockfishClient interface.
 */
export function createFakeStockfishClient(
  options: FakeStockfishClientOptions = {},
): FakeStockfishClient {
  const {
    replies = engineRepliesByFen,
    startError,
    moveError,
    delayMs = 0,
  } = options;

  const requests: MoveRequest[] = [];
  let hasSession = false;
  let sessionsStarted = 0;
  let disconnectCalls = 0;
  let pending = false;
  let cancelPending: ((error: Error) => void) | null = null;

  /** Waits delayMs; disconnect() rejects the wait early. */
  function think(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = delayMs > 0 ? setTimeout(resolve, delayMs) : undefined;
      if (timer === undefined) void Promise.resolve().then(resolve);
      cancelPending = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  }

  async function startSession(): Promise<void> {
    if (startError) throw startError;
    if (!hasSession) {
      hasSession = true;
      sessionsStarted += 1;
    }
  }

  async function requestMove(request: MoveRequest) {
    const position = validateMoveRequest(request);

    if (!hasSession) {
      throw new StockfishClientError(
        'No Stockfish session. Call startSession() before requesting a move.',
      );
    }
    if (pending) {
      throw new StockfishClientError('A move request is already in progress.');
    }

    pending = true;
    requests.push({ ...request });
    try {
      await think();
      if (moveError) throw moveError;

      const move = Object.prototype.hasOwnProperty.call(replies, request.fen)
        ? (replies[request.fen] ?? null)
        : firstLegalMove(request.fen);

      if (!isLegalEngineMove(position, move)) {
        throw new StockfishClientError(
          `Fake reply ${move ?? '(none)'} is not legal in ${request.fen}`,
        );
      }
      return { move };
    } catch (error) {
      // Like the real client, any failure ends the session.
      hasSession = false;
      throw error;
    } finally {
      pending = false;
      cancelPending = null;
    }
  }

  function disconnect(): void {
    disconnectCalls += 1;
    hasSession = false;
    cancelPending?.(new StockfishClientError('Stockfish client disconnected.'));
  }

  return {
    startSession,
    requestMove,
    disconnect,
    get requests() {
      return requests;
    },
    get sessionsStarted() {
      return sessionsStarted;
    },
    get disconnectCalls() {
      return disconnectCalls;
    },
    get hasSession() {
      return hasSession;
    },
  };
}

/** chess.js's first legal move in UCI, or null when there is none. */
function firstLegalMove(fen: string): string | null {
  const [first] = validateMoveRequest({ fen, level: 1 }).moves({
    verbose: true,
  });
  return first ? `${first.from}${first.to}${first.promotion ?? ''}` : null;
}
