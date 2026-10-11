/**
 * lesson-detail.tsx — Lesson Step-Through Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { router, useLocalSearchParams } from 'expo-router';
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

type Step = {
  id: string;
  title: string;
  instruction: string;
  tip?: string;
  highlight?: string;
  piece?: string;
};

const STEPS_BY_PIECE: Record<string, Step[]> = {
  knight: [
    {
      id: '1',
      title: 'The L-Shape Move',
      instruction:
        'The Knight is the only piece that can jump over other pieces. It moves in an "L" shape: two squares in one direction, then one square perpendicular.',
      tip: 'Knights always land on a different color square than they started on!',
      highlight: 'g1',
      piece: '♞',
    },
    {
      id: '2',
      title: 'Power of the Center',
      instruction:
        'From e4, the Knight can jump to f6, g5, g3, f2, d2, c3, c5, or d6 — up to 8 squares from the center!',
      tip: 'Center Knights are more powerful — they control more squares.',
      highlight: 'e4',
      piece: '♞',
    },
    {
      id: '3',
      title: 'Knights at the Edge',
      instruction:
        'At the edge of the board, the Knight loses options. A Knight on a1 can only reach b3 or c2 — just 2 squares!',
      tip: '"A Knight on the rim is dim."',
      highlight: 'a1',
      piece: '♞',
    },
    {
      id: '4',
      title: 'The Fork',
      instruction:
        'Knights excel at creating "forks" — attacking two pieces at once. Because of their L-shape, opponents often miss the threat!',
      tip: 'Look for Knight forks against the King and Rook — a "royal fork".',
      piece: '♞',
    },
  ],
  pawn: [
    {
      id: '1',
      title: 'The First Move',
      instruction:
        'Pawns normally move one square forward, but on their first move they can advance two squares. They capture diagonally.',
      tip: 'Moving two squares on the first move can help control the center faster.',
      highlight: 'e2',
      piece: '♙',
    },
    {
      id: '2',
      title: 'Pawn Captures',
      instruction:
        'A pawn captures diagonally one square forward. This means a pawn on e4 can capture on d5 or f5.',
      tip: 'Unlike other pieces, pawns cannot capture straight forward!',
      highlight: 'e4',
      piece: '♙',
    },
    {
      id: '3',
      title: 'En Passant',
      instruction:
        "If an opponent's pawn advances two squares and lands beside your pawn, you can capture it as if it had only moved one square. This is called en passant.",
      tip: "En passant must be made immediately — you can't wait for the next move.",
      piece: '♙',
    },
  ],
  rook: [
    {
      id: '1',
      title: 'Open File Strategy',
      instruction:
        'Rooks are most powerful on open files — columns with no pawns blocking them. Rooks on the 7th rank are especially strong.',
      tip: 'Connect your rooks by castling and clearing the back rank.',
      highlight: 'a1',
      piece: '♜',
    },
    {
      id: '2',
      title: 'The 7th Rank',
      instruction:
        "A rook on the 7th rank attacks the opponent's pawns and restricts their king. Two rooks on the 7th rank can even deliver checkmate!",
      tip: 'Rooks on the 7th rank are often worth more than a bishop or knight.',
      highlight: 'a7',
      piece: '♜',
    },
  ],
};

const DEFAULT_STEPS: Step[] = [
  {
    id: '1',
    title: 'Introduction',
    instruction:
      'This lesson will walk you through the key concepts step by step. Follow along on the board above.',
    tip: 'Practice each concept before moving on for best results.',
    piece: '♟',
  },
];

function ChessBoard({
  highlight,
  piece,
}: {
  highlight?: string;
  piece?: string;
}) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  return (
    <View style={b.board}>
      {/* Rank labels */}
      <View style={b.labels}>
        {ranks.map((r) => (
          <Text key={r} style={b.rankLabel}>
            {r}
          </Text>
        ))}
      </View>
      <View style={b.grid}>
        {ranks.map((rank) => (
          <View key={rank} style={b.row}>
            {files.map((file, fi) => {
              const sq = `${file}${rank}`;
              const isHl = sq === highlight;
              return (
                <View
                  key={sq}
                  style={[
                    b.square,
                    (fi + rank) % 2 === 0 ? b.light : b.dark,
                    isHl && b.highlight,
                  ]}
                >
                  {isHl && piece && <Text style={b.piece}>{piece}</Text>}
                </View>
              );
            })}
          </View>
        ))}
        {/* File labels row */}
        <View style={b.fileRow}>
          {files.map((f) => (
            <Text key={f} style={b.fileLabel}>
              {f}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function LessonDetailRoute() {
  const { piece = 'knight' } = useLocalSearchParams<{
    piece: string;
    id: string;
  }>();
  const steps = STEPS_BY_PIECE[piece as string] ?? DEFAULT_STEPS;
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = (step + 1) / steps.length;

  const [fadeAnim] = useState(() => new Animated.Value(1));

  const navigate = (nextStep: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(nextStep);
  };

  const handleNext = () => {
    if (isLast) {
      setCompleted(true);
    } else {
      navigate(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
    } else {
      navigate(step - 1);
    }
  };

  const pieceName =
    (piece as string).charAt(0).toUpperCase() + (piece as string).slice(1);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Top Bar ────────────────────────────── */}
      <View style={s.topBar}>
        <Pressable
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <View style={s.topCenter}>
          <Text style={s.topSup}>{pieceName} Lesson</Text>
          <Text style={s.topTitle} numberOfLines={1}>
            {current?.title}
          </Text>
        </View>
        <View style={s.stepBadge}>
          <Text style={s.stepText}>
            {step + 1}/{steps.length}
          </Text>
        </View>
      </View>

      {/* ── Progress Bar ───────────────────────── */}
      <View style={s.progressTrack}>
        <Animated.View
          style={[s.progressFill, { width: `${progress * 100}%` as any }]}
        />
      </View>

      {/* ── Step Dots ──────────────────────────── */}
      <View style={s.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[s.dot, i === step && s.dotActive, i < step && s.dotDone]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Board ──────────────────────────────── */}
        <View style={s.boardWrap}>
          <ChessBoard highlight={current?.highlight} piece={current?.piece} />
        </View>

        {/* ── Content ────────────────────────────── */}
        <Animated.View style={[s.panel, { opacity: fadeAnim }]}>
          {!completed ? (
            <>
              <View style={s.pieceBadge}>
                <Text style={s.pieceBadgeEmoji}>{current?.piece ?? '♟'}</Text>
                <Text style={s.pieceBadgeName}>{pieceName}</Text>
                <View style={s.pieceBadgePill}>
                  <Text style={s.pieceBadgePillText}>Step {step + 1}</Text>
                </View>
              </View>
              <Text style={s.instruction}>{current?.instruction}</Text>
              {current?.tip && (
                <View style={s.tip}>
                  <Text style={s.tipHeader}>💡 TIP</Text>
                  <Text style={s.tipText}>{current.tip}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={s.completion}>
              <Text style={s.completionTrophy}>🏆</Text>
              <Text style={s.completionTitle}>Lesson Complete!</Text>
              <Text style={s.completionBody}>
                You’ve mastered the {pieceName} fundamentals. Keep practicing!
              </Text>
              <View style={s.xpBadge}>
                <Text style={s.xpText}>+50 XP</Text>
              </View>
            </View>
          )}
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── Footer Controls ────────────────────── */}
      <View style={s.footer}>
        {!completed ? (
          <View style={s.controls}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                s.backButton,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={s.backButtonText}>
                {step === 0 ? 'Exit' : '‹  Back'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                s.nextButton,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={s.nextButtonText}>
                {isLast ? 'Finish  ✓' : 'Next  ›'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              s.doneButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={s.doneButtonText}>Back to Lessons →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const b = StyleSheet.create({
  board: { flexDirection: 'row', flex: 1 },
  labels: {
    justifyContent: 'space-around',
    paddingVertical: 1,
    paddingRight: 4,
    paddingBottom: 18,
  },
  rankLabel: {
    fontSize: 9,
    color: palette.muted,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    height: '12.5%' as any,
    lineHeight: 0,
  },
  grid: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: '#F0D9B5' },
  dark: { backgroundColor: '#B58863' },
  highlight: { backgroundColor: 'rgba(127,204,38,0.55)' },
  piece: { fontSize: 20 },
  fileRow: { flexDirection: 'row', height: 16 },
  fileLabel: {
    flex: 1,
    fontSize: 9,
    color: palette.muted,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
});

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 10,
  elevation: 3,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  backArrow: { fontSize: fontSizes.heading, color: palette.ink, marginTop: -2 },
  topCenter: { flex: 1, alignItems: 'center', gap: 1 },
  topSup: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  topTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  stepBadge: {
    backgroundColor: palette.ink,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  stepText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },

  /* Progress */
  progressTrack: {
    height: 4,
    backgroundColor: palette.border,
    marginHorizontal: spacing.lg,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
  },

  /* Dots */
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.border,
  },
  dotActive: { width: 20, backgroundColor: palette.brandGreen },
  dotDone: { backgroundColor: palette.brandGreenSoft },

  /* Board */
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  boardWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    ...SHADOW,
  },

  /* Panel */
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...SHADOW,
  },
  pieceBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pieceBadgeEmoji: { fontSize: 22 },
  pieceBadgeName: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  pieceBadgePill: {
    backgroundColor: `${palette.brandGreen}1A`,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    marginLeft: 'auto',
  },
  pieceBadgePillText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },
  instruction: { fontSize: fontSizes.body, color: palette.ink, lineHeight: 26 },
  tip: {
    backgroundColor: `${palette.accentYellow}22`,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.accentYellow,
    padding: spacing.md,
    gap: spacing.xs,
  },
  tipHeader: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tipText: { fontSize: fontSizes.caption, color: palette.ink, lineHeight: 20 },

  /* Completion */
  completion: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  completionTrophy: { fontSize: 64 },
  completionTitle: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  completionBody: {
    fontSize: fontSizes.body,
    color: palette.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  xpBadge: {
    backgroundColor: palette.accentYellow,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
  },
  xpText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
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
  controls: { flexDirection: 'row', gap: spacing.sm },
  backButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },
  nextButton: {
    flex: 2,
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  doneButton: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
});
