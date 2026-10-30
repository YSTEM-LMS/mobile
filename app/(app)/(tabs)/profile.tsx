/**
 * profile.tsx — Profile Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import {
  ActivityIndicator,
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
import { useSession } from '@/providers/SessionProvider';
import { useState } from 'react';
import { InlineError } from '@/components/feedback/InlineError';
import { ConnectionBanner } from '@/components/feedback/ConnectionBanner';
import { Spinner } from '@/components/ui/Spinner';
// Temporary AppError import until API is merged
import { AppError } from '@/services/storage/TokenStore';

import { ProfileError } from '@/features/profile/api/profile.errors';
import type { Profile } from '@/features/profile/api/profile.types';
import { useProfile } from '@/features/profile/hooks/useProfile';

type Badge = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  earned: boolean;
};
type StatItem = { label: string; value: string; icon: string };
type MenuItem = { label: string; emoji: string; sub: string };

const STATS: StatItem[] = [
  { label: 'Lessons', value: '5', icon: '📚' },
  { label: 'Puzzles', value: '12', icon: '🧩' },
  { label: 'Wins', value: '3', icon: '♟' },
  { label: 'Streak', value: '5', icon: '🔥' },
];

const BADGES: Badge[] = [
  {
    id: '1',
    emoji: '🌱',
    label: 'First Lesson',
    desc: 'Complete your first lesson',
    earned: true,
  },
  {
    id: '2',
    emoji: '🧩',
    label: 'Puzzle Solver',
    desc: 'Solve 10 puzzles',
    earned: true,
  },
  {
    id: '3',
    emoji: '♟',
    label: 'First Win',
    desc: 'Win your first game',
    earned: true,
  },
  {
    id: '4',
    emoji: '🔥',
    label: '5-Day Streak',
    desc: 'Practice 5 days in a row',
    earned: true,
  },
  {
    id: '5',
    emoji: '📚',
    label: 'Quick Learner',
    desc: 'Complete 5 lessons in one week',
    earned: true,
  },
  {
    id: '6',
    emoji: '🏆',
    label: 'Champion',
    desc: 'Win 10 games',
    earned: false,
  },
  {
    id: '7',
    emoji: '💎',
    label: 'Mastermind',
    desc: 'Solve a 1600+ rated puzzle',
    earned: false,
  },
  {
    id: '8',
    emoji: '⚡',
    label: 'Speed Solver',
    desc: 'Solve a puzzle in under 30 seconds',
    earned: false,
  },
  {
    id: '9',
    emoji: '🎯',
    label: 'Perfectionist',
    desc: '10 correct puzzles in a row',
    earned: false,
  },
];

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile', emoji: '✏️', sub: 'Name, avatar, bio' },
      {
        label: 'Notification Settings',
        emoji: '🔔',
        sub: 'Alerts & reminders',
      },
    ],
  },
  {
    title: 'Privacy',
    items: [
      {
        label: 'Privacy & Security',
        emoji: '🔒',
        sub: 'Data & account protection',
      },
      { label: 'Connected Accounts', emoji: '🔗', sub: 'Google, Apple' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help & Support', emoji: '❓', sub: 'FAQs & contact us' },
      { label: 'About Y STEM', emoji: 'ℹ️', sub: 'Mission & team' },
    ],
  },
];

export default function ProfileRoute() {
  const { signOut } = useSession();
  const { data: profile, isLoading, error, refetch, isFetching } = useProfile();
  const earnedCount = BADGES.filter((b) => b.earned).length;
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');

  const signOutPressed = async () => {
    setSigningOut(true);
    setError('');
    setConnectionError('');

    try {
      await signOut();
    } catch (error) {
      setSigningOut(false);
      if (error instanceof AppError) {
        switch (error.code) {
          case 'NETWORK_ERROR':
            setConnectionError(error.message);
            break;
          case 'REQUEST_TIMEOUT':
            setConnectionError(error.message);
            break;
          default:
            setError(error.message);
            break;
        }
      } else {
        setError('Sign out failed. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────── */}
        {isLoading ? (
          <View style={s.statusBox}>
            <ActivityIndicator accessibilityLabel="Loading profile" />
            <Text style={s.statusText}>Loading your profile…</Text>
          </View>
        ) : profile ? (
          <>
            <ProfileHero profile={profile} />
            <ProfileDetails profile={profile} />
          </>
        ) : (
          <ProfileLoadError
            error={error}
            retrying={isFetching}
            onRetry={() => refetch()}
          />
        )}

        {/* ── Stats ──────────────────────────────── */}
        <View style={s.statsCard}>
          {STATS.map((stat, i) => (
            <View
              key={stat.label}
              style={[s.statItem, i < STATS.length - 1 && s.statItemBorder]}
            >
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Badges ─────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Badges</Text>
            <Text style={s.sectionSub}>
              {earnedCount}/{BADGES.length} earned
            </Text>
          </View>
          <View style={s.badgesGrid}>
            {BADGES.map((badge) => (
              <Pressable
                key={badge.id}
                accessibilityLabel={`${badge.label}: ${badge.desc}`}
                style={({ pressed }) => [
                  s.badgeCard,
                  !badge.earned && s.badgeCardLocked,
                  pressed && badge.earned && s.badgeCardPressed,
                ]}
              >
                <Text
                  style={[s.badgeEmoji, !badge.earned && { opacity: 0.35 }]}
                >
                  {badge.emoji}
                </Text>
                <Text
                  style={[
                    s.badgeLabel,
                    !badge.earned && { color: palette.muted },
                  ]}
                  numberOfLines={2}
                >
                  {badge.label}
                </Text>
                {!badge.earned && (
                  <View style={s.badgeLockOverlay}>
                    <Text style={s.badgeLockIcon}>🔒</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Settings Sections ──────────────────── */}
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.menuSectionTitle}>{section.title}</Text>
            <View style={s.menuCard}>
              {section.items.map((item, i) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    s.menuRow,
                    i < section.items.length - 1 && s.menuRowBorder,
                    pressed && s.menuRowPressed,
                  ]}
                >
                  <View style={s.menuIconWrap}>
                    <Text style={s.menuEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={s.menuContent}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                  <Text style={s.menuArrow}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign Out ───────────────────────────── */}
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          onPress={signOutPressed}
          disabled={signingOut}
          style={({ pressed }) => [
            s.signOutBtn,
            pressed && s.signOutBtnPressed,
          ]}
        >
          {signingOut ? (
            <Spinner label="Signing out" />
          ) : (
            <Text style={s.signOutText}>Sign out</Text>
          )}
        </Pressable>

        {error && <InlineError message={error} />}

        {connectionError && (
          <ConnectionBanner message={connectionError} status="offline" />
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileHero({ profile }: { profile: Profile }) {
  const name = profile.fullName ?? profile.username;
  const initial = name.charAt(0).toUpperCase();
  const isMentor = profile.role === 'mentor';

  return (
    <View style={s.hero}>
      <View style={s.avatarRing}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
      </View>
      <Text style={s.displayName}>{name}</Text>
      <View style={s.roleBadge}>
        <Text style={s.roleIcon}>{isMentor ? '🎓' : '🎒'}</Text>
        <Text style={s.roleText}>{isMentor ? 'Mentor' : 'Student'}</Text>
      </View>
      <View style={s.xpRow}>
        <View style={s.xpPill}>
          <Text style={s.xpText}>250 XP</Text>
        </View>
        <Text style={s.xpSep}>·</Text>
        <Text style={s.xpLevel}>Level 3</Text>
      </View>
    </View>
  );
}

function ProfileDetails({ profile }: { profile: Profile }) {
  const rows = [
    { label: 'Username', value: profile.username },
    { label: 'Role', value: profile.role === 'mentor' ? 'Mentor' : 'Student' },
    { label: 'School', value: profile.school },
    { label: 'Grade level', value: profile.gradeLevel },
    { label: 'Location', value: profile.location, hideWhenEmpty: true },
  ].filter((r) => r.value || !r.hideWhenEmpty);

  return (
    <View style={s.section}>
      <Text style={s.menuSectionTitle}>Profile</Text>
      <View style={s.menuCard}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={[s.detailRow, i < rows.length - 1 && s.menuRowBorder]}
          >
            <Text style={s.detailLabel}>{row.label}</Text>
            <Text style={row.value ? s.detailValue : s.detailValueMissing}>
              {row.value ?? 'Not provided'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ProfileLoadError({
  error,
  retrying,
  onRetry,
}: {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const kind = error instanceof ProfileError ? error.kind : 'network';
  const message =
    kind === 'session-expired'
      ? 'Your session has expired. Please sign in again.'
      : kind === 'invalid-data'
        ? "We couldn't read your profile information."
        : "We couldn't load your profile. Please try again.";

  return (
    <View style={s.statusBox} accessibilityRole="alert">
      <Text style={s.statusText}>{message}</Text>
      {kind !== 'session-expired' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          disabled={retrying}
          onPress={onRetry}
          style={({ pressed }) => [
            s.retryBtn,
            (pressed || retrying) && s.retryBtnPressed,
          ]}
        >
          <Text style={s.retryText}>
            {retrying ? 'Retrying…' : 'Try again'}
          </Text>
        </Pressable>
      )}
    </View>
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
    gap: spacing.xl,
  },

  /* Hero */
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
  avatarRing: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    backgroundColor: `${palette.brandGreen}25`,
    padding: 4,
  },
  avatar: {
    flex: 1,
    borderRadius: radii.pill,
    backgroundColor: palette.brandGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.bold,
    color: palette.white,
  },
  displayName: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: `${palette.brandGreen}20`,
    borderWidth: 1,
    borderColor: `${palette.brandGreen}40`,
    borderRadius: radii.pill,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  roleIcon: { fontSize: 13 },
  roleText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.brandGreen,
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xpPill: {
    backgroundColor: `${palette.accentYellow}33`,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
  },
  xpText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  xpSep: { color: palette.muted },
  xpLevel: { fontSize: fontSizes.caption, color: palette.muted },

  /* Stats */
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...SHADOW,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  statItemBorder: { borderRightWidth: 1, borderRightColor: palette.border },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statValue: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  statLabel: { fontSize: fontSizes.caption - 1, color: palette.muted },

  /* Section */
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  sectionSub: { fontSize: fontSizes.caption, color: palette.muted },

  /* Badges */
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xxs,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOW,
  },
  badgeCardLocked: { opacity: 0.6 },
  badgeCardPressed: { backgroundColor: palette.backgroundSoft },
  badgeEmoji: { fontSize: 26, marginBottom: 2 },
  badgeLabel: {
    fontSize: fontSizes.caption - 1,
    fontWeight: fontWeights.semibold,
    color: palette.gray,
    textAlign: 'center',
  },
  badgeLockOverlay: {
    position: 'absolute',
    top: spacing.xxs,
    right: spacing.xxs,
  },
  badgeLockIcon: { fontSize: 10 },

  /* Menu */
  menuSectionTitle: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...SHADOW,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: palette.border },
  menuRowPressed: { backgroundColor: palette.backgroundSoft },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuEmoji: { fontSize: 17 },
  menuContent: { flex: 1, gap: 1 },
  menuLabel: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
  },
  menuSub: { fontSize: fontSizes.caption, color: palette.muted },
  menuArrow: { fontSize: fontSizes.heading, color: palette.muted },

  /* Sign out */
  signOutBtn: {
    backgroundColor: theme.colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  signOutBtnPressed: { backgroundColor: palette.errorBackground },
  signOutText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.error,
  },

  /* Profile status + details */
  statusBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  statusText: {
    fontSize: fontSizes.label,
    color: palette.muted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: palette.brandGreen,
    borderRadius: radii.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnPressed: { opacity: 0.7 },
  retryText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.white,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  detailLabel: { fontSize: fontSizes.label, color: palette.muted },
  detailValue: {
    flexShrink: 1,
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    color: palette.ink,
    textAlign: 'right',
  },
  detailValueMissing: {
    flexShrink: 1,
    fontSize: fontSizes.label,
    color: palette.muted,
    textAlign: 'right',
  },
});
