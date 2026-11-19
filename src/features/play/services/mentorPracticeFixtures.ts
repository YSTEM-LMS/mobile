import { DEFAULT_POSITION } from 'chess.js';

import type {
  PracticeEvent,
  PracticeJoinResult,
  PracticeMove,
  PracticePair,
} from './MentorPracticeClient';

/**
 * Deterministic mentor-practice fixtures. Every position is a legal FEN and
 * every move's result was produced with chess.js 1.4.0, the version the chess
 * server locks (checked in test/mentorPracticeFixtures.test.ts).
 *
 * Server payloads are shown as objects; on the wire every payload in both
 * directions is a JSON string.
 */

/** FEN after 1. e4, as the server's chess.js 1.4.0 writes it. */
const FEN_AFTER_E4 =
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/**
 * One practice session between the seeded demo accounts, `student` and
 * `mentor`, as two devices see it:
 *
 * 1. The mentor joins first. The server creates the game and gives the
 *    first player black, whatever their role.
 * 2. The student joins the same pair and gets white. Only the joining device
 *    receives a join reply; the mentor is not told the student arrived.
 * 3. The student plays e2e4.
 * 4. The server sends the new position to both devices, including the
 *    student who made the move. Updates after a move carry no color.
 */
export const mentorPracticeWorkedExample = {
  mentorJoin: {
    pair: {
      student: 'student',
      mentor: 'mentor',
      role: 'mentor',
    } satisfies PracticePair,
    emitted: {
      event: 'newgame',
      payload: { student: 'student', mentor: 'mentor', role: 'mentor' },
    },
    serverReply: {
      event: 'boardstate',
      payload: { boardState: DEFAULT_POSITION, color: 'black' },
    },
    result: {
      fen: DEFAULT_POSITION,
      color: 'black',
    } satisfies PracticeJoinResult,
  },
  studentJoin: {
    pair: {
      student: 'student',
      mentor: 'mentor',
      role: 'student',
    } satisfies PracticePair,
    emitted: {
      event: 'newgame',
      payload: { student: 'student', mentor: 'mentor', role: 'student' },
    },
    serverReply: {
      event: 'boardstate',
      payload: { boardState: DEFAULT_POSITION, color: 'white' },
    },
    result: {
      fen: DEFAULT_POSITION,
      color: 'white',
    } satisfies PracticeJoinResult,
  },
  studentMove: {
    move: { from: 'e2', to: 'e4' } satisfies PracticeMove,
    emitted: { event: 'move', payload: { from: 'e2', to: 'e4' } },
    /** Sent to both devices. */
    serverReply: { event: 'boardstate', payload: { boardState: FEN_AFTER_E4 } },
    /** What both devices' listeners receive. */
    event: { type: 'board', fen: FEN_AFTER_E4 } satisfies PracticeEvent,
  },
} as const;

/**
 * Positions for driving the screen's end-of-game and rejection states. Pass
 * a `fen` as the fake client's `startingFen`.
 */
export const practicePositions = {
  /** White to move mates with Qxf7# (scholar's mate). */
  whiteMatesInOne: {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    move: { from: 'h5', to: 'f7' } satisfies PracticeMove,
    fenAfter:
      'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  },
  /** White to move stalemates Black with Qc7. */
  whiteStalematesInOne: {
    fen: 'k7/8/1K6/2Q5/8/8/8/8 w - - 0 1',
    move: { from: 'c5', to: 'c7' } satisfies PracticeMove,
    fenAfter: 'k7/2Q5/1K6/8/8/8/8/8 b - - 1 1',
  },
  /**
   * White to move can promote, but the server drops the promotion piece, so
   * chess.js rejects a7a8 with this exact message.
   */
  promotionRejected: {
    fen: '7k/P7/8/8/8/8/8/K7 w - - 0 1',
    move: { from: 'a7', to: 'a8' } satisfies PracticeMove,
    message: 'Invalid move: {"from":"a7","to":"a8"}',
  },
} as const;
