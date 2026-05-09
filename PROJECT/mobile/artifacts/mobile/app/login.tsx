'use no memo';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import Reanimated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useLoginAuth } from '@workspace/api-client-react';
import { storeMobileAccessToken, resetApiRuntime, getMobileApiBaseUrl } from '@/lib/api/runtime';
import { SERIF, SANS, SANS_MED, SANS_REG, DarkTheme } from '@/constants/theme';

WebBrowser.maybeCompleteAuthSession();

const { width: SW } = Dimensions.get('window');
const T = DarkTheme; // Login always uses dark theme

// ─── Login-specific progress scene ────────────────────────────────────────────
const STAR_POS = [
  { cx: 22, cy: 18, r: 1.3, op: 0.7 },
  { cx: 60, cy: 10, r: 0.9, op: 0.5 },
  { cx: 98, cy: 26, r: 1.3, op: 0.8 },
  { cx: 145, cy: 14, r: 0.9, op: 0.6 },
  { cx: 175, cy: 6, r: 1.3, op: 0.65 },
  { cx: 218, cy: 22, r: 0.9, op: 0.55 },
  { cx: 255, cy: 12, r: 1.3, op: 0.88 },
  { cx: 292, cy: 18, r: 0.9, op: 0.60 },
  { cx: 328, cy: 8, r: 1.3, op: 0.70 },
  { cx: 355, cy: 30, r: 0.9, op: 0.48 },
];

