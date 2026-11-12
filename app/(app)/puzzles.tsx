/**
 * puzzles.tsx — Puzzles Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

// React state tracks which puzzle in the loaded batch is selected.
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Reuse the shared chessboard
import { ChessBoard_component } from '@/components/chess/Chessboard-component';
import { theme } from '@/design/theme';
import {
  fontSizes,
  fontWeights,
  palette,
  radii,
  spacing,
} from '@/design/tokens';
// The hook handles loading puzzles, errors, caching, and refetching.
import { useRandomPuzzles } from '@/features/puzzles/useRandomPuzzles';

// Displays one label/value pair, such as Rating: 1200.
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// Displays a group of tags, or nothing if there are no tags.
function Tags({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <View style={s.tagSection}>
      <Text style={s.sectionLabel}>{title}</Text>
      <View style={s.themes}>
        {/** Create one pill for each theme or opening tag. */}
        {values.map((value, index) => (
          <View key={`${value}-${index}`} style={s.themePill}>
            <Text style={s.themeText}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Main Puzzle screen
// Displays data but does not play or grade moves.
export default function PuzzlesRoute() {
  // Which puzzle to show from the batch (starting with the first).
  const [currentIndex, setCurrentIndex] = useState(0);
  // Fetch validated puzzles through the existing data layer, not directly with fetch().
  const { puzzles, isLoading, isError, error, isRefetching, refetch } =
    useRandomPuzzles();

  // Use 0 while no batch is available, and keep the index inside the batch.
  const count = puzzles?.length ?? 0;
  const activeIndex = Math.min(currentIndex, Math.max(count - 1, 0));
  // Only show a puzzle when the hook is not loading or reporting an error.
  const puzzle = !isLoading && !isError ? puzzles?.[activeIndex] : undefined;

  // The recorded first move belongs to the opponent, so the preview faces the student.
  const boardOrientation =
    puzzle?.fen.trim().split(/\s+/)[1] === 'w' ? 'black' : 'white';

  // Request a fresh batch. After success, show its first puzzle.
  async function handleRefetch() {
    const result = await refetch();
    if (result.isSuccess) {
      setCurrentIndex(0);
    }
  }

  // Move through the current batch, or request more when it is exhausted.
  function handleNext() {
    if (activeIndex < count - 1) {
      setCurrentIndex(activeIndex + 1);
    } else {
      void handleRefetch();
    }
  }

  // Choose a more specific error heading for malformed backend data.
  const invalidResponse = error?.kind === 'invalid-response';

  return (
    <SafeAreaView style={s.safe}>
      {/* Header: show the current ID only when a puzzle is available. */}
      <View style={s.header}>
        <View style={s.headerSide}>
          {puzzle && (
            <>
              <Text style={s.headerSup}>PUZZLE</Text>
              <Text style={s.headerTitle} numberOfLines={1}>
                #{puzzle.id}
              </Text>
            </>
          )}
        </View>
        <Text style={s.headingCenter}>Puzzles</Text>
        {/* Empty right side keeps the centered title aligned. */}
        <View style={s.headerSide} />
      </View>

      {/* Scrollable body for loading, errors, or puzzle content. */}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Initial loading state. */}
        {isLoading && !isError && (
          <View style={s.statusCard}>
            <ActivityIndicator size="large" color={palette.brandGreen} />
            <Text style={s.statusTitle}>Loading puzzles</Text>
            <Text style={s.statusMessage}>
              Retrieving puzzles from the server…
            </Text>
          </View>
        )}

        {/* Failed request or invalid response, with a retry button. */}
        {!isLoading && isError && (
          <View style={s.statusCard}>
            <Text style={s.statusTitle}>
              {invalidResponse
                ? 'Invalid puzzle data'
                : 'Unable to load puzzles'}
            </Text>
            <Text style={s.statusMessage}>
              {error?.message ??
                'Puzzles could not be loaded. Please try again.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleRefetch()}
              disabled={isRefetching}
              style={({ pressed }) => [
                s.statusButton,
                (pressed || isRefetching) && s.buttonDimmed,
              ]}
            >
              <Text style={s.statusButtonText}>
                {isRefetching ? 'Retrying…' : 'Try Again'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* A successful empty array gives no puzzle to show. */}
        {!isLoading && !isError && !puzzle && (
          <View style={s.statusCard}>
            <Text style={s.statusTitle}>No puzzles available</Text>
            <Text style={s.statusMessage}>
              The server returned an empty puzzle list. Try requesting another
              batch.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleRefetch()}
              disabled={isRefetching}
              style={({ pressed }) => [
                s.statusButton,
                (pressed || isRefetching) && s.buttonDimmed,
              ]}
            >
              <Text style={s.statusButtonText}>
                {isRefetching ? 'Loading…' : 'Load Puzzles'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* A loaded puzzle: read-only position preview and backend metadata. */}
        {puzzle && (
          <>
            <View style={s.boardWrap}>
              {/* The shared board reads the FEN; disabled prevents making moves. */}
              <ChessBoard_component
                key={`${puzzle.id}-${puzzle.fen}`}
                fen={puzzle.fen}
                orientation={boardOrientation}
                disabled
                showLegalMoves={false}
                labels
              />
            </View>
            <Text style={s.previewNote}>
              Read-only starting position, before the opponent’s first move.
            </Text>

            {/* Display only fields actually available on the loaded puzzle. */}
            <View style={s.infoCard}>
              <View style={s.infoHeader}>
                <Text style={s.infoTitle}>Puzzle information</Text>
                <Text style={s.batchCount}>
                  {activeIndex + 1} of {count}
                </Text>
              </View>

              {/* Optional numbers are hidden when undefined. 0 still displays. */}
              <DetailRow label="Puzzle ID" value={puzzle.id} />
              {puzzle.rating !== undefined && (
                <DetailRow label="Rating" value={puzzle.rating} />
              )}
              {puzzle.ratingDeviation !== undefined && (
                <DetailRow
                  label="Rating deviation"
                  value={puzzle.ratingDeviation}
                />
              )}
              {puzzle.popularity !== undefined && (
                <DetailRow label="Popularity" value={puzzle.popularity} />
              )}
              {puzzle.plays !== undefined && (
                <DetailRow label="Times played" value={puzzle.plays} />
              )}

              {/* Only add a divider if at least one tag section is visible. */}
              {(puzzle.themes.length > 0 || puzzle.openingTags.length > 0) && (
                <View style={s.divider} />
              )}
              <Tags title="Themes" values={puzzle.themes} />
              <Tags title="Opening tags" values={puzzle.openingTags} />

              <View style={s.divider} />
              {/* FEN is the position string returned by the backend. */}
              <Text style={s.sectionLabel}>Starting FEN</Text>
              <Text selectable style={s.fenText}>
                {puzzle.fen}
              </Text>
            </View>

            {/* Fetch a new batch, even before reaching the last puzzle. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleRefetch()}
              disabled={isRefetching}
              style={({ pressed }) => [
                s.refreshButton,
                (pressed || isRefetching) && s.buttonDimmed,
              ]}
            >
              <Text style={s.refreshButtonText}>
                {isRefetching ? 'Loading new puzzles…' : 'Get New Batch'}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Footer: advance within this batch or fetch more puzzles. */}
      {puzzle && (
        <View style={s.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            disabled={isRefetching}
            style={({ pressed }) => [
              s.ctaBtn,
              pressed && s.ctaBtnPressed,
              isRefetching && s.buttonDimmed,
            ]}
          >
            {isRefetching ? (
              <ActivityIndicator color={palette.ink} />
            ) : (
              <Text style={s.ctaBtnText}>
                {activeIndex < count - 1
                  ? 'Next Puzzle  ›'
                  : 'Get More Puzzles  ›'}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// Shared shadow settings for cards and the board container.
const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

// Named styles used by the JSX above. Colors and spacing come from design tokens.
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  // Header and screen title.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerSide: { flex: 1, minWidth: 0 },
  headerSup: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  headingCenter: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },

  // Scrollable content and read-only board preview.
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  boardWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: palette.ink,
    padding: spacing.xs,
    ...SHADOW,
  },
  previewNote: {
    fontSize: fontSizes.caption,
    color: palette.muted,
    textAlign: 'center',
  },

  // Puzzle metadata, tag pills, and FEN text.
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.md,
    ...SHADOW,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  batchCount: {
    fontSize: fontSizes.caption,
    color: palette.muted,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: fontSizes.caption,
    color: palette.muted,
  },
  detailValue: {
    flexShrink: 1,
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: palette.border },
  sectionLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.muted,
  },
  tagSection: { gap: spacing.xs },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  themePill: {
    backgroundColor: `${palette.brandGreen}1A`,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: `${palette.brandGreen}40`,
  },
  themeText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },
  fenText: {
    fontSize: fontSizes.caption,
    color: palette.ink,
    fontFamily: 'monospace',
  },

  // Loading, error, empty-result messages, and retry controls.
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...SHADOW,
  },
  statusTitle: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: fontSizes.caption,
    color: palette.gray,
    textAlign: 'center',
  },
  statusButton: {
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusButtonText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  refreshButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.brandGreen,
  },
  buttonDimmed: { opacity: 0.6 },

  // Bottom Next Puzzle / Get More Puzzles button.
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  ctaBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: { backgroundColor: palette.brandGreenPressed },
  ctaBtnText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
});
