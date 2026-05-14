'use no memo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useRegisterAuth } from '@workspace/api-client-react';

import Colors from '@/constants/colors';
import { storeMobileAccessToken } from '@/lib/api/runtime';
import { signInWithOAuthProvider, type OAuthProvider } from '@/lib/auth/oauth';

WebBrowser.maybeCompleteAuthSession();

type FocusedField = 'name' | 'email' | 'password' | 'confirm' | null;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FocusedField>(null);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);

  const registerMutation = useRegisterAuth();

  const handleOAuth = async (provider: OAuthProvider) => {
    setError(null);
    setOauthProvider(provider);
    try {
      await signInWithOAuthProvider(provider);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Unable to continue with ${provider}.`);
    } finally {
      setOauthProvider(null);
    }
  };

  const submitSignup = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const response = await registerMutation.mutateAsync({
        data: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });
      const token = response?.data?.token;
      if (!token) {
        setError('Account created but sign-in failed. Please sign in.');
        return;
      }
      await storeMobileAccessToken(token);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unable to create account';
      setError(msg);
    }
  };

  const isLoading = registerMutation.isPending || oauthProvider !== null;

  return (
    <View style={styles.screen}>
      <View style={styles.glowTL} />
      <View style={styles.glowBR} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← BACK</Text>
        </Pressable>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(460)} style={styles.heroSection}>
          <Text style={styles.heroPath}>~/nexapath/register</Text>
          <View style={styles.symbolBadge}>
            <Feather name="compass" size={32} color={Colors.primary} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.titleWhite}>$ nexa</Text>
            <Text style={styles.titleRed}>signup</Text>
          </View>
          <Text style={styles.subtitle}>{'// start your AI-powered career plan'}</Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View entering={FadeInDown.delay(130).duration(460)} style={styles.card}>
          <View style={styles.cardTopLine} />
          <Text style={styles.cardLabel}>{'// REGISTER_SEQUENCE'}</Text>

          {/* Google Button */}
          <Pressable
            style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.75 }]}
            onPress={() => handleOAuth('google')}
            disabled={isLoading}
          >
            {oauthProvider === 'google' ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <View style={styles.googleIconWrap}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>CONTINUE WITH GOOGLE</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.googleBtn, styles.githubBtn, pressed && { opacity: 0.75 }]}
            onPress={() => handleOAuth('github')}
            disabled={isLoading}
          >
            {oauthProvider === 'github' ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <>
                <View style={styles.githubIconWrap}>
                  <Feather name="github" size={13} color="#fff" />
                </View>
                <Text style={styles.googleBtnText}>CONTINUE WITH GITHUB</Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>// OR EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Full Name */}
          <InputField
            label="Full Name"
            placeholder="Your full name"
            icon="user"
            value={fullName}
            onChangeText={setFullName}
            focused={focused === 'name'}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />

          {/* Email */}
          <InputField
            label="Email"
            placeholder="you@example.com"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            focused={focused === 'email'}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
          />

          {/* Password */}
          <InputField
            label="Password"
            placeholder="Minimum 6 characters"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            focused={focused === 'password'}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            rightElement={
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye' : 'eye-off'} size={16} color="rgba(138,174,200,0.45)" />
              </Pressable>
            }
          />

          {/* Confirm Password */}
          <InputField
            label="Confirm Password"
            placeholder="Re-enter password"
            icon="shield"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            focused={focused === 'confirm'}
            onFocus={() => setFocused('confirm')}
            onBlur={() => setFocused(null)}
            rightElement={
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Feather name={showConfirm ? 'eye' : 'eye-off'} size={16} color="rgba(138,174,200,0.45)" />
              </Pressable>
            }
          />

          {/* Error */}
          {error ? (
            <Animated.View entering={FadeInDown.duration(280)} style={styles.errorWrap}>
              <Feather name="alert-circle" size={13} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* CTA */}
          <Pressable
            style={[styles.cta, isLoading && styles.ctaDisabled]}
            onPress={submitSignup}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            {registerMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.ctaText}>$ CREATE_ACCOUNT</Text>
                <Feather name="arrow-right" size={14} color="#fff" />
              </>
            )}
          </Pressable>

          {/* Switch to Login */}
          <Pressable style={styles.authSwitch} onPress={() => router.push('/login')}>
            <Text style={styles.switchNote}>{'// HAVE ACCOUNT? '}</Text>
            <Text style={styles.switchLink}>$ nexa login</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Reusable Input Field ──────────────────────────────────────────────────────

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

function InputField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  focused,
  onFocus,
  onBlur,
  rightElement,
}: {
  label: string;
  placeholder: string;
  icon: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{'> '}{label.toUpperCase()}</Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <Feather
          name={icon as any} size={13}
          color={focused ? Colors.primary : Colors.textTertiary}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder + '_'}
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          keyboardType={keyboardType ?? 'default'}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20 },

  glowTL: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: Colors.primary + '07', top: -60, right: -60,
  },
  glowBR: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.primary + '05', bottom: 80, left: -60,
  },

  // Back
  backBtn: { paddingVertical: 6, paddingRight: 12, alignSelf: 'flex-start' },
  backBtnText: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, letterSpacing: 0.8 },

  // Hero
  heroSection: { alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 24 },
  heroPath: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, letterSpacing: 1.5 },
  symbolBadge: {
    width: 84, height: 84, borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.3,
    shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  titleWhite: { fontFamily: MONO, fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  titleRed: { fontFamily: MONO, fontSize: 26, fontWeight: '700', color: Colors.primary },
  subtitle: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, letterSpacing: 0.5 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: 20,
  },
  cardTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.primary },
  cardLabel: { fontFamily: MONO, fontSize: 9, color: Colors.textTertiary, letterSpacing: 1.5, marginBottom: 16 },

  // Google
  googleBtn: {
    height: 46, borderRadius: 5,
    backgroundColor: Colors.surfaceElevated,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 10,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  githubBtn: { marginBottom: 16 },
  googleIconWrap: {
    width: 20, height: 20, borderRadius: 3,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center',
  },
  githubIconWrap: {
    width: 20, height: 20, borderRadius: 3,
    backgroundColor: '#171515', alignItems: 'center', justifyContent: 'center',
  },
  googleG: { color: '#fff', fontSize: 11, fontFamily: MONO, fontWeight: '700' },
  googleBtnText: { color: Colors.textSecondary, fontSize: 10, fontFamily: MONO, letterSpacing: 1 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  dividerText: { fontFamily: MONO, fontSize: 9, color: Colors.textTertiary, letterSpacing: 1.2 },

  // Inputs
  inputGroup: { marginBottom: 12 },
  label: { fontFamily: MONO, fontSize: 9, color: Colors.textTertiary, letterSpacing: 1.5, marginBottom: 6 },
  inputBox: {
    height: 46, borderRadius: 5, borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background2,
    flexDirection: 'row', alignItems: 'center',
  },
  inputBoxFocused: { borderColor: Colors.primary + '70' },
  inputIcon: { marginLeft: 13, marginRight: 10 },
  input: {
    flex: 1, color: Colors.textPrimary, fontSize: 13,
    fontFamily: MONO, paddingRight: 12,
  },
  eyeBtn: { width: 42, alignItems: 'center', justifyContent: 'center' },

  // Error
  errorWrap: {
    backgroundColor: Colors.danger + '12',
    borderRadius: 5, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.danger + '30',
    borderLeftWidth: 2, borderLeftColor: Colors.danger,
  },
  errorText: { flex: 1, fontFamily: MONO, color: '#FF8070', fontSize: 10, letterSpacing: 0.5, lineHeight: 16 },

  // CTA
  cta: {
    height: 46, borderRadius: 5, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 6, marginBottom: 16,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontFamily: MONO, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 1.2 },

  // Switch
  authSwitch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  switchNote: { fontFamily: MONO, fontSize: 11, color: Colors.textTertiary },
  switchLink: { fontFamily: MONO, fontSize: 11, color: Colors.primary, fontWeight: '700' },
});
