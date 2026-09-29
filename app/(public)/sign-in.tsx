/**
 * sign-in.tsx — Authentication Screen
 * UI/UX design by Sandith Hewage (Y STEM and Chess)
 */

import { useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const chessPiecePattern = require('@/assets/images/chess-piece-pattern.png');

export default function SignInRoute() {
  const { mockSignInAs } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [btnScale] = useState(() => new Animated.Value(1));
  const pressIn = () =>
    Animated.spring(btnScale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  const pressOut = () =>
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Patterned Background ──────────────── */}
      <Image
        accessible={false}
        resizeMode="cover"
        source={chessPiecePattern}
        style={s.pattern}
      />
      <View pointerEvents="none" style={s.patternFade} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.kav}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Mark ────────────────────────── */}
          <View style={s.brand}>
            <View style={s.brandCircle}>
              <Text style={s.brandIcon}>♟</Text>
            </View>
            <Text style={s.brandTitle}>Y STEM</Text>
            <Text style={s.brandSub}>and Chess</Text>
          </View>

          {/* ── Form Card ─────────────────────────── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Welcome back</Text>
              <Text style={s.cardSub}>Sign in to continue your journey</Text>
            </View>

            <View style={s.fields}>
              <View style={[s.field, usernameFocused && s.fieldFocused]}>
                <Text style={s.fieldIcon}>👤</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => setUsernameFocused(false)}
                  onChangeText={setUsername}
                  onFocus={() => setUsernameFocused(true)}
                  placeholder="Username"
                  placeholderTextColor={palette.muted}
                  returnKeyType="next"
                  style={s.fieldInput}
                  value={username}
                />
              </View>

              <View style={[s.field, passwordFocused && s.fieldFocused]}>
                <Text style={s.fieldIcon}>🔒</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onBlur={() => setPasswordFocused(false)}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  placeholder="Password"
                  placeholderTextColor={palette.muted}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={[s.fieldInput, { flex: 1 }]}
                  value={password}
                />
                <Pressable
                  hitSlop={10}
                  onPress={() => setShowPassword((v) => !v)}
                  style={s.eyeBtn}
                >
                  <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable hitSlop={8} style={s.forgotRow}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </Pressable>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable
                accessibilityLabel="Sign in"
                accessibilityRole="button"
                onPressIn={pressIn}
                onPressOut={pressOut}
                style={s.enterBtn}
              >
                <Text style={s.enterBtnText}>Sign In →</Text>
              </Pressable>
            </Animated.View>

            <View style={s.signupRow}>
              <Text style={s.signupHint}>New here? </Text>
              <Pressable hitSlop={8}>
                <Text style={s.signupLink}>Create account</Text>
              </Pressable>
            </View>
          </View>

          {/* ── Dev Quick-Login ───────────────────── */}
          <View style={s.dev}>
            <View style={s.devDivider}>
              <View style={s.devLine} />
              <Text style={s.devLabel}>DEV ONLY</Text>
              <View style={s.devLine} />
            </View>
            <View style={s.devRow}>
              {(['student', 'mentor'] as const).map((role) => (
                <Pressable
                  key={role}
                  accessibilityLabel={`Continue as ${role}`}
                  accessibilityRole="button"
                  onPress={() => mockSignInAs(role)}
                  style={({ pressed }) => [
                    s.devBtn,
                    pressed && s.devBtnPressed,
                  ]}
                >
                  <Text style={s.devBtnIcon}>
                    {role === 'student' ? '🎒' : '🎓'}
                  </Text>
                  <Text style={s.devBtnText}>
                    {role === 'student' ? 'Student' : 'Mentor'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
} as const;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  pattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  patternFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: theme.colors.background,
    opacity: 0.9,
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },

  brand: { alignItems: 'center', gap: spacing.xs },
  brandCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  brandIcon: { fontSize: 34 },
  brandTitle: {
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
    color: palette.ink,
    letterSpacing: -1,
  },
  brandSub: {
    fontSize: fontSizes.label,
    color: palette.gray,
    fontWeight: fontWeights.medium,
    marginTop: -4,
  },

  card: {
    backgroundColor: theme.colors.surfaceStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...SHADOW,
  },
  cardHeader: { gap: 2 },
  cardTitle: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    color: palette.ink,
  },
  cardSub: { fontSize: fontSizes.caption, color: palette.muted },

  fields: { gap: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  fieldFocused: {
    borderColor: palette.brandGreen,
    backgroundColor: palette.backgroundSoft,
  },
  fieldIcon: { fontSize: 16 },
  fieldInput: {
    flex: 1,
    fontSize: fontSizes.body,
    color: palette.ink,
    paddingVertical: spacing.sm,
  },
  eyeBtn: { padding: spacing.xs },
  eyeIcon: { fontSize: 15 },

  forgotRow: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: fontSizes.caption,
    color: palette.brandGreen,
    fontWeight: fontWeights.semibold,
  },

  enterBtn: {
    backgroundColor: palette.ink,
    borderRadius: radii.pill,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enterBtnText: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.bold,
    color: palette.white,
    letterSpacing: 0.3,
  },

  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupHint: { fontSize: fontSizes.caption, color: palette.muted },
  signupLink: {
    fontSize: fontSizes.caption,
    color: palette.brandGreen,
    fontWeight: fontWeights.bold,
  },

  dev: { gap: spacing.sm },
  devDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  devLine: { flex: 1, height: 1, backgroundColor: palette.border },
  devLabel: {
    fontSize: 9,
    fontWeight: fontWeights.bold,
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  devRow: { flexDirection: 'row', gap: spacing.sm },
  devBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    paddingVertical: spacing.sm,
  },
  devBtnPressed: { backgroundColor: palette.backgroundSoft },
  devBtnIcon: { fontSize: 15 },
  devBtnText: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.semibold,
    color: palette.gray,
  },
});
