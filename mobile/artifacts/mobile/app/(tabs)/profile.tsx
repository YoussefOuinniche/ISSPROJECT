import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { MotionPressable } from "@/components/MotionPressable";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useGetCurrentUser, useGetUserDashboard, useLogoutAuth } from "@workspace/api-client-react";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { getBottomContentPadding } from "@/lib/layout";
import { useAIProfile } from "@/hooks/useAIProfile";

function MenuItem({
  icon,
  label,
  sublabel,
  color = Colors.textSecondary,
  onPress,
  showBadge,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress?: () => void;
  showBadge?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.menuLabel}>
        <Text style={styles.menuText}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      {showBadge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>New</Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();

  const { data: currentUserResponse } = useGetCurrentUser();
  const { data: dashboardResponse, refetch } = useGetUserDashboard();
  const { profile: aiProfile, summary: aiSummary } = useAIProfile();

  const currentUserEnvelope =
    currentUserResponse && typeof currentUserResponse === "object" && "data" in currentUserResponse
      ? (currentUserResponse.data as unknown as Record<string, unknown>)
      : {};

  const currentUser =
    currentUserEnvelope.user && typeof currentUserEnvelope.user === "object"
      ? (currentUserEnvelope.user as Record<string, unknown>)
      : {};

  const dashboard =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};

  const profile = dashboard.profile && typeof dashboard.profile === "object"
    ? (dashboard.profile as Record<string, unknown>)
    : {};

  const fullName = String(profile.full_name ?? currentUser.full_name ?? currentUser.email ?? "SkillPulse User");
  const title = String(profile.title ?? "Professional");
  const company = String(profile.domain ?? "SkillPulse");
  const joined = String(currentUser.created_at ?? "Recently").slice(0, 10);

  const skills = Array.isArray(dashboard.skills)
    ? dashboard.skills
        .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
        .map((skill, idx) => {
          const rawLevel = typeof skill.proficiency_level === "number" ? skill.proficiency_level : typeof skill.level === "number" ? skill.level : 0;
          const level = rawLevel <= 5 ? Math.round((rawLevel / 5) * 100) : Math.max(0, Math.min(100, rawLevel));
          return {
            id: String(skill.id ?? `skill-${idx}`),
            name: String(skill.name ?? skill.full_name ?? `Skill ${idx + 1}`),
            level,
          };
        })
    : [];

  const gapStats = dashboard.gapStatistics && typeof dashboard.gapStatistics === "object"
    ? (dashboard.gapStatistics as Record<string, unknown>)
    : {};

  const skillScore = computeProfileCompleteness(profile, skills);
  const highPriority = typeof gapStats.high_priority_count === "number" ? gapStats.high_priority_count : 0;
  const aiTopSkills = Array.isArray(aiProfile?.skills) ? aiProfile.skills.slice(0, 3) : [];
  const aiTopGoal =
    aiSummary?.top_goal ||
    (Array.isArray(aiProfile?.goals) && aiProfile.goals.length > 0 ? aiProfile.goals[0] : null);
  const aiHint =
    aiSummary?.profile_completion_hint ||
    "Chat with the AI Assistant to enrich your profile and sharpen recommendations.";

  const achievements = [
    { id: "ach-1", title: "Profile Synced", icon: "check-circle", color: Colors.success, earned: true },
    { id: "ach-2", title: "Skills Mapped", icon: "target", color: Colors.primary, earned: skills.length > 0 },
    { id: "ach-3", title: "Gap Tracked", icon: "zap", color: Colors.warning, earned: highPriority > 0 },
  ];

  const onSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Clear local session even if remote logout fails.
    }
    await clearMobileAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <AnimatedSection style={styles.header} variant="up">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require("@/assets/images/logo-nexapath.png")}
            style={{ width: 28, height: 28 }}
          />
          <Text style={styles.screenTitle}>Profile</Text>
        </View>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push("/settings")}
        >
          <Feather name="settings" size={20} color={Colors.textSecondary} />
        </Pressable>
      </AnimatedSection>

      {/* Profile Hero */}
      <AnimatedSection delay={40}>
      <View style={styles.heroCard}>
        <View style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Pressable style={styles.avatarEdit}>
              <Feather name="camera" size={12} color={Colors.textPrimary} />
            </Pressable>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroCompany}>{company}</Text>
            <View style={styles.heroMeta}>
              <Badge label={`Member since ${joined}`} variant="neutral" size="sm" />
            </View>
          </View>
        </View>
      </View>
      </AnimatedSection>

      {/* Score Overview */}
      <AnimatedSection delay={80}>
      <GlassCard style={styles.scoreCard} padding={24} radius={20}>
        <Text style={styles.sectionTitle}>Skill Score</Text>
        <View style={styles.scoreRow}>
          <ScoreRing
            score={skillScore}
            size={110}
            strokeWidth={8}
            primaryColor={Colors.primary}
            trackColor={Colors.backgroundSecondary}
            label="SCORE"
          />
          <View style={styles.scoreStats}>
            <View style={styles.scoreStat}>
              <Text style={styles.scoreStatValue}>Top 18%</Text>
              <Text style={styles.scoreStatLabel}>in your field</Text>
            </View>
            <View style={styles.scoreStatDivider} />
            <View style={styles.scoreStat}>
              <AnimatedCounter
                value={Math.max(1, Math.round(skillScore / 20))}
                prefix="+"
                style={[styles.scoreStatValue, { color: Colors.success }]}
              />
              <Text style={styles.scoreStatLabel}>this week</Text>
            </View>
            <View style={styles.scoreStatDivider} />
            <View style={styles.scoreStat}>
              <AnimatedCounter
                value={Math.max(1, skills.length)}
                style={[styles.scoreStatValue, { color: Colors.warning }]}
              />
              <Text style={styles.scoreStatLabel}>day streak</Text>
            </View>
          </View>
        </View>
      </GlassCard>
      </AnimatedSection>

      {/* Achievements */}
      <AnimatedSection delay={120} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.sectionMeta}>
          {achievements.filter((a) => a.earned).length}/{achievements.length} earned
        </Text>
      </AnimatedSection>
      <AnimatedSection delay={150}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.achievementScroll}
        contentContainerStyle={styles.achievementScrollContent}
      >
        {achievements.map((ach, index) => (
          <AnimatedSection key={ach.id} delay={170 + index * 40}>
          <GlassCard
            style={[
              styles.achievementCard,
              !ach.earned && { opacity: 0.4 },
            ]}
            padding={16}
            radius={16}
          >
            <View
              style={[
                styles.achievementIcon,
                { backgroundColor: ach.color + (ach.earned ? "20" : "10") },
              ]}
            >
              <Feather
                name={ach.icon as any}
                size={22}
                color={ach.earned ? ach.color : Colors.textTertiary}
              />
            </View>
            <Text style={styles.achievementTitle}>{ach.title}</Text>
            {!ach.earned && (
              <Feather name="lock" size={12} color={Colors.textTertiary} style={{ marginTop: 4 }} />
            )}
          </GlassCard>
          </AnimatedSection>
        ))}
      </ScrollView>
      </AnimatedSection>

      {/* Top Skills */}
      <AnimatedSection delay={200} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Skills</Text>
        <Pressable onPress={() => router.push("/(tabs)/skills")}>
          <Text style={styles.seeAll}>View all</Text>
        </Pressable>
      </AnimatedSection>
      <AnimatedSection delay={230}>
      <GlassCard style={styles.skillsCard} padding={20} radius={20}>
        {skills.slice(0, 4).map((skill, idx) => (
          <View key={skill.id} style={[styles.skillRow, idx > 0 && styles.skillRowBorder]}>
            <SkillBar
              label={skill.name}
              current={skill.level}
              color={
                skill.level >= 80
                  ? Colors.success
                  : skill.level >= 60
                  ? Colors.primary
                  : Colors.warning
              }
              height={6}
            />
          </View>
        ))}
      </GlassCard>
      </AnimatedSection>

      {/* Activity Stats */}
      <AnimatedSection delay={260}>
        <Text style={styles.sectionTitle}>Activity</Text>
      </AnimatedSection>
      <AnimatedSection delay={290} style={styles.activityGrid}>
        <GlassCard style={styles.activityCard} padding={16} radius={16}>
          <Feather name="book-open" size={20} color={Colors.primary} />
          <AnimatedCounter
            value={Math.max(0, Math.floor(skillScore / 10))}
            style={styles.activityValue}
          />
          <Text style={styles.activityLabel}>Completed</Text>
        </GlassCard>
        <GlassCard style={styles.activityCard} padding={16} radius={16}>
          <Feather name="clock" size={20} color={Colors.accent} />
          <AnimatedCounter
            value={Math.max(1, skills.length * 2)}
            suffix="h"
            style={styles.activityValue}
          />
          <Text style={styles.activityLabel}>This Week</Text>
        </GlassCard>
        <GlassCard style={styles.activityCard} padding={16} radius={16}>
          <Feather name="award" size={20} color={Colors.warning} />
          <AnimatedCounter value={Math.max(0, highPriority)} style={styles.activityValue} />
          <Text style={styles.activityLabel}>Certs</Text>
        </GlassCard>
      </AnimatedSection>

      {(aiTopGoal || aiTopSkills.length > 0) && (
        <>
          <AnimatedSection delay={320} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            <Feather name="cpu" size={18} color={Colors.primary} />
          </AnimatedSection>
          <AnimatedSection delay={350}>
          <GlassCard style={styles.aiInsightsCard} padding={18} radius={20}>
            {aiTopGoal ? (
              <View style={styles.aiInsightBlock}>
                <Text style={styles.aiInsightLabel}>Top goal</Text>
                <Text style={styles.aiInsightValue}>{aiTopGoal}</Text>
              </View>
            ) : null}

            {aiTopSkills.length > 0 ? (
              <View style={styles.aiInsightBlock}>
                <Text style={styles.aiInsightLabel}>Top skills</Text>
                <View style={styles.aiSkillChipRow}>
                  {aiTopSkills.map((skill) => (
                    <Badge
                      key={skill.skill_name}
                      label={skill.skill_name}
                      variant="primary"
                      size="sm"
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.aiHintText}>{aiHint}</Text>
          </GlassCard>
          </AnimatedSection>
        </>
      )}

      {/* Menu */}
      <AnimatedSection delay={380}>
        <Text style={styles.sectionTitle}>Account</Text>
      </AnimatedSection>
      <AnimatedSection delay={410}>
      <GlassCard style={styles.menuCard} padding={4} radius={20}>
        <MenuItem
          icon="user"
          label="Edit Profile"
          sublabel="Update your details and skills"
          color={Colors.primary}
          onPress={() => router.push("/settings")}
        />
        <MenuItem
          icon="star"
          label="Personalized Recommendations"
          sublabel="View your latest AI guidance"
          color={Colors.accent}
          onPress={() => router.push("/recommendations")}
        />
        <MenuItem
          icon="cpu"
          label="AI Assistant"
          sublabel="Profile-aware chat with roadmap and gap context"
          color={Colors.primary}
          onPress={() => router.push("/ai-assistant")}
          showBadge
        />
        <MenuItem
          icon="shield"
          label="Privacy"
          sublabel="Manage account safety"
          color={Colors.success}
          onPress={() => router.push("/settings")}
        />
        <MenuItem
          icon="settings"
          label="Settings"
          sublabel="App preferences"
          color={Colors.textSecondary}
          onPress={() => router.push("/settings")}
        />
        <MenuItem
          icon="help-circle"
          label="Help & Support"
          color={Colors.warning}
          onPress={() => router.push("/settings")}
        />
        <MenuItem icon="log-out" label="Sign Out" color={Colors.danger} onPress={onSignOut} />
      </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={440}>
        <MotionPressable containerStyle={styles.refreshBtn} onPress={() => refetch()}>
          <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
          <Text style={styles.refreshBtnText}>Refresh Profile Data</Text>
        </MotionPressable>
      </AnimatedSection>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: "hidden",
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  avatarEdit: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
  },
  heroCompany: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  heroMeta: {},
  scoreCard: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionMeta: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginTop: 4,
  },
  scoreStats: {
    flex: 1,
    gap: 0,
  },
  scoreStat: {
    paddingVertical: 8,
  },
  scoreStatValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  scoreStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  scoreStatDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  achievementScroll: { marginBottom: 24 },
  achievementScrollContent: { gap: 10, paddingRight: 4 },
  achievementCard: {
    alignItems: "center",
    minWidth: 90,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  skillsCard: { marginBottom: 24 },
  skillRow: { paddingVertical: 10 },
  skillRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  activityGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  activityCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  activityValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  activityLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  aiInsightsCard: {
    marginBottom: 24,
    gap: 14,
  },
  aiInsightBlock: {
    gap: 8,
  },
  aiInsightLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  aiInsightValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  aiSkillChipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  aiHintText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  menuCard: { marginBottom: 24 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1 },
  menuText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  menuSublabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  menuBadge: {
    backgroundColor: Colors.primary + "20",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  refreshBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  refreshBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
