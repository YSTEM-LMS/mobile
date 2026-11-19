import { Chess, DEFAULT_POSITION } from 'chess.js';

import {
  MentorPracticeClientError,
  validatePracticeMove,
  validatePracticePair,
  type MentorPracticeClient,
  type PracticeColor,
  type PracticeEvent,
  type PracticeEventListener,
  type PracticeJoinResult,
  type PracticeMove,
  type PracticePair,
} from './MentorPracticeClient';

/**
 * Configuration options for the fake mentor-practice client.
 */
export type FakeMentorPracticeClientOptions = {
  /**
   * The color join() assigns. Defaults to white. On the real server the
   * first player to join gets black.
   */
  color?: PracticeColor;

  /** The position each join() starts from. Defaults to the start position. */
  startingFen?: string;

  /** Makes every join() reject with this error. */
  joinError?: Error;

  /** Simulated join time in milliseconds. leave() rejects a pending join. */
  joinDelayMs?: number;
};

/**
 * - `idle`: not in a game (before join(), after leave() or a failed join)
 * - `joining`: join() is pending
 * - `joined`: in a game, including one that has ended on the board
 * - `ended`: the session ended (endSession()); join() starts a new game
 */
export type FakePracticeStatus = 'idle' | 'joining' | 'joined' | 'ended';

export interface FakeMentorPracticeClient extends MentorPracticeClient {
  /**
   * Plays a move for the partner, as if it came from the other device.
   * Throws if the move is illegal in the current position, because that is
   * a mistake in the test, not a server rejection.
   */
  partnerMove(move: PracticeMove): void;

  /** Simulates the partner leaving or disconnecting: emits `ended`. */
  endSession(): void;

  readonly status: FakePracticeStatus;
  /** The current position on the fake server's board. */
  readonly fen: string;
  /** The pair from the last successful join(), or null when idle. */
  readonly pair: PracticePair | null;
  /** join() calls that passed validation. */
  readonly joinCalls: number;
  /** Every move sendMove() sent, accepted or not, in order. */
  readonly sentMoves: readonly PracticeMove[];
  readonly leaveCalls: number;
  readonly listenerCount: number;
}

/**
 * Creates a deterministic, offline MentorPracticeClient for screen tests.
 *
 * It behaves like the real chess server: moves are checked with chess.js
 * (the server's version) and sent back as `board` events to this device too;
 * the server does not check which device's turn it is; promotions are
 * rejected; checkmate and draws emit `game-over`; and nothing resumes after
 * `ended`.
 *
 * Events arrive asynchronously, like network replies. In React tests, wrap
 * calls that trigger events in `await act(async () => { ... })`.
 *
 * @param options - Configuration for the fake client's behavior.
 * @returns A fake client implementing the MentorPracticeClient interface.
 */
