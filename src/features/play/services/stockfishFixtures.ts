import { Chess, DEFAULT_POSITION } from 'chess.js';

import type { EngineMove, MoveRequest } from './StockfishClient';

/**
 * Deterministic Stockfish fixtures. Every position is a legal FEN and every
 * engine move is legal in its position (checked in test/stockfishFixtures.test.ts).
 * Engine moves are chosen for the tests, not recorded from a live server.
 */

/** The server's evaluation-complete payload for a session in move mode. */
export interface EvaluationCompletePayload {
  mode: 'move';
  move: string;
  moveDetails: {
    color: string;
    from: string;
    to: string;
    flags: string;
    piece: string;
    san: string;
    captured?: string;
    promotion?: string;
  } | null;
  newFEN: string;
}

/**
 * Builds the evaluation-complete payload the server sends when `move` is the
 * engine's reply to `fen` (sent with an empty player move). `null` builds the
 * no-legal-move reply, "(none)". `newFEN` comes from chess.js 1.x, so its en
 * passant field can differ from the server's chess.js 0.11.
 */
export function evaluationCompletePayload(
  fen: string,
  move: string | null,
): EvaluationCompletePayload {
  if (move === null) {
    return { mode: 'move', move: '(none)', moveDetails: null, newFEN: fen };
  }

  const game = new Chess(fen);
  const played = game.move({
    from: move.slice(0, 2),
    to: move.slice(2, 4),
    promotion: move.slice(4) || undefined,
  });
  return {
    mode: 'move',
    move,
    moveDetails: {
      color: played.color,
      from: played.from,
      to: played.to,
      flags: played.flags,
      piece: played.piece,
      san: played.san,
      ...(played.captured ? { captured: played.captured } : {}),
      ...(played.promotion ? { promotion: played.promotion } : {}),
    },
    newFEN: game.fen(),
  };
}

/**
 * One full turn, as the game screen performs it:
 *
 * 1. The board starts at `startingFen` with the player (White) to move.
 * 2. The player plays e2e4. The board applies it, giving `request.fen`.
 * 3. The screen calls `client.requestMove(request)`.
 * 4. The client emits `emitted`. The player's move is inside `fen`, so
 *    `move` is empty.
 * 5. The server replies with `serverReply`.
 * 6. `requestMove` resolves with `engineMove`. The board applies it, giving
 *    `fenAfterEngineMove`. `serverReply.newFEN` is ignored.
 */
export const stockfishWorkedExample = {
  startingFen: DEFAULT_POSITION,
  playerMove: { uci: 'e2e4', san: 'e4' },
  request: {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    level: 3,
  } satisfies MoveRequest,
  emitted: {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    move: '',
    level: 3,
  },
  serverReply: {
    mode: 'move',
    move: 'e7e5',
    moveDetails: {
      color: 'b',
      from: 'e7',
      to: 'e5',
      flags: 'b',
      piece: 'p',
      san: 'e5',
    },
    // The server's chess.js 0.11 always records the en passant square (e6).
    // Ignored by the client either way.
    newFEN: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  } satisfies EvaluationCompletePayload,
  engineMove: { move: 'e7e5' } satisfies EngineMove,
  fenAfterEngineMove:
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
} as const;

export interface EngineReplyFixture {
  name: string;
  /** Position after the player's move, with the engine to move. */
  fen: string;
  /** The engine's reply, or null when it has no legal move. */
  move: string | null;
}

export const engineReplyFixtures: readonly EngineReplyFixture[] = [
  {
    name: 'reply to 1. e4',
    fen: stockfishWorkedExample.request.fen,
    move: 'e7e5',
  },
  {
    name: 'reply to 1. e4 e5 2. Nf3',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    move: 'b8c6',
  },
  {
    name: 'engine castles kingside (Italian Game, after 5. c3)',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5',
    move: 'e8g8',
  },
  {
    name: 'engine promotes to a queen',
    fen: '7k/8/8/8/8/8/p6K/8 b - - 0 1',
    move: 'a2a1q',
  },
  {
    name: 'engine underpromotes to a knight',
    fen: '8/8/8/8/8/8/5p1k/3K4 b - - 0 1',
    move: 'f2f1n',
  },
  {
    name: 'reply after the player promoted (a7a8q is already on the board)',
    fen: 'Q6k/8/8/8/8/8/8/K7 b - - 0 1',
    move: 'h8h7',
  },
  {
    name: 'engine is checkmated (1. f3 e5 2. g4 Qh4#)',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
    move: null,
  },
  {
    name: 'engine is stalemated',
    fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1',
    move: null,
  },
];

/** Fixture replies by FEN: the fake client's default answers. */
export const engineRepliesByFen: Readonly<Record<string, string | null>> =
  Object.fromEntries(engineReplyFixtures.map(({ fen, move }) => [fen, move]));
