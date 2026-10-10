/**
 * play-game.tsx — Active Chess Game Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
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

import { useChessGame } from '@/components/chess/useChessGame';
import { ChessBoard_component } from '@/components/chess/Chessboard-component';

const STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/*INVALID FEN: "wrong fen lmao"; */

type GameResult = 'win' | 'lose' | 'draw' | null;

const MOVES = [
  { n: 1, w: 'e4', b: 'e5' },
  { n: 2, w: 'Nf3', b: 'Nc6' },
  { n: 3, w: 'Bb5', b: 'a6' },
  { n: 4, w: 'Ba4', b: 'Nf6' },
  { n: 5, w: 'O-O', b: 'Be7' },
  { n: 6, w: 'Re1', b: 'b5' },
  { n: 7, w: 'Bb3' },
];

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '🌱 Beginner',
  easy: '😊 Easy',
  medium: '🤔 Medium',
  hard: '😤 Hard',
  master: '👑 Master',
};


/* function ChessBoard({ playerColor }: { playerColor: string }) {
  const files =
    playerColor === 'white'
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  const ranks =
    playerColor === 'white'
      ? [8, 7, 6, 5, 4, 3, 2, 1]
      : [1, 2, 3, 4, 5, 6, 7, 8];
  const coords =
    playerColor === 'white'
      ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
      : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
  return (
    <View style={b.wrap}>
      
      <View style={b.rankLabels}>
        {ranks.map((r) => (
          <Text key={r} style={b.rankLabel}>
            {r}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {ranks.map((rank) => (
          <View key={rank} style={b.row}>
            {files.map((file, fi) => {
              const isHl =
                (file === 'e' && rank === 4) || (file === 'e' && rank === 5);
              return (
                <View
                  key={file + rank}
                  style={[
                    b.square,
                    (fi + rank) % 2 === 0 ? b.light : b.dark,
                    isHl && b.highlighted,
                  ]}
                />
              );
            })}
          </View>
        ))}

        <View style={b.fileRow}>
          {coords.map((f) => (
            <Text key={f} style={b.fileLabel}>
              {f}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
} */



