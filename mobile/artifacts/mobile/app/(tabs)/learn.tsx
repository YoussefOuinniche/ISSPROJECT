import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
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

import { Badge } from "@/components/ui/Badge";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  ROADMAP_DEFAULT_GRADIENT,
  ROADMAP_ROLE_OPTIONS,
  type RoadmapRoleOption,
} from "@/constants/roadmapRoles";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getBottomContentPadding } from "@/lib/layout";
import { useGetUserDashboard } from "@workspace/api-client-react";

const MARKET_ROLE_KEYWORDS: Record<string, string[]> = {
  "frontend-engineer": ["frontend", "react", "javascript", "typescript", "css", "ui"],
  "backend-engineer": ["backend", "api", "node", "java", "python", "database"],
  "full-stack-engineer": ["frontend", "backend", "api", "react", "node", "database"],
  "mobile-engineer": ["mobile", "android", "ios", "react native", "flutter", "swift", "kotlin"],
  "ai-engineer": ["ai", "llm", "prompt", "nlp", "mlops", "python"],
  "machine-learning-engineer": ["machine learning", "ml", "pytorch", "tensorflow", "model", "feature"],
  "devops-engineer": ["devops", "kubernetes", "docker", "ci", "cd", "terraform", "cloud"],
  "cloud-engineer": ["cloud", "aws", "azure", "gcp", "infrastructure", "network"],
  "data-engineer": ["data", "etl", "pipeline", "spark", "warehouse", "sql"],
  "cybersecurity-analyst": ["security", "cyber", "siem", "soc", "threat", "identity"],
};

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function trackLearnEvent(event: string, payload: Record<string, unknown> = {}) {
  // TODO(analytics): Replace console markers with production analytics SDK events.
  console.info("[Telemetry][Learn]", event, payload);
}

function findRecommendedRole(goal: string | null | undefined): RoadmapRoleOption | null {
  const normalizedGoal = normalizeText(goal);
  if (!normalizedGoal) return null;

  return (
    ROADMAP_ROLE_OPTIONS.find((role) => {
      const normalizedTitle = normalizeText(role.title);
      return (
        normalizedGoal === normalizedTitle ||
        normalizedGoal.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedGoal)
      );
    }) || null
  );
}

