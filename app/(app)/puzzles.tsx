/**
 * puzzles.tsx — Daily Puzzles Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/design/theme';
import {
  fontSizes,
  fontWeights,
  palette,
  radii,
  spacing,
} from '@/design/tokens';

type PuzzleState = 'solving' | 'correct' | 'incorrect';

type Puzzle = {
  id: number;
  rating: number;
  themes: string[];
  hint: string;
  description: string;
  solution: string;
};

const PUZZLE: Puzzle = {
  id: 4821,
  rating: 1287,
  themes: ['Fork', 'Knight', 'Intermediate'],
  hint: 'Look for a Knight move that attacks two pieces at once.',
  description: 'White to move. Find the Knight fork that wins material.',
  solution: 'Nd5 — forks the Queen on c7 and Rook on e7',
};

function ChessBoard({ state }: { state: PuzzleState }) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  const overlayColor =
    state === 'correct'
      ? 'rgba(127,204,38,0.18)'
      : state === 'incorrect'
        ? 'rgba(214,69,69,0.18)'
        : null;

  return (
    <View style={b.board}>
      {/* Grid */}
      {ranks.map((rank) => (
        <View key={rank} style={b.row}>
          {files.map((file, fi) => (
            <View
              key={file + rank}
              style={[(fi + rank) % 2 === 0 ? b.light : b.dark]}
            />
          ))}
        </View>
      ))}

      {/* Result overlay */}
      {overlayColor && (
        <View style={[b.overlay, { backgroundColor: overlayColor }]}>
          <Text style={b.overlayIcon}>{state === 'correct' ? '✓' : '✗'}</Text>
        </View>
      )}

      {/* Turn indicator */}
      <View style={b.turnChip}>
        <View style={b.turnDot} />
        <Text style={b.turnText}>White to move</Text>
      </View>
    </View>
  );
}

