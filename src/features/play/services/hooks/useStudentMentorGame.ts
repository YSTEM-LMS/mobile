import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MentorPracticeClient,
  PracticeColor,
  PracticeEvent,
  PracticePair,
} from '@/features/play/services/MentorPracticeClient';
import { Chess } from 'chess.js';

export type GameOver = Extract<PracticeEvent, { type: 'game-over' }>;

export type StudentMentorGameState =
  | { status: 'joining' }
  | { status: 'join-failed'; message: string }
  | {
      status: 'playing';
      fen: string;
      color: PracticeColor;
      pendingMove: boolean;
      rejection?: string;
      gameOver?: GameOver;
    }
  | { status: 'ended' };

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.';
}

function isPlayersTurn(state: StudentMentorGameState): boolean {
  if (state.status !== 'playing' || state.gameOver) return false;
  const board = new Chess(state.fen);
  return !board.isGameOver() && board.turn() === state.color[0];
}

export function useStudentMentorGame(
  client: MentorPracticeClient,
  pair: PracticePair,
) {
  const [state, setState] = useState<StudentMentorGameState>({
    status: 'joining',
  });

  const { student, mentor, role } = pair;

  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingMoveRef = useRef(false);

  const begin = useCallback(() => {
    cleanupRef.current?.();
    pendingMoveRef.current = false;
    let active = true;
    let cleanedUp = false;

    const unsubscribe = client.subscribe((event) => {
      if (!active) return;
      pendingMoveRef.current = false;

      if (event.type === 'ended') {
        active = false;
        setState((current) => {
          // Once a game is over if one player leaves, instead of showing the ended state, it preserves the game over screen.
          if (
            current.status === 'playing' &&
            (current.gameOver || new Chess(current.fen).isGameOver())
          ) {
            return current;
          }
          return { status: 'ended' };
        });
        return;
      }

      setState((current) => {
        if (current.status !== 'playing' || current.gameOver) return current;

        switch (event.type) {
          case 'board':
            return {
              ...current,
              fen: event.fen,
              pendingMove: false,
              rejection: undefined,
            };
          case 'move-rejected':
            return { ...current, pendingMove: false, rejection: event.message };
          case 'game-over':
            return { ...current, pendingMove: false, gameOver: event };
        }
      });
    });

    cleanupRef.current = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      active = false;
      pendingMoveRef.current = false;
      unsubscribe();
      client.leave();
    };

    async function join() {
      if (!active) return;
      setState({ status: 'joining' });

      try {
        const { fen, color } = await client.join({ student, mentor, role });
        if (!active) return;
        setState({ status: 'playing', fen, color, pendingMove: false });
      } catch (error) {
        if (active) {
          setState({ status: 'join-failed', message: errorMessage(error) });
        }
      }
    }

    join();
  }, [client, student, mentor, role]);

  useEffect(() => {
    begin();
    return () => cleanupRef.current?.();
  }, [begin]);

  const sendMove = useCallback(
    (from: string, to: string): boolean => {
      if (
        state.status !== 'playing' ||
        !isPlayersTurn(state) ||
        pendingMoveRef.current
      ) {
        return false;
      }

      pendingMoveRef.current = true;
      setState((current) => {
        if (current.status !== 'playing') return current;
        return { ...current, pendingMove: true, rejection: undefined };
      });

      try {
        client.sendMove({ from, to });
        return true;
      } catch (error) {
        pendingMoveRef.current = false;
        setState((current) => {
          if (current.status === 'playing') {
            return {
              ...current,
              pendingMove: false,
              rejection: errorMessage(error),
            };
          }

          return current;
        });
        return false;
      }
    },
    [state, client],
  );

  const retry = useCallback(() => {
    if (state.status === 'join-failed') begin();
  }, [begin, state.status]);

  const yourTurn = isPlayersTurn(state);

  return {
    state,
    yourTurn,
    inputDisabled:
      !yourTurn || (state.status === 'playing' && state.pendingMove),
    sendMove,
    retry,
  };
}