function openRoadmap(role: RoadmapRoleOption, source: string = "unknown") {
  trackLearnEvent("open_roadmap", {
    roleId: role.id,
    roleTitle: role.title,
    source,
  });

  router.push({
    pathname: "/learn/[id]",
    params: {
      id: role.id,
      role: role.title,
    },
  });
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const { profile, summary, refreshProfile } = useAIProfile();
  const { data: dashboardResponse } = useGetUserDashboard();
  const activeRoadmap = profile?.learning_roadmap || null;
  const activeRoadmapRole = activeRoadmap?.role || null;
  const activeRoadmapStage = activeRoadmap?.stages?.[0] || null;
  const roadmapProject =
    activeRoadmap?.final_projects?.[0] ||
    activeRoadmapStage?.projects?.[0] ||
    null;
  const dashboardData =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};
  const marketInsightsRaw =
    dashboardData.marketInsights && typeof dashboardData.marketInsights === "object"
      ? (dashboardData.marketInsights as Record<string, unknown>)
      : {};
  const marketSummary = Array.isArray(marketInsightsRaw.short_summary)
    ? (marketInsightsRaw.short_summary as Array<Record<string, unknown>>)
    : [];
  const marketUpdatedAt =
    typeof marketInsightsRaw.updated_at === "string" && marketInsightsRaw.updated_at
      ? marketInsightsRaw.updated_at
      : null;
  const personalizedMissingSkills = Array.isArray(summary?.missing_market_skills)
    ? summary.missing_market_skills.slice(0, 4)
    : Array.isArray(summary?.missing_skills)
    ? summary.missing_skills.slice(0, 4)
    : [];
  const personalizedHighPrioritySkills = Array.isArray(summary?.high_priority_skills)
    ? summary.high_priority_skills.slice(0, 4)
    : [];
  const personalizedNextStep =
    (typeof summary?.recommended_next_step === "string" && summary.recommended_next_step) ||
    summary?.next_step ||
    null;
  const hasMarketSignals =
    marketSummary.length > 0 ||
    personalizedHighPrioritySkills.length > 0 ||
    personalizedMissingSkills.length > 0 ||
    Boolean(personalizedNextStep);

  const recommendedRole = useMemo(() => {
    return (
      findRecommendedRole(summary?.top_goal) ||
      findRecommendedRole(profile?.target_role) ||
      findRecommendedRole(profile?.goals?.[0]) ||
      null
    );
  }, [profile?.goals, profile?.target_role, summary?.top_goal]);

  const normalizedMarketSkills = useMemo(
    () =>
      marketSummary
        .map((item) => normalizeText(String(item.skill ?? "")))
        .filter(Boolean),
    [marketSummary]
  );

  const roleMarketScores = useMemo(() => {
    const scores: Record<string, number> = {};

    ROADMAP_ROLE_OPTIONS.forEach((role) => {
      const haystack = normalizeText(`${role.title} ${role.description}`);
      const keywordPool = MARKET_ROLE_KEYWORDS[role.id] || [];

      const score = normalizedMarketSkills.reduce((total, skill, index) => {
        const weight = Math.max(1, 6 - index);
        const titleMatch = haystack.includes(skill) || skill.includes(normalizeText(role.title));
        const keywordMatch = keywordPool.some(
          (keyword) => skill.includes(keyword) || keyword.includes(skill)
        );
        if (titleMatch && keywordMatch) return total + weight + 2;
        if (titleMatch || keywordMatch) return total + weight;
        return total;
      }, 0);

      scores[role.id] = score;
    });

    return scores;
  }, [normalizedMarketSkills]);

  const orderedRoleOptions = useMemo(() => {
    const originalOrder = new Map(ROADMAP_ROLE_OPTIONS.map((role, index) => [role.id, index]));
    return [...ROADMAP_ROLE_OPTIONS].sort((a, b) => {
      const scoreDiff = (roleMarketScores[b.id] || 0) - (roleMarketScores[a.id] || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0);
    });
  }, [roleMarketScores]);

  const handleProfileRefresh = () => {
    trackLearnEvent("refresh_profile_tap", {
      hasTargetRole: Boolean(profile?.target_role || summary?.target_role),
    });
    refreshProfile();
  };

  return (
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
      <AnimatedSection delay={20} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require("@/assets/images/logo-nexapath.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.screenTitle}>Role Roadmaps</Text>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection delay={70}>
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Feather name="map" size={13} color={Colors.background} />
          <Text style={styles.heroBadgeText}>Roadmap Explorer</Text>
        </View>
        <Text style={styles.heroTitle}>Pick a role and generate a structured roadmap.</Text>
        <Text style={styles.heroText}>
          Each roadmap is ordered from foundations to advanced execution using your explicit profile and AI profile as context.
        </Text>
        <View style={styles.heroMetaRow}>
          <Badge label="Structured" variant="neutral" size="sm" />
          <Badge label="Role-based" variant="neutral" size="sm" />
          <Badge label="Project-driven" variant="neutral" size="sm" />
        </View>
      </View>
      </AnimatedSection>

      {activeRoadmap ? (
        <AnimatedSection delay={120}>
        <GlassCard style={styles.activeRoadmapCard} padding={18} radius={20}>
          <View style={styles.activeRoadmapHeader}>
            <View>
              <Text style={styles.recommendedEyebrow}>Your Active Roadmap</Text>
              <Text style={styles.recommendedTitle}>{activeRoadmapRole || "Current roadmap"}</Text>
              <Text style={styles.recommendedText}>
                {personalizedNextStep
                  ? `Next step: ${personalizedNextStep}`
                  : "Continue the roadmap generated from your current profile context."}
              </Text>
            </View>
            <Pressable
              style={styles.recommendedButton}
              onPress={() =>
                openRoadmap({
                  id: String(activeRoadmapRole || "current-roadmap").toLowerCase().replace(/\s+/g, "-"),
                  title: activeRoadmapRole || "Current roadmap",
                  description: "Structured learning path generated from your profile context.",
                  icon: "map",
                  gradient: ROADMAP_DEFAULT_GRADIENT,
                }, "active-roadmap")
              }
            >
              <Text style={styles.recommendedButtonText}>Open</Text>
            </Pressable>
          </View>

          <View style={styles.activeRoadmapMeta}>
            {activeRoadmapStage ? (
              <Badge label={`Stage: ${activeRoadmapStage.title}`} variant="primary" size="sm" />
            ) : null}
            {roadmapProject ? (
              <Badge label="Project-ready" variant="success" size="sm" />
            ) : null}
          </View>

          {roadmapProject ? (
            <View style={styles.activeRoadmapProject}>
              <Feather name="briefcase" size={15} color={Colors.primary} />
              <Text style={styles.activeRoadmapProjectText}>{roadmapProject}</Text>
            </View>
          ) : null}
        </GlassCard>
        </AnimatedSection>
      ) : null}

      {recommendedRole ? (
        <AnimatedSection delay={160}>
        <GlassCard style={styles.recommendedCard} padding={18} radius={20}>
          <View style={styles.recommendedHeader}>
            <View>
              <Text style={styles.recommendedEyebrow}>Recommended For You</Text>
              <Text style={styles.recommendedTitle}>{recommendedRole.title}</Text>
              <Text style={styles.recommendedText}>
                {summary?.top_goal
                  ? `Matched from your active goal: ${summary.top_goal}.`
                  : "Matched from your current profile context."}
              </Text>
            </View>
            <Pressable style={styles.recommendedButton} onPress={() => openRoadmap(recommendedRole, "recommended") }>
              <Text style={styles.recommendedButtonText}>View Roadmap</Text>
            </Pressable>
          </View>
        </GlassCard>
        </AnimatedSection>
      ) : null}

      {hasMarketSignals ? (
        <AnimatedSection delay={180}>
          <GlassCard style={styles.marketSignalCard} padding={16} radius={18}>
            <View style={styles.marketSignalHeader}>
              <Text style={styles.marketSignalTitle}>Market Signals</Text>
              <Badge label="Cached" variant="accent" size="sm" />
            </View>
            {marketSummary.length > 0 ? (
              <View style={styles.marketSignalRow}>
                {marketSummary.slice(0, 3).map((item, index) => (
                  <Badge
                    key={`${String(item.skill ?? "signal")}-${index}`}
                    label={`${String(item.skill ?? "Skill")} (${Number(item.frequency ?? 0)})`}
                    variant="accent"
                    size="sm"
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.marketSignalMeta}>No market snapshot yet. Refresh to load current signals.</Text>
            )}
            <Text style={styles.marketSignalMeta}>
              Snapshot: {marketUpdatedAt ? new Date(marketUpdatedAt).toLocaleString() : "No recent snapshot"}
            </Text>
            {personalizedHighPrioritySkills.length > 0 ? (
              <View style={styles.marketSignalInlineList}>
                <Text style={styles.marketSignalInlineTitle}>High-priority skills:</Text>
                <View style={styles.marketSignalRow}>
                  {personalizedHighPrioritySkills.map((skill) => (
                    <Badge key={`priority-${skill}`} label={skill} variant="accent" size="sm" />
                  ))}
                </View>
              </View>
            ) : null}
            {personalizedMissingSkills.length > 0 ? (
              <View style={styles.marketSignalInlineList}>
                <Text style={styles.marketSignalInlineTitle}>Missing in your profile:</Text>
                <View style={styles.marketSignalRow}>
                  {personalizedMissingSkills.map((skill) => (
                    <Badge key={`missing-${skill}`} label={skill} variant="warning" size="sm" />
                  ))}
                </View>
              </View>
            ) : null}
            {/* TODO(analytics): Track taps on market badges if badges become interactive. */}
            {personalizedNextStep ? (
              <Text style={styles.marketSignalAction}>Next step: {personalizedNextStep}</Text>
            ) : null}
          </GlassCard>
        </AnimatedSection>
      ) : (
        <AnimatedSection delay={180}>
          <GlassCard style={styles.marketSignalCard} padding={16} radius={18}>
            <Text style={styles.marketSignalMeta}>
              Market signals are limited right now. Refresh profile or set your target role for personalized guidance.
            </Text>
          </GlassCard>
        </AnimatedSection>
      )}

      <AnimatedSection delay={200} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Role Paths</Text>
        <Text style={styles.sectionSub}>Ordered by profile context and recent market demand</Text>
      </AnimatedSection>

      {orderedRoleOptions.map((role, index) => (
        <AnimatedSection key={role.id} delay={240 + index * 40}>
        <Pressable onPress={() => openRoadmap(role, "role-list") }>
          <GlassCard style={styles.roleCard} padding={0} radius={22}>
            <View style={styles.roleAccent}
            />
            <View style={styles.roleBody}>
              <View style={styles.roleTopRow}>
                <View style={styles.roleIconWrap}>
                  <Feather name={role.icon as never} size={18} color={Colors.accentTertiary} />
                </View>
                <View style={styles.roleTagRow}>
                  {recommendedRole?.id === role.id ? (
                    <Badge label="Recommended" variant="primary" size="sm" />
                  ) : null}
                  {(roleMarketScores[role.id] || 0) > 0 ? (
                    <Badge label="In demand" variant="accentTertiary" size="sm" />
                  ) : null}
                </View>
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
              <View style={styles.roleFooter}>
                <Text style={styles.roleFooterText}>View Roadmap</Text>
                <Feather name="arrow-right" size={16} color={Colors.accentTertiary} />
              </View>
            </View>
          </GlassCard>
        </Pressable>
        </AnimatedSection>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  screenSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    overflow: "hidden",
  },
  heroAccent: {
    position: "absolute",
    top: 6,
    right: 8,
    opacity: 0.85,
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  heroText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
  },
  heroMetaRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  activeRoadmapCard: {
    marginBottom: 18,
  },
  recommendedCard: {
    marginBottom: 18,
  },
  recommendedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  recommendedEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  recommendedTitle: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  recommendedText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    maxWidth: 220,
  },
  recommendedButton: {
    borderRadius: 12,
    backgroundColor: Colors.accentTertiary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recommendedButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  activeRoadmapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  activeRoadmapMeta: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  activeRoadmapProject: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  activeRoadmapProjectText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  marketSignalCard: {
    marginBottom: 16,
  },
  marketSignalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  marketSignalTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  marketSignalRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  marketSignalMeta: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  marketSignalInlineList: {
    marginTop: 10,
  },
  marketSignalInlineTitle: {
    marginBottom: 6,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  marketSignalAction: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  roleCard: {
    marginBottom: 14,
    overflow: "hidden",
  },
  roleAccent: {
    height: 5,
  },
  roleBody: {
    padding: 18,
  },
  roleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.accentTertiary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  roleDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  roleFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleFooterText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.accentTertiary,
  },
});