function PlayerRow({
  label,
  emoji,
  isActive,
  time,
  captured,
}: {
  label: string;
  emoji: string;
  isActive: boolean;
  time: string;
  captured?: string;
}) {
  return (
    <View style={[p.row, isActive && p.rowActive]}>
      <View style={[p.avatar, isActive && p.avatarActive]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={p.info}>
        <Text style={p.name} numberOfLines={1}>
          {label}
        </Text>
        {captured ? (
          <Text style={p.captured}>{captured}</Text>
        ) : (
          <Text style={p.capturedEmpty}>—</Text>
        )}
      </View>
      {isActive && <View style={p.activeDot} />}
      <View style={[p.timer, isActive && p.timerActive]}>
        <Text style={[p.timerText, isActive && p.timerTextActive]}>{time}</Text>
      </View>
    </View>
  );
}

function GameOverModal({
  result,
  onNewGame,
  onExit,
}: {
  result: GameResult;
  onNewGame: () => void;
  onExit: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(0.85));

  useEffect(() => {
    if (result === null) {
      scale.setValue(0.85);
      return;
    }

    const animation = Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 14,
    });
    animation.start();

    return () => animation.stop();
  }, [result, scale]);

  const meta = {
    win: {
      emoji: '🏆',
      title: 'You Win!',
      body: 'Excellent play! You defeated the computer.',
      xp: '+50 XP',
    },
    lose: {
      emoji: '😓',
      title: 'You Lose',
      body: "Don't give up — every loss is a lesson!",
      xp: '+10 XP',
    },
    draw: {
      emoji: '🤝',
      title: 'Draw!',
      body: 'A hard-fought game. Well played by both sides.',
      xp: '+20 XP',
    },
  };

  const m = result ? meta[result] : null;

  return (
    <Modal animationType="fade" transparent visible={result !== null}>
      <View style={mo.overlay}>
        <Animated.View style={[mo.card, { transform: [{ scale }] }]}>
          {m && (
            <>
              <Text style={mo.emoji}>{m.emoji}</Text>
              <Text style={mo.title}>{m.title}</Text>
              <Text style={mo.body}>{m.body}</Text>
              <View style={mo.xpPill}>
                <Text style={mo.xpText}>{m.xp}</Text>
              </View>
              <View style={mo.buttons}>
                <Pressable
                  onPress={onNewGame}
                  style={({ pressed }) => [
                    mo.btn,
                    mo.btnPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[mo.btnText, mo.btnTextPrimary]}>
                    Play Again
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onExit}
                  style={({ pressed }) => [
                    mo.btn,
                    mo.btnSecondary,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={mo.btnText}>Exit</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function PlayGameRoute() {
  const { color = 'white', difficulty = 'beginner' } = useLocalSearchParams<{
    color: string;
    difficulty: string;
  }>();
  const [tutorOpen, setTutorOpen] = useState(true);
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const isPlayerTurn = true;

  const diffLabel = DIFFICULTY_LABEL[difficulty as string] ?? difficulty;

const { position, lastMove, handleMove } = useChessGame(STARTING_FEN);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Dark Header ────────────────────────── */}
      <View style={s.header}>
        <Pressable
          accessibilityLabel="Exit game"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [
            s.headerBackBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={s.headerBackArrow}>‹</Text>
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>vs Computer</Text>
          <Text style={s.headerSub}>{diffLabel}</Text>
        </View>
        <View style={s.evalChip}>
          <Text style={s.evalText}>+0.3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Opponent Row ───────────────────────── */}
        <PlayerRow
          label={`Computer (${(difficulty as string).charAt(0).toUpperCase() + (difficulty as string).slice(1)})`}
          emoji="🤖"
          isActive={!isPlayerTurn}
          time="10:00"
        />

        {/* ── Board ──────────────────────────────── */}
        <View style={s.boardWrap}>
          <ChessBoard_component
            fen={position}
            orientation={color === 'white' ? 'white' : 'black'}
            disabled={false}
            onMove={handleMove}
            lastMove={lastMove ?? undefined}
            labels={true}
          />
        </View>

        {/* ── Player Row ─────────────────────────── */}
        <PlayerRow
          label="You"
          emoji="🧑"
          isActive={isPlayerTurn}
          time="9:42"
          captured="♙ ♙"
        />

        {/* ── Tutor Panel ────────────────────────── */}
        <View style={s.tutorCard}>
          <Pressable
            onPress={() => setTutorOpen((v) => !v)}
            style={s.tutorHeader}
          >
            <View style={s.tutorLeft}>
              <View style={s.tutorIconWrap}>
                <Text style={{ fontSize: 15 }}>🎓</Text>
              </View>
              <Text style={s.tutorTitle}>Tutor</Text>
              <View style={s.tutorEvalBadge}>
                <Text style={s.tutorEvalText}>+0.3</Text>
              </View>
            </View>
            <Text style={s.tutorChevron}>{tutorOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
          {tutorOpen && (
            <View style={s.tutorBody}>
              <Text style={s.tutorOpening}>Ruy Lopez — Main Line</Text>
              <Text style={s.tutorTip}>
                Consider castling kingside to protect your king before launching
                an attack. Your d-pawn controls the center.
              </Text>
              <View style={s.tutorSuggestion}>
                <Text style={s.tutorSugLabel}>💡 Best move:</Text>
                <View style={s.tutorSugMove}>
                  <Text style={s.tutorSugMoveText}>d4</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Move History ───────────────────────── */}
        <View style={s.movesSection}>
          <Text style={s.movesLabel}>Move History</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.movesList}
          >
            {MOVES.map((m) => (
              <View key={m.n} style={s.moveGroup}>
                <Text style={s.moveNum}>{m.n}.</Text>
                <View style={s.moveChip}>
                  <Text style={s.moveChipText}>{m.w}</Text>
                </View>
                {m.b && (
                  <View style={[s.moveChip, s.moveChipBlack]}>
                    <Text style={[s.moveChipText, { color: palette.white }]}>
                      {m.b}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: spacing.md }} />
      </ScrollView>

      {/* ── Controls Footer ────────────────────── */}
      <View style={s.footer}>
        {[
          {
            icon: '↩',
            label: 'Undo',
            onPress: () => {},
            variant: 'normal' as const,
          },
          {
            icon: '⇅',
            label: 'Flip',
            onPress: () => {},
            variant: 'normal' as const,
          },
          {
            icon: '🤝',
            label: 'Draw',
            onPress: () => setGameResult('draw'),
            variant: 'normal' as const,
          },
          {
            icon: '🏳',
            label: 'Resign',
            onPress: () => setGameResult('lose'),
            variant: 'danger' as const,
          },
        ].map((item) => (
          <Pressable
            key={item.label}
            accessibilityLabel={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              s.ctrlBtn,
              item.variant === 'danger' && s.ctrlBtnDanger,
              pressed && s.ctrlBtnPressed,
            ]}
          >
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text
              style={[
                s.ctrlLabel,
                item.variant === 'danger' && s.ctrlLabelDanger,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <GameOverModal
        result={gameResult}
        onNewGame={() => {
          setGameResult(null);
          router.back();
        }}
        onExit={() => {
          setGameResult(null);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

/* ── Board styles ────────────────────────── */
const b = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 1, flexDirection: 'row' },
  rankLabels: {
    justifyContent: 'space-around',
    paddingRight: 4,
    paddingBottom: 18,
  },
  rankLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
  },
  row: { flex: 1, flexDirection: 'row' },
  square: { flex: 1 },
  light: { backgroundColor: '#F0D9B5' },
  dark: { backgroundColor: '#B58863' },
  highlighted: { backgroundColor: 'rgba(127,204,38,0.5)' },
  fileRow: { flexDirection: 'row', height: 18 },
  fileLabel: {
    flex: 1,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    paddingTop: 4,
  },
});

/* ── Player row styles ───────────────────── */
const p = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowActive: { backgroundColor: `${palette.brandGreen}18` },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  avatarActive: { borderColor: palette.brandGreen },
  info: { flex: 1, gap: 1 },
  name: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  captured: {
    fontSize: fontSizes.caption,
    color: palette.muted,
    letterSpacing: 2,
  },
  capturedEmpty: { fontSize: fontSizes.caption, color: palette.border },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: palette.brandGreen,
  },
  timer: {
    backgroundColor: palette.ink,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  timerActive: { backgroundColor: palette.brandGreen },
  timerText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
  },
  timerTextActive: { color: palette.ink },
});

/* ── Modal styles ────────────────────────── */
const mo = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31,31,31,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.colors.surfaceStrong,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  emoji: { fontSize: 60 },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: fontSizes.body,
    color: palette.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  xpPill: {
    backgroundColor: `${palette.accentYellow}33`,
    borderWidth: 1,
    borderColor: palette.accentYellow,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  xpText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  buttons: { width: '100%', gap: spacing.sm },
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  btnPrimary: {
    backgroundColor: palette.brandGreen,
    borderColor: palette.brandGreen,
  },
  btnSecondary: { backgroundColor: 'transparent', borderColor: palette.border },
  btnText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  btnTextPrimary: { color: palette.ink },
});

/* ── Screen styles ───────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: palette.ink,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackArrow: {
    fontSize: fontSizes.heading,
    color: palette.white,
    marginTop: -1,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 1 },
  headerTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
  headerSub: {
    fontSize: fontSizes.caption - 1,
    color: 'rgba(255,255,255,0.5)',
  },
  evalChip: {
    backgroundColor: `${palette.brandGreen}22`,
    borderWidth: 1,
    borderColor: `${palette.brandGreen}50`,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  evalText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },

  /* Scroll */
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  boardWrap: {
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: palette.ink,
  },

  /* Tutor */
  tutorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  tutorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: `${palette.accentYellow}18`,
  },
  tutorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tutorIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: `${palette.accentYellow}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tutorTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  tutorEvalBadge: {
    backgroundColor: `${palette.brandGreen}1A`,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
  },
  tutorEvalText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },
  tutorChevron: { fontSize: fontSizes.label, color: palette.muted },
  tutorBody: { padding: spacing.md, gap: spacing.sm },
  tutorOpening: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tutorTip: { fontSize: fontSizes.caption, color: palette.ink, lineHeight: 20 },
  tutorSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  tutorSugLabel: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.muted,
  },
  tutorSugMove: {
    backgroundColor: palette.ink,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  tutorSugMoveText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },

  /* Move history */
  movesSection: { gap: spacing.xs },
  movesLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  movesList: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  moveGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  moveNum: {
    fontSize: fontSizes.caption,
    color: palette.muted,
    minWidth: 20,
    textAlign: 'right',
  },
  moveChip: {
    paddingVertical: 3,
    paddingHorizontal: spacing.xs,
    backgroundColor: theme.colors.background,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  moveChipBlack: { backgroundColor: palette.ink, borderColor: palette.ink },
  moveChipText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: palette.ink,
  },
  ctrlBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.md,
    minHeight: 56,
  },
  ctrlBtnDanger: { backgroundColor: 'rgba(214,69,69,0.15)' },
  ctrlBtnPressed: { opacity: 0.7 },
  ctrlLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ctrlLabelDanger: { color: palette.error },
});