export default function PuzzlesRoute() {
  const [state, setState] = useState<PuzzleState>('solving');
  const [hintShown, setHintShown] = useState(false);
  const [streak, setStreak] = useState(5);
  const [solutionShown, setSolutionShown] = useState(false);

  const [resultScale] = useState(() => new Animated.Value(0));

  const showResult = (newState: 'correct' | 'incorrect') => {
    setState(newState);
    Animated.spring(resultScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 12,
    }).start();
    if (newState === 'correct') {
      setStreak((n) => n + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNew = () => {
    resultScale.setValue(0);
    setState('solving');
    setHintShown(false);
    setSolutionShown(false);
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSup}>PUZZLE</Text>
          <Text style={s.headerTitle}>#{PUZZLE.id}</Text>
        </View>
        <Text style={s.headingCenter}>Puzzles</Text>
        <Pressable style={s.streakChip}>
          <Text style={s.streakFire}>🔥</Text>
          <Text style={s.streakCount}>{streak}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Board ──────────────────────────────── */}
        <View style={s.boardWrap}>
          <ChessBoard state={state} />
        </View>

        {/* ── Result Banner ──────────────────────── */}
        {state !== 'solving' && (
          <Animated.View
            style={[
              s.resultBanner,
              state === 'correct' ? s.resultBannerCorrect : s.resultBannerWrong,
              { transform: [{ scale: resultScale }] },
            ]}
          >
            <Text style={s.resultIcon}>
              {state === 'correct' ? '🎉' : '😕'}
            </Text>
            <View style={s.resultContent}>
              <Text style={s.resultTitle}>
                {state === 'correct' ? 'Brilliant!' : 'Not quite'}
              </Text>
              <Text style={s.resultSub}>
                {state === 'correct'
                  ? `+10 bonus XP · Streak: ${streak} 🔥`
                  : 'Keep going — every attempt teaches you something.'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Solution (after wrong) ─────────────── */}
        {state === 'incorrect' && !solutionShown && (
          <Pressable
            onPress={() => setSolutionShown(true)}
            style={({ pressed }) => [
              s.solutionToggle,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={s.solutionToggleText}>Show Solution</Text>
          </Pressable>
        )}
        {state === 'incorrect' && solutionShown && (
          <View style={s.solutionCard}>
            <Text style={s.solutionHeader}>✓ SOLUTION</Text>
            <Text style={s.solutionText}>{PUZZLE.solution}</Text>
          </View>
        )}

        {/* ── Info Panel ─────────────────────────── */}
        <View style={s.infoCard}>
          {/* Rating + Description */}
          <View style={s.infoTop}>
            <View style={s.ratingBox}>
              <Text style={s.ratingLabel}>Rating</Text>
              <Text style={s.ratingValue}>{PUZZLE.rating}</Text>
            </View>
            <Text style={s.desc}>{PUZZLE.description}</Text>
          </View>

          <View style={s.divider} />

          {/* Theme pills */}
          <View style={s.themes}>
            {PUZZLE.themes.map((t) => (
              <View key={t} style={s.themePill}>
                <Text style={s.themeText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={s.divider} />

          {/* Hint */}
          {hintShown ? (
            <View style={s.hintCard}>
              <Text style={s.hintHeader}>💡 HINT</Text>
              <Text style={s.hintText}>{PUZZLE.hint}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setHintShown(true)}
              style={({ pressed }) => [s.hintBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.hintBtnText}>💡 Show Hint (−5 pts)</Text>
            </Pressable>
          )}
        </View>

        {/* ── Dev Simulate Row ───────────────────── */}
        {state === 'solving' && (
          <View style={s.devRow}>
            <View style={s.devDivider}>
              <View style={s.devLine} />
              <Text style={s.devLabel}>DEV ONLY</Text>
              <View style={s.devLine} />
            </View>
            <View style={s.devBtns}>
              <Pressable
                onPress={() => showResult('correct')}
                style={({ pressed }) => [
                  s.devBtn,
                  s.devBtnCorrect,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={s.devBtnText}>✓ Correct</Text>
              </Pressable>
              <Pressable
                onPress={() => showResult('incorrect')}
                style={({ pressed }) => [
                  s.devBtn,
                  s.devBtnWrong,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.devBtnText, { color: palette.error }]}>
                  ✗ Wrong
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── Footer CTA ─────────────────────────── */}
      <View style={s.footer}>
        <Pressable
          onPress={handleNew}
          style={({ pressed }) => [s.ctaBtn, pressed && s.ctaBtnPressed]}
        >
          <Text style={s.ctaBtnText}>
            {state === 'solving' ? 'Skip  ›' : 'Next Puzzle  ›'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const b = StyleSheet.create({
  board: { width: '100%', aspectRatio: 1, position: 'relative' },
  row: { flex: 1, flexDirection: 'row' },
  light: { flex: 1, backgroundColor: '#F0D9B5' },
  dark: { flex: 1, backgroundColor: '#B58863' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayIcon: { fontSize: 72, opacity: 0.8 },
  turnChip: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  turnDot: {
    width: 9,
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  turnText: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
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
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: `${palette.accentYellow}33`,
    borderWidth: 1,
    borderColor: palette.accentYellow,
    borderRadius: radii.pill,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  streakFire: { fontSize: 15 },
  streakCount: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },

  /* Board */
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  boardWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    ...SHADOW,
  },

  /* Result banner */
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  resultBannerCorrect: {
    backgroundColor: `${palette.brandGreen}1A`,
    borderColor: palette.brandGreen,
  },
  resultBannerWrong: {
    backgroundColor: palette.errorBackground,
    borderColor: palette.error,
  },
  resultIcon: { fontSize: 28 },
  resultContent: { flex: 1, gap: 2 },
  resultTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  resultSub: { fontSize: fontSizes.caption, color: palette.gray },

  solutionToggle: { alignItems: 'center', paddingVertical: spacing.xs },
  solutionToggleText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.brandGreen,
  },
  solutionCard: {
    backgroundColor: `${palette.brandGreen}15`,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.brandGreen,
    padding: spacing.md,
    gap: spacing.xs,
  },
  solutionHeader: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  solutionText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },

  /* Info card */
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.md,
    ...SHADOW,
  },
  infoTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ratingBox: {
    backgroundColor: theme.colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 70,
    gap: 2,
    borderWidth: 1,
    borderColor: palette.border,
  },
  ratingLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratingValue: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },
  desc: {
    flex: 1,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
    lineHeight: 22,
  },
  divider: { height: 1, backgroundColor: palette.border },
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
  hintCard: {
    backgroundColor: `${palette.accentYellow}22`,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.accentYellow,
    padding: spacing.md,
    gap: spacing.xs,
  },
  hintHeader: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  hintText: { fontSize: fontSizes.caption, color: palette.ink, lineHeight: 20 },
  hintBtn: {
    backgroundColor: `${palette.accentYellow}1A`,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${palette.accentYellow}80`,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  hintBtnText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },

  /* Dev section */
  devRow: { gap: spacing.sm },
  devDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  devLine: { flex: 1, height: 1, backgroundColor: palette.border },
  devLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  devBtns: { flexDirection: 'row', gap: spacing.sm },
  devBtn: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  devBtnCorrect: {
    borderColor: palette.brandGreen,
    backgroundColor: `${palette.brandGreen}10`,
  },
  devBtnWrong: {
    borderColor: palette.error,
    backgroundColor: palette.errorBackground,
  },
  devBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },

  /* Footer */
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
