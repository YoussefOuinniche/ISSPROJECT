'use no memo';

import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import React, { useState } from 'react';
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
import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoginAuth } from '@workspace/api-client-react';

import { storeMobileAccessToken } from '@/lib/api/runtime';
import { signInWithOAuthProvider, type OAuthProvider } from '@/lib/auth/oauth';
import { SANS, SANS_MED, SANS_REG, DarkTheme } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const T = DarkTheme;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);

  const loginMutation = useLoginAuth();
  const isLoading = loginMutation.isPending || oauthProvider !== null;

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

  const submitLogin = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({
        data: { email: email.trim().toLowerCase(), password },
      });
      const token = response?.data?.token;
      if (!token) {
        setError('Authentication failed. Please try again.');
        return;
      }
      await storeMobileAccessToken(token);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      setError(
        msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')
          ? 'Connection timeout. Check that the server is running.'
          : msg,
      );
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.content,
          { paddingTop: insets.top + (Platform.OS === 'web' ? 54 : 18), paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.brandBlock}>
          <Image
            source={require('@/assets/images/nexapathicon.png')}
            style={s.brandLogo}
            contentFit="contain"
          />
          <Text style={[s.brandTitle, { color: T.text }]}>Welcome back</Text>
        </View>

        <Reanimated.View entering={FadeInDown.delay(60).springify()} style={s.welcomeBlock}>
          <Text style={[s.welcomeTitle, { color: T.text }]}>Sign in to continue</Text>
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.delay(120).springify()} style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[s.cardTopAccent, { backgroundColor: T.accent }]} />

          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: T.textSecondary }]}>Email</Text>
            <View style={[s.fieldBox, { backgroundColor: T.bg2, borderColor: focusEmail ? T.accent : T.borderSubtle }]}>
              <Feather name="mail" size={15} color={focusEmail ? T.accent : T.textTertiary} style={s.fieldIcon} />
              <TextInput
                style={[s.fieldInput, { color: T.text }]}
                placeholder="you@example.com"
                placeholderTextColor={T.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusEmail(true)}
                onBlur={() => setFocusEmail(false)}
                autoComplete="email"
              />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: T.textSecondary }]}>Password</Text>
            <View style={[s.fieldBox, { backgroundColor: T.bg2, borderColor: focusPass ? T.accent : T.borderSubtle }]}>
              <Feather name="lock" size={15} color={focusPass ? T.accent : T.textTertiary} style={s.fieldIcon} />
              <TextInput
                style={[s.fieldInput, { color: T.text }]}
                placeholder="Password"
                placeholderTextColor={T.textTertiary}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPass((p) => !p)} style={s.eyeBtn} hitSlop={8}>
                <Feather name={showPass ? 'eye' : 'eye-off'} size={15} color={T.textTertiary} />
              </Pressable>
            </View>
          </View>

          {error ? (
            <Reanimated.View entering={FadeInDown.duration(200)} style={[s.errorBox, { backgroundColor: '#EF444418', borderColor: '#EF444440' }]}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </Reanimated.View>
          ) : null}

          <Pressable
            style={[s.ctaBtn, { backgroundColor: T.accent }, isLoading && { opacity: 0.65 }]}
            onPress={submitLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={T.textOnAccent} size="small" />
            ) : (
              <>
                <Text style={[s.ctaBtnTxt, { color: T.textOnAccent }]}>Continue</Text>
                <Feather name="arrow-right" size={16} color={T.textOnAccent} />
              </>
            )}
          </Pressable>

          <View style={s.divider}>
            <View style={[s.divLine, { backgroundColor: T.borderSubtle }]} />
            <Text style={[s.divTxt, { color: T.textTertiary }]}>or continue with</Text>
            <View style={[s.divLine, { backgroundColor: T.borderSubtle }]} />
          </View>

          <Pressable
            style={[s.googleBtn, { backgroundColor: T.bg2, borderColor: T.borderSubtle }]}
            onPress={() => handleOAuth('google')}
            disabled={isLoading}
          >
            {oauthProvider === 'google' ? (
              <ActivityIndicator color={T.accent} size="small" />
            ) : (
              <>
                <View style={s.googleIconCircle}>
                  <Text style={s.googleG}>G</Text>
                </View>
                <Text style={[s.googleBtnTxt, { color: T.textSecondary }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[s.googleBtn, s.githubBtn, { backgroundColor: T.bg2, borderColor: T.borderSubtle }]}
            onPress={() => handleOAuth('github')}
            disabled={isLoading}
          >
            {oauthProvider === 'github' ? (
              <ActivityIndicator color={T.accent} size="small" />
            ) : (
              <>
                <View style={s.githubIconCircle}>
                  <Feather name="github" size={14} color="#FFFFFF" />
                </View>
                <Text style={[s.googleBtnTxt, { color: T.textSecondary }]}>Continue with GitHub</Text>
              </>
            )}
          </Pressable>
        </Reanimated.View>

        <Reanimated.View entering={FadeInUp.delay(200).springify()} style={s.signupRow}>
          <Text style={[s.signupNote, { color: T.textSecondary }]}>New to NexaPath?</Text>
          <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
            <Text style={[s.signupLink, { color: T.accent }]}> Create account</Text>
          </Pressable>
        </Reanimated.View>

        <Reanimated.View entering={FadeInUp.delay(280).springify()} style={s.features}>
          {[
            { icon: 'cpu', label: 'AI guidance' },
            { icon: 'map', label: 'Roadmaps' },
            { icon: 'users', label: 'Community' },
          ].map((item) => (
            <View key={item.label} style={[s.featurePill, { backgroundColor: T.surface, borderColor: T.borderSubtle }]}>
              <Feather name={item.icon as any} size={12} color={T.textTertiary} />
              <Text style={[s.featureTxt, { color: T.textTertiary }]}>{item.label}</Text>
            </View>
          ))}
        </Reanimated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  brandBlock: { paddingHorizontal: 24, paddingBottom: 18, alignItems: 'flex-start' },
  brandLogo: { width: 180, height: 80, marginBottom: 14, backgroundColor: 'transparent' },
  brandTitle: { fontFamily: SANS, fontSize: 38, letterSpacing: 0 },
  welcomeBlock: { paddingHorizontal: 24, paddingBottom: 18 },
  welcomeTitle: { fontFamily: SANS, fontSize: 24, letterSpacing: 0 },
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 18,
  },
  cardTopAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 22 },
  googleBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  githubBtn: { marginBottom: 0 },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  githubIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#171515',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: '#FFF', fontFamily: SANS, fontSize: 12 },
  googleBtnTxt: { fontFamily: SANS_MED, fontSize: 13 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  divLine: { flex: 1, height: 1 },
  divTxt: { fontFamily: SANS_REG, fontSize: 12 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontFamily: SANS_MED, fontSize: 12, marginBottom: 7 },
  fieldBox: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: { marginLeft: 14, marginRight: 8 },
  fieldInput: { flex: 1, fontFamily: SANS_REG, fontSize: 14, paddingRight: 10 },
  eyeBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  errorTxt: { fontFamily: SANS_REG, fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 18 },
  ctaBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  ctaBtnTxt: { fontFamily: SANS, fontSize: 16 },
  signupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  signupNote: { fontFamily: SANS_REG, fontSize: 14 },
  signupLink: { fontFamily: SANS_MED, fontSize: 14 },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    flexWrap: 'wrap',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 100,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  featureTxt: { fontFamily: SANS_MED, fontSize: 11 },
});
