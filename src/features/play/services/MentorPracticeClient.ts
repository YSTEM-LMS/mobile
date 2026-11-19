/**
 * The mentor–student practice game client: two signed-in users, one student
 * and their mentor, play one game through the live chess server's `newgame`
 * flow. See docs/mentor-practice-socket-contract.md.
 */

export type PracticeColor = 'white' | 'black';

export type PracticeRole = 'student' | 'mentor';

/** Who is playing, and which side of the pair this device is. */
export interface PracticePair {
  /** The student's username. */
  student: string;
  /** The mentor's username. */
  mentor: string;
  /** This device's role in the pair. */
  role: PracticeRole;
}

export interface PracticeJoinResult {
  /** The current position. A rejoin returns the game in progress. */
  fen: string;
  /**
   * This device's color. The server decides it by join order (the first
   * player to join gets black), not by role.
   */
  color: PracticeColor;
}

/**
 * A move as the server accepts it. There is no promotion field: the server
 * ignores one, so promoting moves are rejected.
 */
export interface PracticeMove {
  /** Square the piece moves from, e.g. "e2". */
  from: string;
  /** Square the piece moves to, e.g. "e4". */
  to: string;
}

export type PracticeGameOverReason = 'checkmate' | 'draw';

export type PracticeEvent =
  /**
   * The position after a move by either player, including this device's own
   * move. The board is the only source of truth for the position.
   */
  | { type: 'board'; fen: string }
  /** The server refused this device's last move. The position is unchanged. */
  | { type: 'move-rejected'; message: string }
  /** The game ended on the board. `winner` and `loser` are usernames. */
  | {
      type: 'game-over';
      reason: PracticeGameOverReason;
      winner?: string;
      loser?: string;
    }
  /**
   * The session is over: a player left or disconnected, and the server
   * deleted the game. Nothing can be resumed; join() again for a new game.
   */
  | { type: 'ended' };

export type PracticeEventListener = (event: PracticeEvent) => void;

export interface MentorPracticeClient {
  /**
   * Connects and joins the pair's game, creating it if this device is first.
   * Rejects with a MentorPracticeClientError the screen can show. Can be
   * called again after `ended` or leave() to start a new game.
   */
  join(pair: PracticePair): Promise<PracticeJoinResult>;

  /**
   * Sends a move. The result arrives as a `board` or `move-rejected` event.
   * The server does not check whose turn it is, so the screen must only
   * allow moves for this device's color on its turn.
   */
  sendMove(move: PracticeMove): void;

  /** Adds a listener and returns a function that removes it. */
  subscribe(listener: PracticeEventListener): () => void;

  /**
   * Ends the game for both players, removes every listener, and disconnects.
   * Safe to call more than once; call it when the screen unmounts.
   */
  leave(): void;
}

export class MentorPracticeClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MentorPracticeClientError';
  }
}

const SQUARE = /^[a-h][1-8]$/;

/**
 * Checks a pair before anything is sent. TypeScript can be bypassed, so the
 * role is checked at runtime too.
 */
export function validatePracticePair(pair: PracticePair): PracticePair {
  const student = typeof pair.student === 'string' ? pair.student.trim() : '';
  const mentor = typeof pair.mentor === 'string' ? pair.mentor.trim() : '';

  if (!student || !mentor) {
    throw new MentorPracticeClientError(
      'Both the student and mentor usernames are required.',
    );
  }
  if (student === mentor) {
    throw new MentorPracticeClientError(
      'The student and mentor must be different users.',
    );
  }
  if (pair.role !== 'student' && pair.role !== 'mentor') {
    throw new MentorPracticeClientError(
      `Role must be "student" or "mentor" (received ${String(pair.role)}).`,
    );
  }

  return { student, mentor, role: pair.role };
}

/** Checks that both squares look like "e2" before a move is sent. */
export function validatePracticeMove(move: PracticeMove): PracticeMove {
  if (!SQUARE.test(move.from) || !SQUARE.test(move.to)) {
    throw new MentorPracticeClientError(
      `Invalid move squares: ${String(move.from)} to ${String(move.to)}.`,
    );
  }
  return { from: move.from, to: move.to };
}