export function createFakeMentorPracticeClient(
  options: FakeMentorPracticeClientOptions = {},
): FakeMentorPracticeClient {
  const {
    color = 'white',
    startingFen = DEFAULT_POSITION,
    joinError,
    joinDelayMs = 0,
  } = options;

  // Fail fast on a bad option instead of on the first join().
  new Chess(startingFen);

  const listeners = new Set<PracticeEventListener>();
  const sentMoves: PracticeMove[] = [];
  let board = new Chess(startingFen);
  let status: FakePracticeStatus = 'idle';
  let pair: PracticePair | null = null;
  let joinCalls = 0;
  let leaveCalls = 0;
  // Bumped by join() and leave() so events queued for an earlier game are
  // never delivered to a later one.
  let session = 0;
  let cancelJoin: ((error: Error) => void) | null = null;

  /** Delivers events to the current listeners after the current call. */
  function deliver(events: PracticeEvent[]): void {
    const queuedFor = session;
    void Promise.resolve().then(() => {
      for (const event of events) {
        if (queuedFor !== session) return;
        for (const listener of [...listeners]) listener(event);
      }
    });
  }

  /** Waits joinDelayMs; leave() rejects the wait early. */
  function waitForJoin(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer =
        joinDelayMs > 0 ? setTimeout(resolve, joinDelayMs) : undefined;
      if (timer === undefined) void Promise.resolve().then(resolve);
      cancelJoin = (error) => {
        clearTimeout(timer);
        reject(error);
      };
    });
  }

  function requireGame(action: string): PracticePair {
    if (status !== 'joined' || !pair) {
      throw new MentorPracticeClientError(
        `Cannot ${action}: not in a game. Call join() first.`,
      );
    }
    return pair;
  }

  /** The events the server sends after a move it accepted. */
  function eventsAfterMove(current: PracticePair): PracticeEvent[] {
    const events: PracticeEvent[] = [{ type: 'board', fen: board.fen() }];

    if (board.isCheckmate()) {
      // The side to move is the side that was mated.
      const loserColor: PracticeColor =
        board.turn() === 'w' ? 'white' : 'black';
      const me = current[current.role];
      const partner =
        current.role === 'student' ? current.mentor : current.student;
      events.push({
        type: 'game-over',
        reason: 'checkmate',
        winner: loserColor === color ? partner : me,
        loser: loserColor === color ? me : partner,
      });
    } else if (
      board.isStalemate() ||
      board.isThreefoldRepetition() ||
      board.isInsufficientMaterial() ||
      board.isDraw()
    ) {
      events.push({ type: 'game-over', reason: 'draw' });
    }

    return events;
  }

  async function join(requested: PracticePair): Promise<PracticeJoinResult> {
    const validated = validatePracticePair(requested);
    if (status === 'joining' || status === 'joined') {
      throw new MentorPracticeClientError(
        'Already in a game. Call leave() before joining again.',
      );
    }

    joinCalls += 1;
    session += 1;
    const joiningSession = session;
    status = 'joining';
    try {
      await waitForJoin();
    } finally {
      cancelJoin = null;
    }

    // leave() can run after the wait finished but before this line.
    if (joiningSession !== session) {
      throw new MentorPracticeClientError(
        'Left the game before joining finished.',
      );
    }

    if (joinError) {
      status = 'idle';
      throw joinError;
    }

    board = new Chess(startingFen);
    pair = validated;
    status = 'joined';
    return { fen: board.fen(), color };
  }

  function sendMove(move: PracticeMove): void {
    const validated = validatePracticeMove(move);
    const current = requireGame('send a move');
    sentMoves.push(validated);

    try {
      // Like the server: only from and to reach chess.js.
      board.move({ from: validated.from, to: validated.to });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      deliver([{ type: 'move-rejected', message }]);
      return;
    }
    deliver(eventsAfterMove(current));
  }

  function partnerMove(move: PracticeMove): void {
    const validated = validatePracticeMove(move);
    const current = requireGame('play a partner move');

    try {
      board.move({ from: validated.from, to: validated.to });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new MentorPracticeClientError(
        `Partner move is not legal in ${board.fen()}: ${detail}`,
      );
    }
    deliver(eventsAfterMove(current));
  }

  function endSession(): void {
    requireGame('end the session');
    status = 'ended';
    deliver([{ type: 'ended' }]);
  }

  function subscribe(listener: PracticeEventListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function leave(): void {
    leaveCalls += 1;
    session += 1;
    listeners.clear();
    cancelJoin?.(
      new MentorPracticeClientError('Left the game before joining finished.'),
    );
    status = 'idle';
    pair = null;
  }

  return {
    join,
    sendMove,
    subscribe,
    leave,
    partnerMove,
    endSession,
    get status() {
      return status;
    },
    get fen() {
      return board.fen();
    },
    get pair() {
      return pair;
    },
    get joinCalls() {
      return joinCalls;
    },
    get sentMoves() {
      return sentMoves;
    },
    get leaveCalls() {
      return leaveCalls;
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}
