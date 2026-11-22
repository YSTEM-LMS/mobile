/**
 * student-mentor.tsx — Active Chess Game Screen
 * between a student and a mentor
 */

import { router } from 'expo-router';
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

import { ChessBoard_component } from '@/components/chess/Chessboard-component';
import { DEFAULT_POSITION } from 'chess.js';
import { ConnectionBanner } from '@/components/feedback/ConnectionBanner';
import { InlineError } from '@/components/feedback/InlineError';
import { useSession } from '@/providers/SessionProvider';

import {
  useStudentMentorGame,
  GameOver,
} from '@/features/play/services/hooks/useStudentMentorGame';
import { createMentorPracticeClient } from '@/features/play/services/mentorPracticeSocketClient';
import { Button } from '@/components/ui/Button';

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
  username,
  result,
  onNewGame,
  onExit,
}: {
  username: string;
  result: GameOver | null;
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

  const outcome = !result
    ? null
    : result.reason === 'draw'
      ? 'draw'
      : result.winner === username
        ? 'win'
        : 'lose';

  const meta = {
    win: {
      emoji: '🏆',
      title: 'You Win!',
      body: 'Excellent play!',
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

  const m = outcome ? meta[outcome] : null;

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
  const { session } = useSession();

  const role =
    session.status === 'authenticated' ? session.user.role : 'student';

  const pair = { student: 'student', mentor: 'mentor', role: role };

  const [client] = useState(() => createMentorPracticeClient());
  const game = useStudentMentorGame(client, pair);

  if (game.state.status === 'joining') {
    return (
      <SafeAreaView style={s.safe}>
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
        </View>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ConnectionBanner message="Starting game…" status="connecting" />

          <ChessBoard_component
            fen={DEFAULT_POSITION}
            orientation="white"
            disabled={true}
            onMove={undefined}
            lastMove={undefined}
            labels={false}
          />

          {/* ── Player Row ─────────────────────────── */}
          <PlayerRow
            label="You"
            emoji="🧑"
            isActive={false}
            time="10:00"
            captured=""
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (game.state.status === 'join-failed') {
    return (
      <SafeAreaView style={s.safe}>
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
        </View>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.errorWrap}>
            <InlineError
              title={"Couldn't start the game"}
              message={game.state.message ?? 'Something went wrong.'}
            />
            <Pressable
              accessibilityLabel="Retry"
              onPress={game.retry}
              style={({ pressed }) => [
                s.retryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          </View>
          <ChessBoard_component
            fen={DEFAULT_POSITION}
            orientation="white"
            disabled={true}
            onMove={undefined}
            lastMove={undefined}
            labels={false}
          />

          {/* ── Player Row ─────────────────────────── */}
          <PlayerRow
            label="You"
            emoji="🧑"
            isActive={false}
            time="10:00"
            captured=""
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (game.state.status === 'ended') {
    return (
      <SafeAreaView style={s.safe}>
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
          <View style={s.headerCenter}></View>
        </View>
        <View style={s.endedContent}>
          <InlineError
            title={'Session Ended'}
            message={
              "This practice session has ended. Go back to start a new game."
            }
          />
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={s.headerTitle}>
            vs {role === 'student' ? pair.mentor : pair.student}
          </Text>
        </View>
        <View style={s.evalChip}>
          <Text style={s.evalText}>+0.3</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {game.state.rejection && (
          <InlineError title={'Invalid move'} message={game.state.rejection} />
        )}

        {/* ── Opponent Row ───────────────────────── */}
        <PlayerRow
          label={role === 'student' ? pair.mentor : pair.student}
          emoji="🧑"
          isActive={!game.yourTurn && !game.state.gameOver}
          time="10:00"
        />

        {/* ── Board ──────────────────────────────── */}
        <View style={s.boardWrap}>
          <ChessBoard_component
            fen={game.state.fen}
            orientation={game.state.color}
            disabled={game.inputDisabled}
            onMove={game.sendMove}
            labels={true}
          />
        </View>

        {/* ── Player Row ─────────────────────────── */}
        <PlayerRow
          label="You"
          emoji="🧑"
          isActive={game.yourTurn}
          time="9:42"
          captured="♙ ♙"
        />

        <View style={s.turnStatus}>
          {!game.yourTurn && !game.state.gameOver && (
            <Text>Waiting for your partner…</Text>
          )}
        </View>

        <View style={{ height: spacing.md }} />
      </ScrollView>

      {/* ── Controls Footer ────────────────────── */}
      <View style={s.footer}>
        {[
          {
            icon: '⇅',
            label: 'Flip',
            onPress: () => {},
            variant: 'normal' as const,
          },
          {
            icon: '🤝',
            label: 'Draw',
            onPress: () => {},
            variant: 'normal' as const,
          },
          {
            icon: '🏳',
            label: 'Resign',
            onPress: () => {},
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
        username={pair[pair.role]}
        result={game.state.gameOver ?? null}
        onNewGame={() => {
          router.back();
        }}
        onExit={() => {
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

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
  turnStatus: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  errorWrap: { gap: spacing.sm },
  endedContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  retryBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
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
