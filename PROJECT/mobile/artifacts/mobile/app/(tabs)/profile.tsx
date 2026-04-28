'use no memo';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import Reanimated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCurrentUser, useGetUserDashboard, useLogoutAuth } from '@workspace/api-client-react';
import { clearMobileAccessToken } from '@/lib/api/runtime';
import { computeProfileCompleteness } from '@/lib/profileScore';
import { getBottomContentPadding } from '@/lib/layout';
import { useAIProfile } from '@/hooks/useAIProfile';
import { useTheme, SERIF, SANS, SANS_MED, SANS_REG } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Rank system ─────────────────────────────────────────────────────────────
const RANKS = ['Basecamp', 'Camp I', 'Camp II', 'Summit'];
const RANK_TIERS = 8;

function getRankInfo(skillScore: number): { name: string; tier: number; nextXP: number; xp: number } {
  const tier = Math.min(Math.floor(skillScore / (100 / RANK_TIERS)) + 1, RANK_TIERS);
  const rankIdx = Math.min(Math.floor((tier - 1) / 2), RANKS.length - 1);
  const xp = skillScore * 10;
  const nextXP = Math.min(tier * Math.ceil(1000 / RANK_TIERS), 1000);
  return { name: RANKS[rankIdx], tier, nextXP, xp };
}

// ─── Mountain header (light: sage; dark: forest) ──────────────────────────────
function ClimberMountainScene({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const H = 200;
  const W = SW;
  const BIRD_PATHS = [
    `M${W * 0.18},${H * 0.24} q3,-4 6,0 q3,4 6,0`,
    `M${W * 0.32},${H * 0.16} q3,-3.5 5.5,0 q3,3.5 5.5,0`,
    `M${W * 0.55},${H * 0.20} q2.5,-3 5,0 q2.5,3 5,0`,
  ];

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <SvgGradient id="sceneGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.sky1} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.sky2} stopOpacity="1" />
        </SvgGradient>
        <SvgGradient id="sceneOverlay" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.5" stopColor={theme.bg} stopOpacity="0" />
          <Stop offset="1" stopColor={theme.bg} stopOpacity="1" />
        </SvgGradient>
      </Defs>

      {/* Sky */}
      <Rect x={0} y={0} width={W} height={H} fill="url(#sceneGrad)" />

      {/* Sun / Moon */}
      <Circle cx={W * 0.85} cy={H * 0.18} r={22} fill={theme.isDark ? '#FDEDC0' : '#FDEDC0'} opacity={theme.isDark ? 0.85 : 0.95} />
      <Circle cx={W * 0.85} cy={H * 0.18} r={30} fill={theme.isDark ? '#FDEDC0' : '#FDEDC0'} opacity={0.14} />

      {/* Far mountains */}
      <Path
        d={`M0,${H} L${W * 0.08},${H * 0.55} L${W * 0.18},${H * 0.65} L${W * 0.30},${H * 0.45} L${W * 0.42},${H * 0.58} L${W * 0.55},${H * 0.38} L${W * 0.65},${H * 0.50} L${W * 0.78},${H * 0.35} L${W * 0.90},${H * 0.48} L${W},${H * 0.42} L${W},${H} Z`}
        fill={theme.mtn1}
        opacity={0.85}
      />

      {/* Mid mountains */}
      <Path
        d={`M0,${H} L${W * 0.12},${H * 0.70} L${W * 0.24},${H * 0.78} L${W * 0.38},${H * 0.60} L${W * 0.52},${H * 0.72} L${W * 0.65},${H * 0.56} L${W * 0.76},${H * 0.68} L${W * 0.88},${H * 0.58} L${W},${H * 0.62} L${W},${H} Z`}
        fill={theme.mtn2}
      />

      {/* Near hills */}
      <Path
        d={`M0,${H} L${W * 0.18},${H * 0.82} L${W * 0.36},${H * 0.88} L${W * 0.54},${H * 0.76} L${W * 0.72},${H * 0.84} L${W * 0.88},${H * 0.78} L${W},${H * 0.82} L${W},${H} Z`}
        fill={theme.mtn3}
      />

      {/* Birds */}
      {BIRD_PATHS.map((d, i) => (
        <Path key={i} d={d} stroke={theme.isDark ? theme.text : theme.mtn1} strokeWidth={1.4} fill="none" opacity={0.70} />
      ))}

      {/* Bottom gradient blend */}
      <Rect x={0} y={H * 0.55} width={W} height={H * 0.45} fill="url(#sceneOverlay)" />
    </Svg>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({
  label, value, sub, color, theme,
}: { label: string; value: string; sub: string; color: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[sp.pill, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
      <Text style={[sp.label, { color: theme.textTertiary }]}>{label}</Text>
      <Text style={[sp.value, { color }]}>{value}</Text>
      <Text style={[sp.sub, { color: theme.textTertiary }]}>{sub}</Text>
    </View>
  );
}

const sp = StyleSheet.create({
  pill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: 1, gap: 3 },
  label: { fontFamily: SANS_MED, fontSize: 8, letterSpacing: 1.2 },
  value: { fontFamily: SANS, fontSize: 17 },
  sub: { fontFamily: SANS_REG, fontSize: 9, textAlign: 'center' },
});

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color, bg }: { pct: number; color: string; bg: string }) {
  return (
    <View style={[pb.track, { backgroundColor: bg }]}>
      <View style={[pb.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4 },
});

// ─── Menu item ────────────────────────────────────────────────────────────────
function MenuItem({
  icon, label, sublabel, color, onPress, showBadge, theme,
}: {
  icon: string; label: string; sublabel?: string;
  color?: string; onPress?: () => void; showBadge?: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const scale = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const col = color ?? theme.textSecondary;
  return (
    <Reanimated.View style={a}>
      <Pressable
        style={[mi.item, { borderBottomColor: theme.borderSubtle }]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.985); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <View style={[mi.icon, { backgroundColor: col + '14', borderColor: col + '30' }]}>
          <Feather name={icon as any} size={16} color={col} />
        </View>
        <View style={mi.label}>
          <Text style={[mi.text, { color: theme.text }]}>{label}</Text>
          {sublabel && <Text style={[mi.sub, { color: theme.textTertiary }]}>{sublabel}</Text>}
        </View>
        {showBadge && (
          <View style={[mi.badge, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '40' }]}>
            <Text style={[mi.badgeText, { color: theme.accent }]}>NEW</Text>
          </View>
        )}
        <Feather name="chevron-right" size={16} color={theme.textTertiary} />
      </Pressable>
    </Reanimated.View>
  );
}

const mi = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 15, borderBottomWidth: 1 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  label: { flex: 1 },
  text: { fontFamily: SANS_MED, fontSize: 13, letterSpacing: 0.1 },
  sub: { fontFamily: SANS_REG, fontSize: 11, marginTop: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 0.8 },
});

