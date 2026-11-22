import { Chess, type Square } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LessonRequest } from '@/features/lessons/api/lesson.types';

import {
  parseSolution,
  SolutionError,
  type ParsedSolution,
  type SolutionErrorCode,
} from './parseSolution';

export type ExercisePhase = 'learner-turn' | 'complete' | 'error';
export type ExerciseFeedback = 'none' | 'correct' | 'wrong';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export type UseLessonExerciseInput = {
  /** One-based lesson identifier, passed back untouched to onComplete. */
  lesson: LessonRequest;
  startFen: string;
  solution: string | null | undefined;
  /**
   * Called once per successful attempt. The save itself belongs to the
   * caller's adapter. It may be async: the hook tracks saving, saved and failed.
   */
  onComplete?: (lesson: LessonRequest) => unknown;
};

type LastMove = { from: Square; to: Square };

type ParseResult =
  | { ok: true; value: ParsedSolution }
  | { ok: false; code: SolutionErrorCode; message: string };

type ExerciseState = {
  runKey: string;
  fen: string;
  stepIndex: number;
  lastMove: LastMove | null;
  feedback: ExerciseFeedback;
  wrongAttempts: number;
  complete: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
};

function safeParse(
  startFen: string,
  solution: string | null | undefined,
): ParseResult {
  try {
    return { ok: true, value: parseSolution(startFen, solution) };
  } catch (error) {
    if (error instanceof SolutionError) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

function initialState(runKey: string, startFen: string): ExerciseState {
  return {
    runKey,
    fen: startFen,
    stepIndex: 0,
    lastMove: null,
    feedback: 'none',
    wrongAttempts: 0,
    complete: false,
    saveStatus: 'idle',
    saveError: null,
  };
}

/**
 * Controller for a lesson exercise with a scripted solution.
 *
 * - The solution is parsed once per lesson (see parseSolution).
 * - `state.fen` is the one authoritative position. The board renders it and
 *   reports moves through makeMove().
 * - A legal but wrong move leaves the position unchanged and allows a retry.
 * - A correct move is applied, followed by the scripted reply if there is one.
 * - Completion is signalled once per attempt. reset() starts a new attempt.
 * - Promotion: the piece comes from the solution, so the learner does not
 *   choose one in this milestone.
 */
export function useLessonExercise({
  lesson,
  startFen,
  solution,
  onComplete,
}: UseLessonExerciseInput) {
  const { piece, lessonNumber } = lesson;
  const [attempt, setAttempt] = useState(0);

  const parsed = useMemo(
    () => safeParse(startFen, solution),
    [startFen, solution],
  );

  // A new key (another lesson, another solution, or reset()) starts fresh.
  const runKey = JSON.stringify([
    piece,
    lessonNumber,
    attempt,
    startFen,
    solution ?? null,
  ]);
  const fresh = useMemo(
    () => initialState(runKey, startFen),
    [runKey, startFen],
  );
  const [state, setState] = useState<ExerciseState>(fresh);
  const current = state.runKey === runKey ? state : fresh;

  const onCompleteRef = useRef(onComplete);
  // The attempt whose results may still update state. Null after unmount.
  const activeRunKeyRef = useRef<string | null>(null);
  // The attempt that already signalled completion.
  const completedRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    activeRunKeyRef.current = runKey;
    return () => {
      activeRunKeyRef.current = null;
    };
  }, [runKey]);

  const settleSave = useCallback(
    (key: string, saveStatus: SaveStatus, saveError: string | null) => {
      if (activeRunKeyRef.current !== key) return;
      setState((s) => (s.runKey === key ? { ...s, saveStatus, saveError } : s));
    },
    [],
  );

  const startSave = useCallback(
    async (
      key: string,
      request: LessonRequest,
      callback: (lesson: LessonRequest) => unknown,
    ) => {
      try {
        await callback(request);
        settleSave(key, 'saved', null);
      } catch (error) {
        settleSave(
          key,
          'failed',
          error instanceof Error && error.message
            ? error.message
            : 'Your progress could not be saved.',
        );
      }
    },
    [settleSave],
  );

  /** Returns true only when the move was the expected one and was applied. */
  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      if (!parsed.ok || current.complete) return false;

      const steps = parsed.value.steps;
      const expected = steps[current.stepIndex];
      if (!expected) return false;

      // chess.js decides whether the move is legal at all.
      const game = new Chess(current.fen);
      const isLegal = game
        .moves({ square: from, verbose: true })
        .some((move) => move.to === to);
      if (!isLegal) return false;

      // Legal but not the expected move: keep the position and allow a retry.
      if (from !== expected.from || to !== expected.to) {
        setState({
          ...current,
          runKey,
          feedback: 'wrong',
          wrongAttempts: current.wrongAttempts + 1,
        });
        return false;
      }

      game.move({ from, to, promotion: expected.promotion });
      let stepIndex = current.stepIndex + 1;
      let lastMove: LastMove = { from, to };

      const reply = steps[stepIndex];
      if (reply?.actor === 'scripted') {
        game.move({
          from: reply.from,
          to: reply.to,
          promotion: reply.promotion,
        });
        lastMove = { from: reply.from as Square, to: reply.to as Square };
        stepIndex += 1;
      }

      const complete = stepIndex >= steps.length;
      const callback = onCompleteRef.current;
      const willSave =
        complete && Boolean(callback) && completedRunKeyRef.current !== runKey;

      setState({
        ...current,
        runKey,
        fen: game.fen(),
        stepIndex,
        lastMove,
        feedback: 'correct',
        complete,
        saveStatus: willSave ? 'saving' : 'idle',
        saveError: null,
      });

      if (willSave && callback) {
        completedRunKeyRef.current = runKey;
        void startSave(runKey, { piece, lessonNumber }, callback);
      }
      return true;
    },
    [current, lessonNumber, parsed, piece, runKey, startSave],
  );

  /** Starts a new attempt. A late save result from the old one is ignored. */
  const reset = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  let phase: ExercisePhase = 'learner-turn';
  if (!parsed.ok) phase = 'error';
  else if (current.complete) phase = 'complete';

  return {
    position: current.fen,
    orientation:
      parsed.ok && parsed.value.learnerColor === 'b'
        ? ('black' as const)
        : ('white' as const),
    lastMove: current.lastMove,
    phase,
    feedback: current.feedback,
    wrongAttempts: current.wrongAttempts,
    error: parsed.ok ? null : { code: parsed.code, message: parsed.message },
    inputDisabled: phase !== 'learner-turn',
    saveStatus: current.saveStatus,
    saveError: current.saveError,
    makeMove,
    reset,
  };
}
