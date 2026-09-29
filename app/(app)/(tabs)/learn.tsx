/**
 * learn.tsx — Chess Lessons Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { router } from 'expo-router';
import { useRef, useState } from 'react';
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

type LessonStatus = 'done' | 'available' | 'locked';

type Piece = {
  id: string;
  emoji: string;
  name: string;
  mastered: number;
  total: number;
};

type Lesson = {
  id: string;
  title: string;
  duration: string;
  status: LessonStatus;
  xp: number;
};

const PIECES: Piece[] = [
  { id: 'pawn', emoji: '♙', name: 'Pawn', mastered: 3, total: 3 },
  { id: 'knight', emoji: '♞', name: 'Knight', mastered: 2, total: 4 },
  { id: 'bishop', emoji: '♝', name: 'Bishop', mastered: 0, total: 3 },
  { id: 'rook', emoji: '♜', name: 'Rook', mastered: 0, total: 3 },
  { id: 'queen', emoji: '♛', name: 'Queen', mastered: 0, total: 4 },
  { id: 'king', emoji: '♚', name: 'King', mastered: 0, total: 2 },
];

const LESSONS_BY_PIECE: Record<string, Lesson[]> = {
  pawn: [
    {
      id: 'p1',
      title: "The Pawn's First Move",
      duration: '3 min',
      status: 'done',
      xp: 25,
    },
    {
      id: 'p2',
      title: 'Pawn Captures',
      duration: '4 min',
      status: 'done',
      xp: 25,
    },
    {
      id: 'p3',
      title: 'En Passant & Promotion',
      duration: '5 min',
      status: 'done',
      xp: 50,
    },
  ],
  knight: [
    {
      id: 'k1',
      title: 'The L-Shape Move',
      duration: '4 min',
      status: 'done',
      xp: 25,
    },
    {
      id: 'k2',
      title: 'Knight Forks',
      duration: '5 min',
      status: 'done',
      xp: 30,
    },
    {
      id: 'k3',
      title: 'Knight Outposts',
      duration: '6 min',
      status: 'available',
      xp: 35,
    },
    {
      id: 'k4',
      title: 'Knight vs Bishop',
      duration: '7 min',
      status: 'locked',
      xp: 40,
    },
  ],
  bishop: [
    {
      id: 'b1',
      title: 'Diagonal Power',
      duration: '3 min',
      status: 'available',
      xp: 25,
    },
    {
      id: 'b2',
      title: 'The Bishop Pair',
      duration: '5 min',
      status: 'locked',
      xp: 30,
    },
    {
      id: 'b3',
      title: 'Good vs Bad Bishop',
      duration: '6 min',
      status: 'locked',
      xp: 35,
    },
  ],
  rook: [
    {
      id: 'r1',
      title: 'Open File Strategy',
      duration: '4 min',
      status: 'available',
      xp: 25,
    },
    {
      id: 'r2',
      title: 'The Seventh Rank',
      duration: '5 min',
      status: 'locked',
      xp: 30,
    },
    {
      id: 'r3',
      title: 'Rook Endgames',
      duration: '8 min',
      status: 'locked',
      xp: 50,
    },
  ],
  queen: [
    {
      id: 'q1',
      title: 'The Most Powerful Piece',
      duration: '4 min',
      status: 'available',
      xp: 25,
    },
    {
      id: 'q2',
      title: 'Queen Attacks',
      duration: '5 min',
      status: 'locked',
      xp: 30,
    },
    {
      id: 'q3',
      title: 'Queen & Pawn Endgames',
      duration: '7 min',
      status: 'locked',
      xp: 40,
    },
    {
      id: 'q4',
      title: 'The Queen Sacrifice',
      duration: '6 min',
      status: 'locked',
      xp: 50,
    },
  ],
  king: [
    {
      id: 'kg1',
      title: 'King Safety & Castling',
      duration: '5 min',
      status: 'available',
      xp: 30,
    },
    {
      id: 'kg2',
      title: 'King in the Endgame',
      duration: '7 min',
      status: 'locked',
      xp: 40,
    },
  ],
};

const STATUS_META: Record<
  LessonStatus,
  { icon: string; color: string; bg: string }
> = {
  done: { icon: '✓', color: palette.brandGreen, bg: palette.backgroundSoft },
  available: { icon: '▶', color: palette.ink, bg: palette.surface },
  locked: { icon: '🔒', color: palette.muted, bg: palette.surface },
};

export default function LearnRoute() {
  const [selectedPiece, setSelectedPiece] = useState('knight');
  const scrollRef = useRef<ScrollView>(null);

  const lessons = LESSONS_BY_PIECE[selectedPiece] ?? [];
  const totalMastered = PIECES.filter((p) => p.mastered === p.total).length;
  const totalPieces = PIECES.length;

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerSup}>CHESS ACADEMY</Text>
          <Text style={s.headerTitle}>Your Learning Path</Text>
        </View>
        <View style={s.progressPill}>
          <Text style={s.progressPillText}>
            {totalMastered}/{totalPieces} mastered
          </Text>
        </View>
      </View>

      {/* ── Progress Bar ───────────────────────── */}
      <View style={s.progressTrack}>
        <Animated.View
          style={[
            s.progressFill,
            { width: `${(totalMastered / totalPieces) * 100}%` as any },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {/* ── Piece Selector ─────────────────────── */}
        <Text style={s.subLabel}>Choose a piece to study</Text>
        <ScrollView
          horizontal
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.pieces}
        >
          {PIECES.map((piece) => {
            const isSelected = selectedPiece === piece.id;
            const isDone = piece.mastered === piece.total;
            const progress = piece.total > 0 ? piece.mastered / piece.total : 0;

            return (
              <Pressable
                key={piece.id}
                onPress={() => setSelectedPiece(piece.id)}
                style={[s.pieceCard, isSelected && s.pieceCardSelected]}
              >
                {/* Completion ring indicator */}
                {isDone && (
                  <View style={s.pieceCheck}>
                    <Text style={s.pieceCheckIcon}>✓</Text>
                  </View>
                )}
                <Text style={[s.pieceEmoji, !isSelected && { opacity: 0.7 }]}>
                  {piece.emoji}
                </Text>
                <Text style={[s.pieceName, isSelected && s.pieceNameSelected]}>
                  {piece.name}
                </Text>
                <View style={s.pieceMeta}>
                  <View style={s.pieceBar}>
                    <View
                      style={[
                        s.pieceBarFill,
                        {
                          width: `${progress * 100}%` as any,
                          backgroundColor: isDone
                            ? palette.brandGreen
                            : palette.accentYellow,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[s.pieceCount, isSelected && s.pieceCountSelected]}
                  >
                    {piece.mastered}/{piece.total}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Lesson List ────────────────────────── */}
        <View style={s.lessonsHeader}>
          <Text style={s.subLabel}>
            {PIECES.find((p) => p.id === selectedPiece)?.name} Lessons
          </Text>
          <Text style={s.lessonsCount}>
            {lessons.filter((l) => l.status === 'done').length}/{lessons.length}{' '}
            done
          </Text>
        </View>

        <View style={s.lessonList}>
          {lessons.map((lesson, i) => {
            const meta = STATUS_META[lesson.status];
            const isAvailable = lesson.status !== 'locked';

            return (
              <Pressable
                key={lesson.id}
                disabled={!isAvailable}
                onPress={() =>
                  router.push({
                    pathname: '/lesson-detail',
                    params: { id: lesson.id, piece: selectedPiece },
                  } as never)
                }
                style={({ pressed }) => [
                  s.lessonRow,
                  i < lessons.length - 1 && s.lessonRowBorder,
                  !isAvailable && s.lessonRowLocked,
                  pressed && isAvailable && s.lessonRowPressed,
                ]}
              >
                {/* Step number / status indicator */}
                <View
                  style={[
                    s.lessonStatus,
                    {
                      backgroundColor: meta.bg,
                      borderColor:
                        lesson.status === 'done'
                          ? palette.brandGreen
                          : palette.border,
                    },
                  ]}
                >
                  <Text style={[s.lessonStatusIcon, { color: meta.color }]}>
                    {meta.icon}
                  </Text>
                </View>

                <View style={s.lessonContent}>
                  <Text
                    style={[s.lessonTitle, !isAvailable && s.lessonTitleLocked]}
                  >
                    {lesson.title}
                  </Text>
                  <View style={s.lessonMeta}>
                    <Text style={s.lessonDuration}>⏱ {lesson.duration}</Text>
                    <View style={s.lessonXPBadge}>
                      <Text style={s.lessonXPText}>+{lesson.xp} XP</Text>
                    </View>
                  </View>
                </View>

                {isAvailable && <Text style={s.lessonArrow}>›</Text>}
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* ── CTA Footer ─────────────────────────── */}
      {(() => {
        const nextLesson = lessons.find((l) => l.status === 'available');
        if (!nextLesson) return null;
        return (
          <View style={s.footer}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/lesson-detail',
                  params: { id: nextLesson.id, piece: selectedPiece },
                } as never)
              }
              style={({ pressed }) => [s.ctaBtn, pressed && s.ctaBtnPressed]}
            >
              <Text style={s.ctaBtnText}>Continue: {nextLesson.title} →</Text>
            </Pressable>
          </View>
        );
      })()}
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
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
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
  progressPill: {
    backgroundColor: `${palette.brandGreen}20`,
    borderWidth: 1,
    borderColor: `${palette.brandGreen}40`,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  progressPillText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },

  /* Progress bar */
  progressTrack: {
    height: 3,
    backgroundColor: palette.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
  },

  subLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  /* Piece cards */
  pieces: { gap: spacing.sm, paddingBottom: spacing.xs },
  pieceCard: {
    width: 88,
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: palette.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOW,
  },
  pieceCardSelected: {
    borderColor: palette.brandGreen,
    backgroundColor: palette.backgroundSoft,
  },
  pieceCheck: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieceCheckIcon: {
    fontSize: 9,
    color: palette.white,
    fontWeight: fontWeights.bold,
  },
  pieceEmoji: { fontSize: 28 },
  pieceName: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.muted,
  },
  pieceNameSelected: { color: palette.ink },
  pieceMeta: { width: '100%', gap: 2, alignItems: 'center' },
  pieceBar: {
    width: '100%',
    height: 3,
    backgroundColor: palette.border,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  pieceBarFill: { height: '100%', borderRadius: radii.pill },
  pieceCount: { fontSize: 9, color: palette.muted },
  pieceCountSelected: { color: palette.gray },

  /* Lesson list */
  lessonsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  lessonsCount: { fontSize: fontSizes.caption, color: palette.muted },
  lessonList: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...SHADOW,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  lessonRowBorder: { borderBottomWidth: 1, borderBottomColor: palette.border },
  lessonRowLocked: { opacity: 0.5 },
  lessonRowPressed: { backgroundColor: palette.backgroundSoft },
  lessonStatus: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonStatusIcon: { fontSize: 13, fontWeight: fontWeights.bold },
  lessonContent: { flex: 1, gap: 3 },
  lessonTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },
  lessonTitleLocked: { color: palette.muted },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lessonDuration: { fontSize: fontSizes.caption, color: palette.muted },
  lessonXPBadge: {
    backgroundColor: `${palette.accentYellow}33`,
    paddingVertical: 1,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
  },
  lessonXPText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  lessonArrow: { fontSize: fontSizes.heading, color: palette.muted },

  /* Footer CTA */
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  ctaBtn: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnPressed: { opacity: 0.85 },
  ctaBtnText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
});
