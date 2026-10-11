/**
 * index.tsx — Home Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { router } from 'expo-router';
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
import { useSession } from '@/providers/SessionProvider';

const QUICK_ACTIONS = [
  {
    id: 'learn',
    emoji: '📚',
    label: 'Learn',
    sub: '12 lessons',
    route: '/learn' as const,
    accent: palette.brandGreen,
  },
  {
    id: 'puzzles',
    emoji: '🧩',
    label: 'Puzzles',
    sub: 'Daily challenge',
    route: '/puzzles' as const,
    accent: palette.accentYellow,
  },
  {
    id: 'play',
    emoji: '♟',
    label: 'Play',
    sub: 'vs Computer',
    route: '/play' as const,
    accent: palette.ink,
  },
  {
    id: 'profile',
    emoji: '🏆',
    label: 'Profile',
    sub: 'Your progress',
    route: '/profile' as const,
    accent: '#9B59B6',
  },
];

const ACTIVITY = [
  {
    id: '1',
    icon: '📚',
    text: 'Completed Knight lesson',
    time: '2h ago',
    color: palette.brandGreen,
  },
  {
    id: '2',
    icon: '🧩',
    text: 'Solved puzzle #4820',
    time: 'Yesterday',
    color: palette.accentYellow,
  },
  {
    id: '3',
    icon: '♟',
    text: 'Won game vs Beginner',
    time: '2d ago',
    color: palette.ink,
  },
  {
    id: '4',
    icon: '🌱',
    text: 'Joined YSTEM and Chess',
    time: '1 week ago',
    color: palette.brandGreenSoft,
  },
];

export default function HomeRoute() {
  const { session } = useSession();
  const displayName =
    session.status === 'authenticated' ? session.user.displayName : 'there';
  const firstName = displayName.split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greetingSub}>{greeting}</Text>
            <Text style={s.greetingName}>{firstName} 👋</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Progress Hero Card ─────────────────── */}
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroLabel}>YOUR PROGRESS</Text>
              <Text style={s.heroXP}>250 XP</Text>
            </View>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>Lvl 3</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={s.xpTrack}>
            <View style={s.xpFill} />
            <Text style={s.xpLabel}>150 XP to next level</Text>
          </View>

          <View style={s.heroStats}>
            {[
              { value: '5', label: 'Streak', icon: '🔥' },
              { value: '12', label: 'Puzzles', icon: '🧩' },
              { value: '3', label: 'Wins', icon: '♟' },
            ].map((stat) => (
              <View key={stat.label} style={s.heroStat}>
                <Text style={s.heroStatIcon}>{stat.icon}</Text>
                <Text style={s.heroStatValue}>{stat.value}</Text>
                <Text style={s.heroStatLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Quick Actions</Text>
        </View>
        <View style={s.grid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              accessibilityLabel={action.label}
              onPress={() => router.push(action.route as never)}
              style={({ pressed }) => [
                s.actionCard,
                pressed && s.actionCardPressed,
              ]}
            >
              <View
                style={[s.actionAccent, { backgroundColor: action.accent }]}
              />
              <Text style={s.actionEmoji}>{action.emoji}</Text>
              <Text style={s.actionLabel}>{action.label}</Text>
              <Text style={s.actionSub}>{action.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Continue Learning ──────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Continue Learning</Text>
          <Pressable hitSlop={8} onPress={() => router.push('/learn' as never)}>
            <Text style={s.sectionLink}>See all →</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/lesson-detail',
              params: { piece: 'rook', id: '2' },
            } as never)
          }
          style={({ pressed }) => [
            s.continueCard,
            pressed && s.continueCardPressed,
          ]}
        >
          <View style={s.continueLeft}>
            <View style={s.continueIcon}>
              <Text style={{ fontSize: 24 }}>♖</Text>
            </View>
            <View style={s.continueInfo}>
              <Text style={s.continueName}>Rook Lesson</Text>
              <Text style={s.continueSub}>The Power of Open Files</Text>
              <View style={s.continueProgress}>
                <View style={s.continueBar}>
                  <View style={[s.continueBarFill, { width: '60%' }]} />
                </View>
                <Text style={s.continueBarLabel}>Step 2 of 4</Text>
              </View>
            </View>
          </View>
          <Text style={s.continueArrow}>›</Text>
        </Pressable>

        {/* ── Today's Challenge ──────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Today’s Challenge</Text>
        </View>
        <Pressable
          onPress={() => router.push('/puzzles' as never)}
          style={({ pressed }) => [
            s.challengeCard,
            pressed && s.challengeCardPressed,
          ]}
        >
          <View style={s.challengeLeft}>
            <Text style={s.challengeEmoji}>🧩</Text>
            <View>
              <Text style={s.challengeTitle}>Daily Puzzle</Text>
              <Text style={s.challengeSub}>Rating 1287 · Fork theme</Text>
            </View>
          </View>
          <View style={s.challengeBadge}>
            <Text style={s.challengeBadgeText}>+10 XP</Text>
          </View>
        </Pressable>

        {/* ── Recent Activity ────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Recent Activity</Text>
        </View>
        <View style={s.activityCard}>
          {ACTIVITY.map((item, i) => (
            <View
              key={item.id}
              style={[
                s.activityRow,
                i < ACTIVITY.length - 1 && s.activityRowBorder,
              ]}
            >
              <View style={[s.activityDot, { backgroundColor: item.color }]} />
              <View style={s.activityIcon}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
              </View>
              <Text style={s.activityText} numberOfLines={1}>
                {item.text}
              </Text>
              <Text style={s.activityTime}>{item.time}</Text>
            </View>
          ))}
        </View>

        {/* ── Donate CTA ─────────────────────────── */}
        <View style={s.donateCard}>
          <View style={s.donateLeft}>
            <Text style={{ fontSize: 24 }}>❤️</Text>
            <View>
              <Text style={s.donateTitle}>Support YSTEM</Text>
              <Text style={s.donateSub}>Help a student learn chess & STEM</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              s.donateBtn,
              pressed && s.donateBtnPressed,
            ]}
          >
            <Text style={s.donateBtnText}>Donate</Text>
          </Pressable>
        </View>

        {session.status === 'authenticated' &&
          session.user.role === 'mentor' && (
            <Pressable
              accessibilityLabel="Open mentor area"
              accessibilityRole="button"
              onPress={() => router.push('/mentor')}
              style={({ pressed }) => [
                s.mentorButton,
                pressed && s.mentorButtonPressed,
              ]}
            >
              <Text style={s.mentorButtonText}>Open mentor area</Text>
            </Pressable>
          )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: { gap: 2 },
  greetingSub: { fontSize: fontSizes.caption, color: palette.muted },
  greetingName: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },

  /* Hero Card */
  hero: {
    backgroundColor: palette.ink,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...SHADOW,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroXP: {
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
    color: palette.white,
    letterSpacing: -1,
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: palette.brandGreen,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  levelText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  xpTrack: { gap: 6 },
  xpFill: {
    height: 6,
    width: '62.5%',
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    /* Parent track — use overflow hidden on a wrapper */
  },
  xpLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  heroStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: spacing.md,
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroStatIcon: { fontSize: 16 },
  heroStatValue: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },

  /* Section headers */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  sectionLink: {
    fontSize: fontSizes.caption,
    color: palette.brandGreen,
    fontWeight: fontWeights.semibold,
  },

  /* Quick Actions Grid */
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionCard: {
    width: '47.5%',
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.xxs,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOW,
  },
  actionCardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  actionAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  actionEmoji: { fontSize: 26, marginTop: spacing.xs },
  actionLabel: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  actionSub: { fontSize: fontSizes.caption, color: palette.muted },

  /* Continue Card */
  continueCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOW,
  },
  continueCardPressed: { opacity: 0.85 },
  continueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  continueIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: palette.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.brandGreenSoft,
  },
  continueInfo: { flex: 1, gap: 2 },
  continueName: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  continueSub: { fontSize: fontSizes.caption, color: palette.muted },
  continueProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  continueBar: {
    flex: 1,
    height: 4,
    backgroundColor: palette.border,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  continueBarFill: {
    height: '100%',
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
  },
  continueBarLabel: { fontSize: 10, color: palette.muted },
  continueArrow: {
    fontSize: fontSizes.title,
    color: palette.muted,
    marginLeft: spacing.sm,
  },

  /* Challenge Card */
  challengeCard: {
    backgroundColor: `${palette.accentYellow}22`,
    borderWidth: 1,
    borderColor: palette.accentYellow,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  challengeCardPressed: { opacity: 0.85 },
  challengeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  challengeEmoji: { fontSize: 28 },
  challengeTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  challengeSub: { fontSize: fontSizes.caption, color: palette.gray },
  challengeBadge: {
    backgroundColor: palette.accentYellow,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  challengeBadgeText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },

  /* Activity */
  activityCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...SHADOW,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  activityDot: { width: 7, height: 7, borderRadius: radii.pill },
  activityIcon: { width: 30 },
  activityText: { flex: 1, fontSize: fontSizes.caption, color: palette.ink },
  activityTime: { fontSize: 10, color: palette.muted },

  /* Donate */
  donateCard: {
    backgroundColor: `${palette.brandGreen}15`,
    borderWidth: 1,
    borderColor: `${palette.brandGreen}40`,
    borderRadius: radii.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  donateTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  donateSub: { fontSize: fontSizes.caption, color: palette.gray },
  donateBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  donateBtnPressed: { backgroundColor: palette.brandGreenPressed },
  donateBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  mentorButton: {
    alignItems: 'center',
    backgroundColor: palette.ink,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  mentorButtonPressed: { opacity: 0.8 },
  mentorButtonText: {
    color: palette.white,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
  },
});