function LoginProgressScene() {
  const H = 180;
  const W = SW;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="loginSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#060E07" />
          <Stop offset="1" stopColor={T.bg} />
        </SvgGradient>
        <SvgGradient id="loginFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.4" stopColor={T.bg} stopOpacity="0" />
          <Stop offset="1" stopColor={T.bg} stopOpacity="1" />
        </SvgGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill="url(#loginSky)" />
      {STAR_POS.map((s, i) => (
        <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={T.starColor} opacity={s.op} />
      ))}
      {/* Far progress layers */}
      <Path
        d={`M0,${H} L${W*0.06},${H*0.48} L${W*0.14},${H*0.58} L${W*0.22},${H*0.38} L${W*0.30},${H*0.52} L${W*0.40},${H*0.30} L${W*0.50},${H*0.45} L${W*0.60},${H*0.28} L${W*0.70},${H*0.40} L${W*0.80},${H*0.25} L${W*0.90},${H*0.36} L${W},${H*0.30} L${W},${H} Z`}
        fill={T.mtn1}
      />
      {/* Mid progress layers */}
      <Path
        d={`M0,${H} L${W*0.10},${H*0.60} L${W*0.22},${H*0.70} L${W*0.35},${H*0.52} L${W*0.48},${H*0.64} L${W*0.60},${H*0.47} L${W*0.72},${H*0.60} L${W*0.84},${H*0.44} L${W*0.94},${H*0.55} L${W},${H*0.50} L${W},${H} Z`}
        fill={T.mtn2}
      />
      {/* Near hills */}
      <Path
        d={`M0,${H} L${W*0.18},${H*0.76} L${W*0.36},${H*0.84} L${W*0.54},${H*0.72} L${W*0.72},${H*0.80} L${W*0.90},${H*0.74} L${W},${H*0.78} L${W},${H} Z`}
        fill={T.mtn3}
      />
      {/* Dotted path */}
      <Path
        d={`M${W*0.20},${H*0.96} C${W*0.40},${H*0.72} ${W*0.62},${H*0.52} ${W*0.80},${H*0.27}`}
        stroke={T.pathColor}
        strokeWidth={1.6}
        strokeDasharray="4,6"
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx={W*0.80} cy={H*0.25} r={3.5} fill={T.warm} opacity={0.9} />
      <Circle cx={W*0.80} cy={H*0.25} r={7} fill={T.warm} opacity={0.16} />
      <Rect x={0} y={H*0.6} width={W} height={H*0.4} fill="url(#loginFade)" />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusPass, setFocusPass] = useState(false);

  const loginMutation = useLoginAuth();
  const isLoading = loginMutation.isPending;

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
      if (!token) { setError('Authentication failed — please try again.'); return; }
      await storeMobileAccessToken(token);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Sign in failed';
      if (msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('timeout')) {
        setError('Connection timeout — check that the server is running.');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: T.bg }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Progress hero ── */}
        <View style={s.heroWrap}>
          <LoginProgressScene />
          {/* Brand overlay */}
          <View style={[s.brandOverlay, { paddingTop: insets.top + 18 }]}>
            <Text style={[s.brandEye, { color: T.textTertiary }]}>NEXAPATH</Text>
            <Text style={[s.brandTitle, { color: T.text }]}>Lace up.</Text>
          </View>
        </View>

        {/* ── Welcome copy ── */}
        <Reanimated.View entering={FadeInDown.delay(60).springify()} style={s.welcomeBlock}>
          <Text style={[s.welcomeTitle, { color: T.text }]}>Welcome back.</Text>
          <Text style={[s.welcomeSub, { color: T.textSecondary }]}>
            Continue your learning plan. Sign in to resume your path.
          </Text>
        </Reanimated.View>

        {/* ── Form card ── */}
        <Reanimated.View entering={FadeInDown.delay(120).springify()} style={[s.card, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[s.cardTopAccent, { backgroundColor: T.accent }]} />

          {/* Google button */}
          <Pressable
            style={[s.googleBtn, { backgroundColor: T.bg2, borderColor: T.borderSubtle }]}
            onPress={() => setError('Google Sign-In requires OAuth configuration.')}
            disabled={isLoading}
          >
            <View style={s.googleIconCircle}>
              <Text style={s.googleG}>G</Text>
            </View>
            <Text style={[s.googleBtnTxt, { color: T.textSecondary }]}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={[s.divLine, { backgroundColor: T.borderSubtle }]} />
            <Text style={[s.divTxt, { color: T.textTertiary }]}>or with email</Text>
            <View style={[s.divLine, { backgroundColor: T.borderSubtle }]} />
          </View>

          {/* Email */}
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

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={[s.fieldLabel, { color: T.textSecondary }]}>Password</Text>
            <View style={[s.fieldBox, { backgroundColor: T.bg2, borderColor: focusPass ? T.accent : T.borderSubtle }]}>
              <Feather name="lock" size={15} color={focusPass ? T.accent : T.textTertiary} style={s.fieldIcon} />
              <TextInput
                style={[s.fieldInput, { color: T.text }]}
                placeholder="••••••••"
                placeholderTextColor={T.textTertiary}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusPass(true)}
                onBlur={() => setFocusPass(false)}
                autoComplete="password"
              />
              <Pressable onPress={() => setShowPass(p => !p)} style={s.eyeBtn} hitSlop={8}>
                <Feather name={showPass ? 'eye' : 'eye-off'} size={15} color={T.textTertiary} />
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {error ? (
            <Reanimated.View entering={FadeInDown.duration(200)} style={[s.errorBox, { backgroundColor: '#EF444418', borderColor: '#EF444440' }]}>
              <Feather name="alert-circle" size={13} color="#EF4444" />
              <Text style={s.errorTxt}>{error}</Text>
            </Reanimated.View>
          ) : null}

          {/* Sign in CTA */}
          <Pressable
            style={[s.ctaBtn, { backgroundColor: T.accent }, isLoading && { opacity: 0.65 }]}
            onPress={submitLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={T.textOnAccent} size="small" />
            ) : (
              <>
                <Text style={[s.ctaBtnTxt, { color: T.textOnAccent }]}>Begin my plan</Text>
                <Feather name="arrow-right" size={16} color={T.textOnAccent} />
              </>
            )}
          </Pressable>
        </Reanimated.View>

        {/* ── Create account ── */}
        <Reanimated.View entering={FadeInUp.delay(200).springify()} style={s.signupRow}>
          <Text style={[s.signupNote, { color: T.textSecondary }]}>New to NexaPath?</Text>
          <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
            <Text style={[s.signupLink, { color: T.accent }]}>  Create account  →</Text>
          </Pressable>
        </Reanimated.View>

        {/* ── Feature highlights ── */}
        <Reanimated.View entering={FadeInUp.delay(280).springify()} style={s.features}>
          {[
            { icon: 'cpu', label: 'AI-powered path' },
            { icon: 'map', label: 'Custom roadmaps' },
            { icon: 'trending-up', label: 'Career growth' },
          ].map((item, i) => (
            <View key={i} style={[s.featurePill, { backgroundColor: T.surface, borderColor: T.borderSubtle }]}>
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

  heroWrap: { position: 'relative', marginBottom: 0 },
  brandOverlay: {
    position: 'absolute', top: 0, left: 22, right: 22,
  },
  brandEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 2.5, marginBottom: 4 },
  brandTitle: { fontFamily: SANS, fontSize: 42, letterSpacing: -1.5 },

  welcomeBlock: { paddingHorizontal: 24, paddingBottom: 20 },
  welcomeTitle: { fontFamily: SERIF, fontSize: 28, fontStyle: 'italic', letterSpacing: 0.2, marginBottom: 6 },
  welcomeSub: { fontFamily: SANS_REG, fontSize: 14, lineHeight: 20 },

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
    marginBottom: 18,
  },
  googleIconCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  googleG: { color: '#FFF', fontFamily: SANS, fontSize: 12 },
  googleBtnTxt: { fontFamily: SANS_MED, fontSize: 13 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  divLine: { flex: 1, height: 1 },
  divTxt: { fontFamily: SANS_REG, fontSize: 12 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontFamily: SANS_MED, fontSize: 12, marginBottom: 7 },
  fieldBox: {
    height: 50, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  fieldIcon: { marginLeft: 14, marginRight: 8 },
  fieldInput: { flex: 1, fontFamily: SANS_REG, fontSize: 14, paddingRight: 10 },
  eyeBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 12,
  },
  errorTxt: { fontFamily: SANS_REG, fontSize: 12, color: '#EF4444', flex: 1, lineHeight: 18 },

  ctaBtn: {
    height: 52, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 4, marginBottom: 4,
  },
  ctaBtnTxt: { fontFamily: SANS, fontSize: 16 },

  signupRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, paddingHorizontal: 24,
  },
  signupNote: { fontFamily: SANS_REG, fontSize: 14 },
  signupLink: { fontFamily: SANS_MED, fontSize: 14 },

  features: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 8, paddingHorizontal: 24, flexWrap: 'wrap',
  },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 100, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  featureTxt: { fontFamily: SANS_MED, fontSize: 11 },
});
