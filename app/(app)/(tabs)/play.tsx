/**
 * play.tsx — Play vs Computer Setup Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/design/theme';
import {
  fontSizes,
  fontWeights,
  palette,
  radii,
  spacing,
} from '@/design/tokens';

type PieceColor = 'white' | 'black' | 'random';
type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'master';

const COLORS: {
  id: PieceColor;
  emoji: string;
  label: string;
  sub: string;
  bg: string;
  border: string;
  textColor: string;
}[] = [
  {
    id: 'white',
    emoji: '♔',
    label: 'White',
    sub: 'Moves first',
    bg: '#FAFAFA',
    border: '#E0E0E0',
    textColor: palette.ink,
  },
  {
    id: 'black',
    emoji: '♚',
    label: 'Black',
    sub: 'Moves second',
    bg: '#2A2A2A',
    border: '#444444',
    textColor: palette.white,
  },
  {
    id: 'random',
    emoji: '⚄',
    label: 'Random',
    sub: 'Surprise me!',
    bg: palette.backgroundSoft,
    border: palette.brandGreenSoft,
    textColor: palette.ink,
  },
];

const DIFFICULTIES: {
  id: Difficulty;
  emoji: string;
  label: string;
  desc: string;
  level: number;
  color: string;
  bg: string;
}[] = [
  {
    id: 'beginner',
    emoji: '🌱',
    label: 'Beginner',
    desc: 'Learn the basics',
    level: 1,
    color: palette.brandGreen,
    bg: `${palette.brandGreen}1A`,
  },
  {
    id: 'easy',
    emoji: '😊',
    label: 'Easy',
    desc: 'Gentle challenge',
    level: 4,
    color: palette.brandGreenSoft,
    bg: `${palette.brandGreenSoft}33`,
  },
  {
    id: 'medium',
    emoji: '🤔',
    label: 'Medium',
    desc: 'Real thinking',
    level: 8,
    color: palette.accentYellow,
    bg: `${palette.accentYellow}22`,
  },
  {
    id: 'hard',
    emoji: '😤',
    label: 'Hard',
    desc: 'Strong tactics',
    level: 14,
    color: '#FF8C42',
    bg: 'rgba(255,140,66,0.12)',
  },
  {
    id: 'master',
    emoji: '👑',
    label: 'Master',
    desc: 'Near-perfect play',
    level: 20,
    color: palette.error,
    bg: `${palette.error}1A`,
  },
];

export default function PlayRoute() {
  const [color, setColor] = useState<PieceColor>('white');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');

  const chosen = DIFFICULTIES.find((d) => d.id === difficulty)!;
  const chosenColor = COLORS.find((c) => c.id === color)!;

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerSup}>SINGLE PLAYER</Text>
        <Text style={s.headerTitle}>Play vs Computer</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Color Picker ──────────────────────── */}
        <View style={s.section}>
          <Text style={s.subLabel}>Choose your side</Text>
          <View style={s.colorRow}>
            {COLORS.map((c) => (
              <Pressable
                key={c.id}
                accessibilityLabel={`Play as ${c.label}`}
                accessibilityState={{ selected: color === c.id }}
                onPress={() => setColor(c.id)}
                style={[
                  s.colorCard,
                  { backgroundColor: c.bg, borderColor: c.border },
                  color === c.id && s.colorCardSelected,
                ]}
              >
                {color === c.id && (
                  <View
                    style={[
                      s.colorCheck,
                      {
                        backgroundColor:
                          c.id === 'white' ? palette.ink : palette.white,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: fontWeights.bold,
                        color: c.id === 'white' ? palette.white : palette.ink,
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                )}
                <Text style={s.colorEmoji}>{c.emoji}</Text>
                <Text style={[s.colorLabel, { color: c.textColor }]}>
                  {c.label}
                </Text>
                <Text
                  style={[
                    s.colorSub,
                    {
                      color:
                        c.id === 'black'
                          ? 'rgba(255,255,255,0.5)'
                          : palette.muted,
                    },
                  ]}
                >
                  {c.sub}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Difficulty ────────────────────────── */}
        <View style={s.section}>
          <View style={s.diffTitleRow}>
            <Text style={s.subLabel}>Difficulty</Text>
            <View style={[s.diffChosenBadge, { backgroundColor: chosen.bg }]}>
              <Text style={[s.diffChosenText, { color: chosen.color }]}>
                {chosen.emoji} {chosen.label}
              </Text>
            </View>
          </View>

          {DIFFICULTIES.map((d) => (
            <Pressable
              key={d.id}
              accessibilityLabel={`Difficulty: ${d.label}`}
              accessibilityState={{ selected: difficulty === d.id }}
              onPress={() => setDifficulty(d.id)}
              style={[s.diffRow, difficulty === d.id && s.diffRowSelected]}
            >
              {/* Color accent bar on left */}
              <View style={[s.diffAccentBar, { backgroundColor: d.color }]} />

              <Text style={s.diffEmoji}>{d.emoji}</Text>

              <View style={s.diffInfo}>
                <Text
                  style={[
                    s.diffLabel,
                    difficulty === d.id && { color: palette.ink },
                  ]}
                >
                  {d.label}
                </Text>
                <Text style={s.diffDesc}>{d.desc}</Text>
              </View>

              {/* Level dots */}
              <View style={s.diffDots}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      s.diffDot,
                      {
                        backgroundColor:
                          i < DIFFICULTIES.indexOf(d) + 1
                            ? d.color
                            : palette.border,
                      },
                    ]}
                  />
                ))}
              </View>

              {difficulty === d.id && (
                <Text style={[s.diffCheck, { color: d.color }]}>✓</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* ── Game Summary ──────────────────────── */}
        <View style={s.summary}>
          <Text style={s.summaryTitle}>Game Summary</Text>
          <View style={s.summaryRows}>
            {[
              {
                label: 'Playing as',
                value: `${chosenColor.emoji} ${chosenColor.label}`,
              },
              { label: 'Opponent', value: `🤖 Computer (${chosen.label})` },
              {
                label: 'Engine Lv',
                value: `${chosen.emoji} Level ${chosen.level}`,
              },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[s.summaryRow, i < arr.length - 1 && s.summaryRowBorder]}
              >
                <Text style={s.summaryLabel}>{row.label}</Text>
                <Text style={s.summaryValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── CTA Footer ─────────────────────────── */}
      <View style={s.footer}>
        <Pressable
          accessibilityLabel="Start game"
          onPress={() =>
            router.push({
              pathname: '/play-game',
              params: { color, difficulty },
            } as never)
          }
          style={({ pressed }) => [s.ctaBtn, pressed && s.ctaBtnPressed]}
        >
          <Text style={s.ctaBtnText}>Let’s Play ♟</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  headerSup: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.xl },

  subLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  section: { gap: spacing.xs },

  /* Color picker */
  colorRow: { flexDirection: 'row', gap: spacing.sm },
  colorCard: {
    flex: 1,
    borderRadius: radii.xl,
    borderWidth: 2,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 110,
    justifyContent: 'center',
    ...SHADOW,
  },
  colorCardSelected: { borderColor: palette.brandGreen },
  colorCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorEmoji: { fontSize: 36 },
  colorLabel: { fontSize: fontSizes.label, fontWeight: fontWeights.bold },
  colorSub: { fontSize: fontSizes.caption },

  /* Difficulty list */
  diffTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  diffChosenBadge: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  diffChosenText: { fontSize: fontSizes.caption, fontWeight: fontWeights.bold },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: palette.border,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.sm,
    ...SHADOW,
  },
  diffRowSelected: {
    borderColor: palette.brandGreen,
    backgroundColor: palette.backgroundSoft,
  },
  diffAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  diffEmoji: { fontSize: 22 },
  diffInfo: { flex: 1, gap: 2 },
  diffLabel: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.muted,
  },
  diffDesc: { fontSize: fontSizes.caption, color: palette.muted },
  diffDots: { flexDirection: 'row', gap: 3 },
  diffDot: { width: 6, height: 6, borderRadius: radii.pill },
  diffCheck: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    marginLeft: spacing.xs,
  },

  /* Summary */
  summary: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...SHADOW,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryRows: {},
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: palette.border },
  summaryLabel: { fontSize: fontSizes.caption, color: palette.muted },
  summaryValue: {
    fontSize: fontSizes.label,
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
    letterSpacing: 0.3,
  },
});
