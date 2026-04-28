import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  ROADMAP_DEFAULT_GRADIENT,
  ROADMAP_ROLE_LOOKUP,
  ROADMAP_ROLE_OPTIONS,
  type RoadmapRoleOption,
} from "@/constants/roadmapRoles";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getBottomContentPadding } from "@/lib/layout";

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
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

function openRoadmap(role: RoadmapRoleOption) {
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
  const activeRoadmap = profile?.learning_roadmap || null;
  const activeRoadmapRole = activeRoadmap?.role || null;
  const activeRoadmapStage = activeRoadmap?.stages?.[0] || null;
  const roadmapProject =
    activeRoadmap?.final_projects?.[0] ||
    activeRoadmapStage?.projects?.[0] ||
    null;

  const recommendedRole = useMemo(() => {
    return (
      findRecommendedRole(summary?.top_goal) ||
      findRecommendedRole(profile?.target_role) ||
      findRecommendedRole(profile?.goals?.[0]) ||
      null
    );
  }, [profile?.goals, profile?.target_role, summary?.top_goal]);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Role Roadmaps</Text>
          <Text style={styles.screenSub}>Explore realistic, stage-by-stage paths for IT roles</Text>
        </View>
        <Pressable style={styles.headerBtn} onPress={refreshProfile}>
          <Feather name="refresh-cw" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <LinearGradient
        colors={ROADMAP_DEFAULT_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
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
      </LinearGradient>

      {activeRoadmap ? (
        <GlassCard style={styles.activeRoadmapCard} padding={18} radius={20}>
          <View style={styles.activeRoadmapHeader}>
            <View>
              <Text style={styles.recommendedEyebrow}>Your Active Roadmap</Text>
              <Text style={styles.recommendedTitle}>{activeRoadmapRole || "Current roadmap"}</Text>
              <Text style={styles.recommendedText}>
                {summary?.next_step
                  ? `Next step: ${summary.next_step}`
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
                })
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
      ) : null}

      {recommendedRole ? (
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
            <Pressable style={styles.recommendedButton} onPress={() => openRoadmap(recommendedRole)}>
              <Text style={styles.recommendedButtonText}>View Roadmap</Text>
            </Pressable>
          </View>
        </GlassCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Role Paths</Text>
        <Text style={styles.sectionSub}>Roadmap.sh style exploration with AI-personalized ordering</Text>
      </View>

      {ROADMAP_ROLE_OPTIONS.map((role) => (
        <Pressable key={role.id} onPress={() => openRoadmap(role)}>
          <GlassCard style={styles.roleCard} padding={0} radius={22}>
            <LinearGradient
              colors={role.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.roleAccent}
            />
            <View style={styles.roleBody}>
              <View style={styles.roleTopRow}>
                <View style={styles.roleIconWrap}>
                  <Feather name={role.icon as never} size={18} color={Colors.primary} />
                </View>
                {recommendedRole?.id === role.id ? (
                  <Badge label="Recommended" variant="primary" size="sm" />
                ) : null}
              </View>
              <Text style={styles.roleTitle}>{role.title}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
              <View style={styles.roleFooter}>
                <Text style={styles.roleFooterText}>View Roadmap</Text>
                <Feather name="arrow-right" size={16} color={Colors.primary} />
              </View>
            </View>
          </GlassCard>
        </Pressable>
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
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
  roleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primary + "18",
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
    color: Colors.primary,
  },
});
