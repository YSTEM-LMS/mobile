import { Chess, type Square } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createStockfishClient,
  type EngineMove,
  type StockfishClient,
  type StockfishLevel,
} from '@/features/play/services/StockfishClient';

export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type ComputerGamePhase =
  | 'starting'
  | 'player-turn'
  | 'engine-turn'
  | 'start-failed'
  | 'engine-failed'
  | 'game-over'
  | 'abandoned';

export type ComputerGameOutcome = 'win' | 'lose' | 'draw';

type LastMove = { from: Square; to: Square };
type PendingRequest = { fen: string; move: string };

type UseComputerGameOptions = {
  difficulty?: string;
  /** Only used on the first render. Must be a valid FEN. */
  initialFen?: string;
  /** Only used on the first render. Tests pass a fake client. */
  createClient?: () => StockfishClient;
};

const LEVELS = new Map<string, StockfishLevel>([
  ['beginner', 1],
  ['easy', 2],
  ['medium', 3],
  ['hard', 4],
  ['master', 5],
]);

/** Maps the setup screen's difficulty name to the engine level (1-5). */
export function difficultyToLevel(difficulty?: string): StockfishLevel {
  return LEVELS.get(difficulty ?? '') ?? 1;
}

/** The player is always White, so Black being mated is a win. */
function resolveOutcome(game: Chess): ComputerGameOutcome | null {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) return game.turn() === 'b' ? 'win' : 'lose';
  return 'draw';
}

/**
 * Controller for a player-(White)-vs-computer game.
 *
 * - The chess.js `game` object is the one authoritative position. `position`
 *   is only a copy of its FEN for rendering.
 * - Only this hook talks to the Stockfish client. Screens and the board never
 *   touch the socket.
 * - Promotion: MVP behavior is to auto-promote to a queen.
 * - Request shape: FEN BEFORE the player's move + the move in UCI.
 */
export function useComputerGame({
  difficulty,
  initialFen = START_FEN,
  createClient = createStockfishClient,
}: UseComputerGameOptions = {}) {
  const level = difficultyToLevel(difficulty);

  const [game] = useState(() => new Chess(initialFen));
  const [client] = useState(() => createClient());
  const [position, setPosition] = useState(() => game.fen());
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [outcome, setOutcome] = useState<ComputerGameOutcome | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phase, setPhaseState] = useState<ComputerGamePhase>('starting');

  // The ref is read synchronously so a fast second tap cannot slip through
  // before React re-renders.
  const phaseRef = useRef<ComputerGamePhase>('starting');
  // Bumped on unmount and on abandon. Async work compares its own token to
  // this and stops if they differ.
  const tokenRef = useRef(0);
  // The request to (re)send if the engine call fails.
  const pendingRef = useRef<PendingRequest | null>(null);

  const setPhase = useCallback((next: ComputerGamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const fail = useCallback(
    (next: 'start-failed' | 'engine-failed', error: unknown) => {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong. Please try again.',
      );
      setPhase(next);
    },
    [setPhase],
  );

  /** Copies the authoritative position into state. Returns the result if over. */
  const publish = useCallback(
    (from: Square, to: Square): ComputerGameOutcome | null => {
      setPosition(game.fen());
      setLastMove({ from, to });
      const result = resolveOutcome(game);
      if (result) {
        setOutcome(result);
        setPhase('game-over');
      }
      return result;
    },
    [game, setPhase],
  );

  const begin = useCallback(
    async (token: number) => {
      try {
        await client.startSession();
      } catch (error) {
        if (tokenRef.current !== token) return;
        fail('start-failed', error);
        return;
      }
      if (tokenRef.current !== token) return;
      setPhase('player-turn');
    },
    [client, fail, setPhase],
  );

  const runEngineTurn = useCallback(
    async (token: number) => {
      const pending = pendingRef.current;
      if (!pending) return;

      setErrorMessage(null);
      setPhase('engine-turn');

      let reply: EngineMove;
      try {
        // Cheap when the session is already ready. After the client has reset
        // itself (timeout, session error) this opens a fresh session.
        await client.startSession();
        if (tokenRef.current !== token) return;
        reply = await client.requestMove({
          fen: pending.fen,
          move: pending.move,
          level,
        });
      } catch (error) {
        if (tokenRef.current !== token) return;
        fail('engine-failed', error);
        return;
      }
      if (tokenRef.current !== token) return;

      if (reply.move === null) {
        fail(
          'engine-failed',
          new Error('The computer has no legal move in this position.'),
        );
        return;
      }

      const from = reply.move.slice(0, 2) as Square;
      const to = reply.move.slice(2, 4) as Square;
      try {
        game.move({ from, to, promotion: reply.move.slice(4) || undefined });
      } catch {
        // chess.js throws on an illegal move and leaves the position alone.
        fail(
          'engine-failed',
          new Error('The computer sent a move that is not legal here.'),
        );
        return;
      }

      pendingRef.current = null;
      if (!publish(from, to)) setPhase('player-turn');
    },
    [client, fail, game, level, publish, setPhase],
  );

  const makePlayerMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (phaseRef.current !== 'player-turn') return false;

      const fenBefore = game.fen();
      let applied;
      try {
        applied = game.move({ from, to, promotion: 'q' });
      } catch {
        return false;
      }

      // Contract: position BEFORE the player's move + the move. The engine's
      // reply is applied once, to our own board.
      pendingRef.current = {
        fen: fenBefore,
        move: `${from}${to}${applied.promotion ?? ''}`,
      };

      if (publish(from, to)) {
        pendingRef.current = null;
        return true;
      }
      void runEngineTurn(tokenRef.current);
      return true;
    },
    [game, publish, runEngineTurn],
  );

  const retry = useCallback(() => {
    const token = tokenRef.current;
    if (phaseRef.current === 'start-failed') {
      setErrorMessage(null);
      setPhase('starting');
      void begin(token);
    } else if (phaseRef.current === 'engine-failed') {
      void runEngineTurn(token);
    }
  }, [begin, runEngineTurn, setPhase]);

  const abandon = useCallback(() => {
    tokenRef.current += 1;
    setPhase('abandoned');
    client.disconnect();
  }, [client, setPhase]);

  useEffect(() => {
    tokenRef.current += 1;
    void begin(tokenRef.current);

    return () => {
      tokenRef.current += 1;
      client.disconnect();
    };
  }, [begin, client]);

  return {
    position,
    lastMove,
    phase,
    outcome,
    errorMessage,
    level,
    inputDisabled: phase !== 'player-turn',
    makePlayerMove,
    retry,
    abandon,
  };
}
