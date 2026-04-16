import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { MotionPressable } from "@/components/MotionPressable";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkillBar } from "@/components/ui/SkillBar";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getBottomContentPadding } from "@/lib/layout";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import {
  useGetCurrentUser,
  useGetUserDashboard,
  useLogoutAuth,
} from "@workspace/api-client-react";

type ManagementModule = {
  id: string;
  icon: string;
  title: string;
  description: string;
  metric: string;
  tone: string;
  actionLabel: string;
  onPress: () => void;
};

function MenuItem({
  icon,
  label,
  sublabel,
  color = Colors.textSecondary,
  onPress,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: `${color}1A` }]}>
        <Feather name={icon as never} size={18} color={color} />
      </View>
      <View style={styles.menuLabelWrap}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

function ManagementCard({ module }: { module: ManagementModule }) {
  return (
    <GlassCard style={styles.managementCard} padding={16} radius={18}>
      <View style={styles.managementCardTopRow}>
        <View style={[styles.managementIcon, { backgroundColor: `${module.tone}22` }]}>
          <Feather name={module.icon as never} size={18} color={module.tone} />
        </View>
        <Text style={styles.managementMetric}>{module.metric}</Text>
      </View>
      <Text style={styles.managementTitle}>{module.title}</Text>
      <Text style={styles.managementDescription}>{module.description}</Text>
      <Pressable style={styles.managementAction} onPress={module.onPress}>
        <Text style={styles.managementActionText}>{module.actionLabel}</Text>
        <Feather name="arrow-up-right" size={15} color={Colors.accentTertiary} />
      </Pressable>
    </GlassCard>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
      ? (dashboardResponse.data as unknown as Record<string, unknown>)
      : {};

  const profile =
    dashboard.profile && typeof dashboard.profile === "object"
      ? (dashboard.profile as Record<string, unknown>)
      : {};

  const fullName = String(
    profile.full_name ?? currentUser.full_name ?? currentUser.email ?? "NexaPath User"
  );
  const title = String(profile.title ?? "Career Builder");
  const company = String(profile.domain ?? "NexaPath");
  const email = String(currentUser.email ?? "No email available");
  const joined = String(currentUser.created_at ?? "Recently").slice(0, 10);

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const skills = Array.isArray(dashboard.skills)
    ? dashboard.skills
        .map((item) =>
          typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}
        )
        .map((skill, index) => {
          const rawLevel =
            typeof skill.proficiency_level === "number"
              ? skill.proficiency_level
              : typeof skill.level === "number"
              ? skill.level
              : 0;
          const level =
            rawLevel <= 5 ? Math.round((rawLevel / 5) * 100) : Math.max(0, Math.min(100, rawLevel));

          return {
            id: String(skill.id ?? `skill-${index}`),
            name: String(skill.name ?? skill.full_name ?? `Skill ${index + 1}`),
            level,
          };
        })
    : [];

  const gapStats =
    dashboard.gapStatistics && typeof dashboard.gapStatistics === "object"
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
    "Use AI chat to sharpen your profile and keep recommendations relevant.";

  const isWide = width >= 980;
  const isTablet = width >= 760;
  const horizontalPadding = width >= 1200 ? 34 : width >= 980 ? 28 : 20;
  const topPadding = Platform.OS === "web" ? insets.top + 54 : insets.top + 10;

  const managementModules: ManagementModule[] = [
    {
      id: "identity",
      icon: "user",
      title: "Identity",
      description: "Update your public profile details and account basics.",
      metric: "Core",
      tone: Colors.accentTertiary,
      actionLabel: "Edit profile",
      onPress: () => router.push("/settings"),
    },
    {
      id: "skills",
      icon: "target",
      title: "Skills",
      description: "Track strengths, close gaps, and keep your profile current.",
      metric: `${skills.length} tracked`,
      tone: Colors.primary,
      actionLabel: "Manage skills",
      onPress: () => router.push("/(tabs)/skills"),
    },
    {
      id: "assistant",
      icon: "cpu",
      title: "AI Assistant",
      description: "Use NexaPath AI to enrich your profile and action plan.",
      metric: aiTopGoal ? "Goal set" : "No goal",
      tone: Colors.accentTertiary,
      actionLabel: "Open assistant",
      onPress: () => router.push("/ai-assistant"),
    },
    {
      id: "privacy",
      icon: "shield",
      title: "Security",
      description: "Control privacy settings, session access, and safeguards.",
      metric: "Protected",
      tone: Colors.success,
      actionLabel: "Privacy settings",
      onPress: () => router.push("/settings"),
    },
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
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPadding,
            paddingHorizontal: horizontalPadding,
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection style={styles.header} variant="up">
          <View style={styles.headerSide}>
            <Image
              source={require("@/assets/images/logo-nexapath.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTitleWrap} pointerEvents="none">
            <Text style={styles.screenTitle}>Profile</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
            <Feather name="settings" size={20} color={Colors.textSecondary} />
          </Pressable>
        </AnimatedSection>

        <AnimatedSection delay={40}>
          <GlassCard style={styles.heroCard} padding={isTablet ? 22 : 18} radius={24}>
            <View style={[styles.heroContent, isTablet && styles.heroContentWide]}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials || "NP"}</Text>
                </View>
                <View style={styles.statusDot} />
              </View>

              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{fullName}</Text>
                <Text style={styles.heroTitle}>{title}</Text>
                <Text style={styles.heroMeta}>{company}</Text>
                <View style={styles.heroBadgeRow}>
                  <Badge label={`Joined ${joined}`} variant="neutral" size="sm" />
                  <Badge label={`${skills.length} skills`} variant="primary" size="sm" />
                </View>
              </View>

              <View style={[styles.heroActions, isTablet && styles.heroActionsWide]}>
                <MotionPressable
                  onPress={() => router.push("/settings")}
                  containerStyle={styles.primaryActionBtn}
                >
                  <Feather name="edit-3" size={14} color={Colors.background} />
                  <Text style={styles.primaryActionText}>Manage</Text>
                </MotionPressable>
                <MotionPressable
                  onPress={() => router.push("/ai-assistant")}
                  containerStyle={styles.secondaryActionBtn}
                >
                  <Feather name="cpu" size={14} color={Colors.textPrimary} />
                  <Text style={styles.secondaryActionText}>NexaPath AI</Text>
                </MotionPressable>
              </View>
            </View>
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection delay={70} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Management</Text>
          <Text style={styles.sectionMeta}>{isWide ? "Responsive" : "Mobile-first"}</Text>
        </AnimatedSection>

        <View style={[styles.managementGrid, isWide && styles.managementGridWide]}>
          {managementModules.map((module, index) => (
            <AnimatedSection
              key={module.id}
              delay={90 + index * 35}
              style={[styles.managementCell, isWide && styles.managementCellWide]}
            >
              <ManagementCard module={module} />
            </AnimatedSection>
          ))}
        </View>

        <AnimatedSection delay={230}>
          <GlassCard style={styles.managementSystemCard} padding={18} radius={20}>
            <Text style={styles.cardTitle}>Profile Management System</Text>
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Full name</Text>
              <Text style={styles.systemValue}>{fullName}</Text>
            </View>
            <View style={styles.systemDivider} />
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Email</Text>
              <Text style={styles.systemValue}>{email}</Text>
            </View>
            <View style={styles.systemDivider} />
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Current role</Text>
              <Text style={styles.systemValue}>{title}</Text>
            </View>
            <View style={styles.systemDivider} />
            <View style={styles.systemRow}>
              <Text style={styles.systemLabel}>Organization</Text>
              <Text style={styles.systemValue}>{company}</Text>
            </View>
            <MotionPressable containerStyle={styles.systemActionBtn} onPress={() => router.push("/settings")}>
              <Feather name="sliders" size={14} color={Colors.background} />
              <Text style={styles.systemActionText}>Open full profile settings</Text>
            </MotionPressable>
          </GlassCard>
        </AnimatedSection>

        <View style={[styles.analyticsGrid, isWide && styles.analyticsGridWide]}>
          <AnimatedSection delay={260} style={[styles.analyticsCell, isWide && styles.analyticsCellWide]}>
            <GlassCard style={styles.scoreCard} padding={20} radius={20}>
              <Text style={styles.cardTitle}>Skill Score</Text>
              <View style={styles.scoreRow}>
                <ScoreRing
                  score={skillScore}
                  size={104}
                  strokeWidth={8}
                  primaryColor={Colors.accentTertiary}
                  trackColor={Colors.backgroundSecondary}
                  label="SCORE"
                />
                <View style={styles.scoreStats}>
                  <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>Top 18%</Text>
                    <Text style={styles.scoreLabel}>field ranking</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreItem}>
                    <AnimatedCounter
                      value={Math.max(1, Math.round(skillScore / 18))}
                      prefix="+"
                      style={[styles.scoreValue, { color: Colors.success }]}
                    />
                    <Text style={styles.scoreLabel}>weekly gain</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          </AnimatedSection>

          <AnimatedSection delay={290} style={[styles.analyticsCell, isWide && styles.analyticsCellWide]}>
            <GlassCard style={styles.skillsCard} padding={20} radius={20}>
              <View style={styles.skillsCardHeader}>
                <Text style={styles.cardTitle}>Top Skills</Text>
                <Pressable onPress={() => router.push("/(tabs)/skills")}>
                  <Text style={styles.seeAll}>View all</Text>
                </Pressable>
              </View>
              {skills.length > 0 ? (
                skills.slice(0, 4).map((skill, index) => (
                  <View key={skill.id} style={[styles.skillRow, index > 0 && styles.skillRowBorder]}>
                    <SkillBar
                      label={skill.name}
                      current={skill.level}
                      color={
                        skill.level >= 80
                          ? Colors.success
                          : skill.level >= 60
                          ? Colors.accentTertiary
                          : Colors.warning
                      }
                      height={6}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No skills yet. Add skills to activate smart recommendations.</Text>
              )}
            </GlassCard>
          </AnimatedSection>
        </View>

        <AnimatedSection delay={320}>
          <GlassCard style={styles.aiCard} padding={18} radius={20}>
            <View style={styles.aiCardHeader}>
              <Text style={styles.cardTitle}>AI Insights</Text>
              <Feather name="cpu" size={18} color={Colors.accentTertiary} />
            </View>
            {aiTopGoal ? (
              <View style={styles.aiBlock}>
                <Text style={styles.aiLabel}>Top goal</Text>
                <Text style={styles.aiValue}>{aiTopGoal}</Text>
              </View>
            ) : null}
            {aiTopSkills.length > 0 ? (
              <View style={styles.aiBlock}>
                <Text style={styles.aiLabel}>Top skills</Text>
                <View style={styles.aiSkillChips}>
                  {aiTopSkills.map((skill) => (
                    <Badge key={skill.skill_name} label={skill.skill_name} variant="primary" size="sm" />
                  ))}
                </View>
              </View>
            ) : null}
            <Text style={styles.aiHint}>{aiHint}</Text>
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection delay={350}>
          <Text style={styles.sectionTitle}>Account</Text>
        </AnimatedSection>

        <AnimatedSection delay={380}>
          <GlassCard style={styles.menuCard} padding={4} radius={20}>
            <MenuItem
              icon="user"
              label="Edit Profile"
              sublabel="Update your details and preferences"
              color={Colors.accentTertiary}
              onPress={() => router.push("/settings")}
            />
            <MenuItem
              icon="star"
              label="Recommendations"
              sublabel="Open your latest AI guidance"
              color={Colors.primary}
              onPress={() => router.push("/recommendations")}
            />
            <MenuItem
              icon="cpu"
              label="NexaPath AI"
              sublabel="Chat with your profile context"
              color={Colors.accentTertiary}
              onPress={() => router.push("/ai-assistant")}
            />
            <MenuItem
              icon="shield"
              label="Privacy"
              sublabel="Manage security and sessions"
              color={Colors.success}
              onPress={() => router.push("/settings")}
            />
            <MenuItem
              icon="log-out"
              label="Sign Out"
              sublabel="End your current session"
              color={Colors.danger}
              onPress={onSignOut}
            />
          </GlassCard>
        </AnimatedSection>

        <AnimatedSection delay={410}>
          <MotionPressable containerStyle={styles.refreshBtn} onPress={() => refetch()}>
            <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Refresh profile data</Text>
          </MotionPressable>
        </AnimatedSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    gap: 14,
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logo: {
    width: 38,
    height: 38,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroCard: {
    marginBottom: 2,
  },
  heroContent: {
    gap: 14,
  },
  heroContentWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    position: "relative",
    alignSelf: "flex-start",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentTertiary,
  },
  avatarText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  statusDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.surface,
    backgroundColor: Colors.success,
  },
  heroInfo: {
    flex: 1,
    gap: 2,
  },
  heroName: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  heroTitle: {
    fontSize: 14,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  heroMeta: {
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  heroActions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  heroActionsWide: {
    maxWidth: 300,
    justifyContent: "flex-end",
  },
  primaryActionBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: Colors.accentTertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: {
    color: Colors.background,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  secondaryActionBtn: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  sectionHeader: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
  },
  managementGrid: {
    gap: 10,
  },
  managementGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  managementCell: {
    width: "100%",
  },
  managementCellWide: {
    width: "49%",
  },
  managementCard: {
    minHeight: 168,
  },
  managementCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  managementIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  managementMetric: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  managementTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  managementDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  managementAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  managementActionText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
  },
  managementSystemCard: {
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 6,
  },
  systemLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  systemValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  systemDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  systemActionBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 20,
    backgroundColor: Colors.accentTertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  systemActionText: {
    color: Colors.background,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  analyticsGrid: {
    gap: 10,
  },
  analyticsGridWide: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  analyticsCell: {
    width: "100%",
  },
  analyticsCellWide: {
    width: "49%",
  },
  scoreCard: {
    minHeight: 190,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  scoreStats: {
    flex: 1,
  },
  scoreItem: {
    paddingVertical: 8,
  },
  scoreValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  scoreDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  skillsCard: {
    minHeight: 190,
  },
  skillsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
  },
  skillRow: {
    paddingVertical: 9,
  },
  skillRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  aiCard: {
    gap: 12,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiBlock: {
    gap: 6,
  },
  aiLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  aiValue: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  aiSkillChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aiHint: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  menuCard: {
    marginTop: -2,
  },
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
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  menuSublabel: {
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  refreshBtn: {
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
  },
  refreshBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Newsreader_500Medium",
  },
});
