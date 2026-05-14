'use no memo';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import Reanimated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCurrentUser, useGetUserDashboard } from '@workspace/api-client-react';
import { computeProfileCompleteness } from '@/lib/profileScore';
import { getBottomContentPadding } from '@/lib/layout';
import { useAIProfile } from '@/hooks/useAIProfile';
import { useTheme, SANS, SANS_MED, SANS_REG } from '@/constants/theme';

// ─── Rank system ─────────────────────────────────────────────────────────────
const RANKS = ['Starter', 'Learner', 'Advanced', 'Expert'];
const RANK_TIERS = 8;

function getRankInfo(skillScore: number): { name: string; tier: number; nextXP: number; xp: number } {
  const tier = Math.min(Math.floor(skillScore / (100 / RANK_TIERS)) + 1, RANK_TIERS);
  const rankIdx = Math.min(Math.floor((tier - 1) / 2), RANKS.length - 1);
  const xp = skillScore * 10;
  const nextXP = Math.min(tier * Math.ceil(1000 / RANK_TIERS), 1000);
  return { name: RANKS[rankIdx], tier, nextXP, xp };
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
// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
  const initials = fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

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

  const s = makeStyles(theme);

  return (
    <Reanimated.View entering={FadeIn.duration(260)} style={[s.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) }}
      >

        <View style={{ paddingTop: Platform.OS === 'web' ? insets.top + 76 : insets.top + 16 }} />

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
                  <Text style={[s.profileName, { color: theme.text }]} numberOfLines={2}>{fullName}</Text>
                  <Text style={[s.profileSince, { color: theme.textSecondary }]}>
                    Active since Day 001
                  </Text>
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
              <View style={{ borderBottomWidth: 0 }}>
                <MenuItem icon="settings" label="User Settings" sublabel="Account, appearance & sign out" color={theme.primary} onPress={() => router.push('/settings')} theme={theme} />
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
    statsRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    statDivider: { width: 1, marginVertical: 8 },

    // Checkpoint card
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
