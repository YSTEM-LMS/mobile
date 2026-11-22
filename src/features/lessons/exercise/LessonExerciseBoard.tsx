import { StyleSheet, View } from 'react-native';

import { ChessBoard_component } from '@/components/chess/Chessboard-component';
import { InlineError } from '@/components/feedback/InlineError';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { palette, radii, spacing } from '@/design/tokens';
import type { LessonRequest } from '@/features/lessons/api/lesson.types';

import { useLessonExercise } from './useLessonExercise';

type LessonExerciseBoardProps = {
  lesson: LessonRequest;
  startFen: string;
  solution: string | null | undefined;
  /** Called once per successful attempt. May be async (saving). */
  onComplete?: (lesson: LessonRequest) => unknown;
};

/**
 * The shared chessboard driven by useLessonExercise. The computer game uses
 * the same board with useComputerGame. Only the controller differs.
 */
export function LessonExerciseBoard({
  lesson,
  startFen,
  solution,
  onComplete,
}: LessonExerciseBoardProps) {
  const exercise = useLessonExercise({
    lesson,
    startFen,
    solution,
    onComplete,
  });
  const isComplete = exercise.phase === 'complete';
  const isPlaying = exercise.phase === 'learner-turn';

  return (
    <View style={styles.container}>
      <View style={styles.boardWrap}>
        <ChessBoard_component
          fen={exercise.position}
          orientation={exercise.orientation}
          disabled={exercise.inputDisabled}
          onMove={exercise.makeMove}
          lastMove={exercise.lastMove ?? undefined}
        />
      </View>

      <View accessibilityLiveRegion="polite" style={styles.feedback}>
        {/* A lesson with no solution stays a read-only board, with no error. */}
        {exercise.error && exercise.error.code !== 'MISSING_SOLUTION' && (
          <InlineError
            title="Exercise unavailable"
            message={exercise.error.message}
          />
        )}
        {isPlaying && exercise.feedback === 'wrong' && (
          <AppText variant="bodyStrong">Not quite. Try again.</AppText>
        )}
        {isPlaying && exercise.feedback === 'correct' && (
          <AppText variant="bodyStrong">Correct! Keep going.</AppText>
        )}
        {isComplete && (
          <AppText variant="bodyStrong">Correct! Exercise complete.</AppText>
        )}
        {isComplete && exercise.saveStatus === 'saving' && (
          <AppText>Saving your progress…</AppText>
        )}
        {isComplete && exercise.saveStatus === 'saved' && (
          <AppText>Progress saved.</AppText>
        )}
        {isComplete && exercise.saveStatus === 'failed' && (
          <InlineError
            title="Progress not saved"
            message={exercise.saveError ?? 'Your progress could not be saved.'}
          />
        )}
        {isComplete && (
          <Button variant="secondary" onPress={exercise.reset}>
            Try again
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  // Same dark wrapper as the computer-game screen: the board's labels are
  // light-coloured and need a dark surface behind them.
  boardWrap: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: palette.ink,
  },
  feedback: { gap: spacing.sm },
});