// ─── Skill bar ────────────────────────────────────────────────────────────────
function SkillElevationBar({ name, level, color, theme }: {
  name: string; level: number; color: string; theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: SANS_MED, fontSize: 12, color: theme.text }}>{name}</Text>
        <Text style={{ fontFamily: SANS_MED, fontSize: 11, color: theme.textSecondary }}>{level}%</Text>
      </View>
      <ProgressBar pct={level} color={color} bg={theme.bg2} />
    </View>
  );
}

// ─── Checkpoint milestone ─────────────────────────────────────────────────────
function Milestones({ completed, theme }: { completed: number; theme: ReturnType<typeof useTheme> }) {
  const nodes = ['Basecamp', 'Camp I', 'Camp II', 'Summit'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      {nodes.map((n, i) => {
        const done = i < completed;
        const active = i === completed;
        return (
          <React.Fragment key={n}>
            <View style={{ alignItems: 'center' }}>
              <View style={[
                { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
                done ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : active ? { backgroundColor: theme.warm, borderColor: theme.warm }
                    : { backgroundColor: 'transparent', borderColor: theme.borderSubtle },
              ]} />
              <Text style={{ fontFamily: SANS_MED, fontSize: 7, color: active ? theme.warm : done ? theme.accent : theme.textTertiary, marginTop: 3, letterSpacing: 0.3 }} numberOfLines={1}>
                {n}
              </Text>
            </View>
            {i < nodes.length - 1 && (
              <View style={{ flex: 1, height: 2, backgroundColor: done ? theme.accent : theme.borderSubtle, marginHorizontal: 2, marginBottom: 12 }} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();

  const { data: currentUserResponse } = useGetCurrentUser();
  const { data: dashboardResponse } = useGetUserDashboard();
  const { profile: aiProfile, summary: aiSummary } = useAIProfile();

  const currentUserEnvelope =
    currentUserResponse && typeof currentUserResponse === 'object' && 'data' in currentUserResponse
      ? (currentUserResponse.data as unknown as Record<string, unknown>)
      : {};
  const currentUser =
    currentUserEnvelope.user && typeof currentUserEnvelope.user === 'object'
      ? (currentUserEnvelope.user as Record<string, unknown>)
      : {};
  const dashboard =
    dashboardResponse && typeof dashboardResponse === 'object' && 'data' in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};
  const profile = dashboard.profile && typeof dashboard.profile === 'object'
    ? (dashboard.profile as Record<string, unknown>)
    : {};

  const fullName = String(profile.full_name ?? currentUser.full_name ?? currentUser.email ?? 'Explorer');
  const email = String(currentUser.email ?? '');
  const joined = String(currentUser.created_at ?? '').slice(0, 10);
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const shortName = `${fullName.split(' ')[0]} ${(fullName.split(' ')[1]?.[0] ?? '')}${fullName.split(' ')[1] ? '.' : ''}`;

  const skills = Array.isArray(dashboard.skills)
    ? dashboard.skills
        .map((item) => (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {}))
        .map((skill, idx) => {
          const rawLevel = typeof skill.proficiency_level === 'number' ? skill.proficiency_level : typeof skill.level === 'number' ? skill.level : 0;
          const level = rawLevel <= 5 ? Math.round((rawLevel / 5) * 100) : Math.max(0, Math.min(100, rawLevel));
          return { id: String(skill.id ?? `s-${idx}`), name: String(skill.name ?? `Skill ${idx + 1}`), level };
        })
    : [];

  const gapStats = dashboard.gapStatistics && typeof dashboard.gapStatistics === 'object'
    ? (dashboard.gapStatistics as Record<string, unknown>)
    : {};
  const skillScore = computeProfileCompleteness(profile, skills);
  const highPriority = typeof gapStats.high_priority_count === 'number' ? gapStats.high_priority_count : 0;
  const aiTopGoal = aiSummary?.top_goal || (Array.isArray(aiProfile?.goals) && aiProfile.goals.length > 0 ? aiProfile.goals[0] : null);
  const aiHint = aiSummary?.profile_completion_hint || 'Chat with the AI Assistant to enrich your profile.';

  const rankInfo = getRankInfo(skillScore);
  const earnedAch = [skills.length > 0, Boolean(aiTopGoal), highPriority > 0].filter(Boolean).length;
  const mantraQuotes = [
    '"Yesterday ended last night. Today is fresh — lace up and climb."',
    '"Every ascent begins with a single step forward."',
    '"The peak is earned, not given. One day at a time."',
  ];
  const mantra = mantraQuotes[new Date().getDate() % mantraQuotes.length];

  const onSignOut = async () => {
    try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
    await clearMobileAccessToken();
    queryClient.clear();
    router.replace('/login');
  };

  const s = makeStyles(theme);

  return (
    <Reanimated.View entering={FadeIn.duration(260)} style={[s.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) }}
      >

        {/* ── Mountain Scene Header ── */}
        <View style={{ position: 'relative' }}>
          <View style={{ paddingTop: Platform.OS === 'web' ? insets.top + 60 : insets.top }}>
            <ClimberMountainScene theme={theme} />
          </View>
          {/* Header controls overlay */}
          <View style={[s.sceneHeader, { paddingTop: Platform.OS === 'web' ? insets.top + 60 : insets.top + 14 }]}>
            <View>
              <Text style={[s.sceneEye, { color: theme.textSecondary }]}>CLIMBER · ID 000001</Text>
              <Text style={[s.sceneTitle, { color: theme.text }]}>My climb</Text>
            </View>
          </View>
        </View>

        <View style={s.body}>

          {/* ── Profile Card ── */}
          <Reanimated.View entering={FadeInDown.delay(60).springify().damping(14)}>
            <View style={[s.profileCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              {/* Avatar + identity */}
              <View style={s.profileTop}>
                <View style={[s.avatar, { backgroundColor: theme.accent }]}>
                  <Text style={[s.avatarText, { color: theme.textOnAccent }]}>{initials}</Text>
                </View>
                <View style={s.profileInfo}>
                  <Text style={[s.profileName, { color: theme.text }]}>{shortName}</Text>
                  <Text style={[s.profileSince, { color: theme.textSecondary }]}>
                    Climbing since Day 001
                  </Text>
                  {email ? (
                    <View style={s.emailRow}>
                      <Feather name="mail" size={11} color={theme.textTertiary} />
                      <Text style={[s.emailText, { color: theme.textTertiary }]} numberOfLines={1}>{email}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Stats row */}
              <View style={s.statsRow}>
                <StatPill
                  label="RANK"
                  value={rankInfo.name}
                  sub={`Tier ${rankInfo.tier} of ${RANK_TIERS}`}
                  color={theme.gold}
                  theme={theme}
                />
                <View style={[s.statDivider, { backgroundColor: theme.borderSubtle }]} />
                <StatPill
                  label="STREAK"
                  value="0 days"
                  sub="Start today +"
                  color={theme.warm}
                  theme={theme}
                />
                <View style={[s.statDivider, { backgroundColor: theme.borderSubtle }]} />
                <StatPill
                  label="BADGES"
                  value={String(earnedAch)}
                  sub={earnedAch === 0 ? 'None yet' : 'Earned'}
                  color={earnedAch > 0 ? theme.accent : theme.textTertiary}
                  theme={theme}
                />
              </View>
            </View>
          </Reanimated.View>

          {/* ── Today's Mantra ── */}
          <Reanimated.View entering={FadeInDown.delay(120).springify()}>
            <View style={[s.mantraCard, { backgroundColor: theme.surfaceWarm, borderColor: theme.warm + '30' }]}>
              <View style={s.mantraHeader}>
                <View style={[s.mantraIconWrap, { backgroundColor: theme.warm + '25' }]}>
                  <Feather name="sun" size={14} color={theme.warm} />
                </View>
                <Text style={[s.mantraEye, { color: theme.warm }]}>TODAY'S MANTRA</Text>
              </View>
              <Text style={[s.mantraText, { color: theme.text }]}>{mantra}</Text>
            </View>
          </Reanimated.View>

          {/* ── Next Checkpoint ── */}
          <Reanimated.View entering={FadeInDown.delay(180).springify()}>
            <View style={[s.checkCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <View style={s.checkHeader}>
                <View>
                  <Text style={[s.checkEye, { color: theme.textTertiary }]}>NEXT CHECKPOINT</Text>
                  <Text style={[s.checkTitle, { color: theme.text }]}>{rankInfo.name === 'Summit' ? 'You reached the Summit!' : `${RANKS[Math.min(RANKS.indexOf(rankInfo.name) + 1, RANKS.length - 1)]} · Foothills`}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.checkXP, { color: theme.accent }]}>{rankInfo.xp}<Text style={[s.checkXPLabel, { color: theme.textTertiary }]}>/100</Text></Text>
                  <Text style={[s.checkXPSub, { color: theme.textTertiary }]}>XP</Text>
                </View>
              </View>

              <Milestones completed={RANKS.indexOf(rankInfo.name)} theme={theme} />
              <ProgressBar pct={skillScore} color={theme.accent} bg={theme.bg2} />
              <Text style={[s.checkFooter, { color: theme.textTertiary }]}>
                {100 - skillScore} XP away — closer than it feels
              </Text>
            </View>
          </Reanimated.View>

          {/* ── Skill Elevation ── */}
          {skills.length > 0 && (
            <Reanimated.View entering={FadeInDown.delay(240).springify()}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionLabel, { color: theme.text }]}>Skill Elevation</Text>
                <Text style={[s.sectionMeta, { color: theme.textTertiary }]}>12 WEEKS · TARGET</Text>
              </View>
              <View style={[s.skillCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                {skills.slice(0, 5).map((skill, idx) => (
                  <SkillElevationBar
                    key={skill.id}
                    name={skill.name}
                    level={skill.level}
                    color={skill.level >= 80 ? theme.accent : skill.level >= 50 ? theme.primary : theme.warm}
                    theme={theme}
                  />
                ))}
              </View>
            </Reanimated.View>
          )}

          {/* ── AI Insights ── */}
          {aiTopGoal && (
            <Reanimated.View entering={FadeInDown.delay(300).springify()}>
              <View style={s.sectionHeader}>
                <Text style={[s.sectionLabel, { color: theme.text }]}>AI Insights</Text>
                <View style={[s.liveBadge, { backgroundColor: theme.accent + '20', borderColor: theme.accent + '40' }]}>
                  <View style={[s.liveDot, { backgroundColor: theme.accent }]} />
                  <Text style={[s.liveTxt, { color: theme.accent }]}>LIVE</Text>
                </View>
              </View>
              <View style={[s.insightCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
                <Text style={[s.insightLabel, { color: theme.textTertiary }]}>TARGET GOAL</Text>
                <Text style={[s.insightValue, { color: theme.text }]}>{aiTopGoal}</Text>
                <Text style={[s.insightHint, { color: theme.textSecondary }]}>{aiHint}</Text>
              </View>
            </Reanimated.View>
          )}

          {/* ── Account Menu ── */}
          <Reanimated.View entering={FadeInDown.delay(360).springify()}>
            <Text style={[s.sectionLabelStandalone, { color: theme.textSecondary }]}>Account</Text>
            <View style={[s.menuCard, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <MenuItem icon="edit-3" label="Edit Profile" sublabel="Update skills & details" color={theme.primary} onPress={() => router.push('/settings')} theme={theme} />
              <MenuItem icon="star" label="Recommendations" sublabel="View AI guidance" color={theme.accent} onPress={() => router.push('/recommendations')} theme={theme} />
              <MenuItem icon="cpu" label="AI Roadmap" sublabel="Start assessment" color={theme.primary} onPress={() => router.push('/onboarding-chat')} showBadge theme={theme} />
              <MenuItem icon="shield" label="Privacy" sublabel="Manage account safety" color={theme.accent} onPress={() => router.push('/settings')} theme={theme} />
              <MenuItem icon="help-circle" label="Help & Support" sublabel="Docs & support" color={theme.gold} onPress={() => router.push('/settings')} theme={theme} />
              <View style={{ borderBottomWidth: 0 }}>
                <MenuItem icon="log-out" label="Sign Out" sublabel="End session" color="#EF4444" onPress={onSignOut} theme={theme} />
              </View>
            </View>
          </Reanimated.View>

        </View>
      </ScrollView>
    </Reanimated.View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    root: { flex: 1 },
    body: { paddingHorizontal: 16, paddingTop: 8 },

    // Scene header overlay
    sceneHeader: {
      position: 'absolute', top: 0, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingHorizontal: 20,
    },
    sceneEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.5, marginBottom: 4 },
    sceneTitle: { fontFamily: SERIF, fontSize: 34, fontStyle: 'italic', letterSpacing: 0.2 },
    sceneRight: { flexDirection: 'row', gap: 8, paddingTop: 6 },
    sceneBtn: {
      width: 38, height: 38, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    },

    // Profile card
    profileCard: {
      borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 12,
    },
    profileTop: { flexDirection: 'row', gap: 14, marginBottom: 16, alignItems: 'flex-start' },
    avatar: {
      width: 60, height: 60, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontFamily: SANS, fontSize: 22 },
    profileInfo: { flex: 1 },
    profileName: { fontFamily: SANS, fontSize: 18, letterSpacing: -0.3, marginBottom: 3 },
    profileSince: { fontFamily: SANS_REG, fontSize: 12, marginBottom: 5 },
    emailRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    emailText: { fontFamily: SANS_REG, fontSize: 11, flex: 1 },
    statsRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    statDivider: { width: 1, marginVertical: 8 },

    // Mantra card
    mantraCard: {
      borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
    },
    mantraHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    mantraIconWrap: {
      width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    },
    mantraEye: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 1.2 },
    mantraText: {
      fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 24, letterSpacing: 0.2,
    },

    // Checkpoint card
    checkCard: {
      borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12,
    },
    checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    checkEye: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 },
    checkTitle: { fontFamily: SANS, fontSize: 17, letterSpacing: -0.3 },
    checkXP: { fontFamily: SANS, fontSize: 22 },
    checkXPLabel: { fontFamily: SANS_MED, fontSize: 13 },
    checkXPSub: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 0.8 },
    checkFooter: { fontFamily: SANS_REG, fontSize: 11, marginTop: 8, fontStyle: 'italic' },

    // Sections
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
    sectionLabel: { fontFamily: SANS, fontSize: 16, letterSpacing: -0.2 },
    sectionMeta: { fontFamily: SANS_MED, fontSize: 10, letterSpacing: 0.8 },
    sectionLabelStandalone: { fontFamily: SANS_MED, fontSize: 12, letterSpacing: 1.2, marginBottom: 10, marginTop: 8 },

    // Skill card
    skillCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12 },

    // AI Insight card
    insightCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 12 },
    insightLabel: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 1.5, marginBottom: 6 },
    insightValue: { fontFamily: SANS_MED, fontSize: 14, lineHeight: 22, marginBottom: 10 },
    insightHint: { fontFamily: SANS_REG, fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

    // Live badge
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    liveDot: { width: 5, height: 5, borderRadius: 3 },
    liveTxt: { fontFamily: SANS_MED, fontSize: 9, letterSpacing: 0.8 },

    // Menu
    menuCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  });
}
