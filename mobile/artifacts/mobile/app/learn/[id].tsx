import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RoadmapVisualization,
  type VisualizationDatum,
  type VisualizationPayload,
  type VisualizationStage,
} from "@/components/roadmap/RoadmapVisualization";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  ROADMAP_DEFAULT_GRADIENT,
  ROADMAP_ROLE_LOOKUP,
  ROADMAP_ROLE_OPTIONS,
} from "@/constants/roadmapRoles";
import { useAIProfile } from "@/hooks/useAIProfile";
import { generateRoadmapWithAi } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

type RoadmapStage = {
  title: string;
  items: string[];
  projects: string[];
};

type RoadmapPayload = {
  role: string;
  stages: RoadmapStage[];
  tools: string[];
  final_projects: string[];
  visualization: VisualizationPayload | null;
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeVisualizationStage(value: unknown): VisualizationStage | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const title = String(row.title || "").trim();
  if (!title) return null;

  return {
    title,
    items: normalizeStringArray(row.items),
  };
}

function normalizeVisualizationDatum(value: unknown): VisualizationDatum | null {
  if (!value || typeof value !== "object") return null;

  const row = value as Record<string, unknown>;
  const label = String(row.label || row.title || "").trim();
  if (!label) return null;

  const numericValue = Number(row.value);

  return {
    label,
    value: Number.isFinite(numericValue) ? numericValue : null,
    items: normalizeStringArray(row.items),
    color: typeof row.color === "string" && row.color.trim() ? row.color.trim() : null,
  };
}

function buildFallbackVisualization(stages: RoadmapStage[], fallbackRole: string): VisualizationPayload | null {
  if (stages.length === 0) return null;

  return {
    type: "roadmap",
    title: `${fallbackRole} roadmap`,
    data: stages.map((stage) => ({
      label: stage.title,
      value: stage.items.length,
      items: stage.items.slice(0, 4),
      color: null,
    })),
    stages: stages.map((stage) => ({
      title: stage.title,
      items: stage.items,
    })),
  };
}

function normalizeVisualization(
  value: unknown,
  fallbackRole: string,
  fallbackStages: RoadmapStage[]
): VisualizationPayload | null {
  if (!value || typeof value !== "object") {
    return buildFallbackVisualization(fallbackStages, fallbackRole);
  }

  const record = value as Record<string, unknown>;
  const type = String(record.type || "").trim();
  if (!["roadmap", "bar_chart", "radar"].includes(type)) {
    return buildFallbackVisualization(fallbackStages, fallbackRole);
  }

  const data = Array.isArray(record.data)
    ? record.data.map(normalizeVisualizationDatum).filter((item): item is VisualizationDatum => Boolean(item))
    : [];
  const stages = Array.isArray(record.stages)
    ? record.stages
        .map(normalizeVisualizationStage)
        .filter((item): item is VisualizationStage => Boolean(item))
    : [];

  return {
    type: type as VisualizationPayload["type"],
    title: String(record.title || `${fallbackRole} roadmap`).trim() || `${fallbackRole} roadmap`,
    data,
    stages: stages.length > 0 ? stages : buildFallbackVisualization(fallbackStages, fallbackRole)?.stages || [],
  };
}

function normalizeRoadmap(value: unknown, fallbackRole: string): RoadmapPayload {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const stages = Array.isArray(nested.stages)
    ? nested.stages
        .map((stage) => {
          if (!stage || typeof stage !== "object") return null;
          const row = stage as Record<string, unknown>;
          const title = String(row.title || "").trim();
          if (!title) return null;
          return {
            title,
            items: normalizeStringArray(row.items),
            projects: normalizeStringArray(row.projects),
          };
        })
        .filter((stage): stage is RoadmapStage => Boolean(stage))
    : [];

  return {
    role: String(nested.role || fallbackRole).trim() || fallbackRole,
    stages,
    tools: normalizeStringArray(nested.tools),
    final_projects: normalizeStringArray(nested.final_projects),
    visualization: normalizeVisualization(nested.visualization, fallbackRole, stages),
  };
}

export default function LearnDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, role } = useLocalSearchParams<{ id?: string; role?: string }>();
  const { profile, summary, refreshProfile } = useAIProfile();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<RoadmapPayload | null>(null);

  const roleCard = useMemo(() => {
    const byId = id ? ROADMAP_ROLE_LOOKUP[String(id)] : null;
    if (byId) return byId;

    const title = String(role || "").trim();
    return (
      ROADMAP_ROLE_OPTIONS.find((item) => item.title === title) || {
        id: String(id || title || "role-roadmap"),
        title: title || "Role Roadmap",
        description: "Structured learning path generated from your profile context.",
        icon: "map",
        gradient: ROADMAP_DEFAULT_GRADIENT,
      }
    );
  }, [id, role]);

  const currentSkillCount = Array.isArray(profile?.skills) ? profile.skills.length : 0;
  const activeGoal = summary?.top_goal || profile?.target_role || roleCard.title;

  const loadRoadmap = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await generateRoadmapWithAi({ role: roleCard.title });
      setRoadmap(normalizeRoadmap(response.data, roleCard.title));
      void refreshProfile();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to generate roadmap.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRoadmap().catch(() => undefined);
  }, [roleCard.title]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={roleCard.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View
          style={[
            styles.heroContent,
            {
              paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
            },
          ]}
        >
          <View style={styles.heroNav}>
            <Pressable style={styles.heroButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </Pressable>
            <Pressable style={styles.heroButton} onPress={() => loadRoadmap(true)}>
              <Feather name="refresh-cw" size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.heroBadge}>
            <Feather name={roleCard.icon as never} size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>Role Explorer</Text>
          </View>

          <Text style={styles.heroTitle}>{roleCard.title}</Text>
          <Text style={styles.heroDescription}>{roleCard.description}</Text>

          <View style={styles.heroMeta}>
            <Badge label={`${currentSkillCount} tracked skills`} variant="neutral" size="sm" />
            <Badge label={`Goal: ${activeGoal}`} variant="neutral" size="sm" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRoadmap(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.infoCard} padding={18} radius={20}>
          <Text style={styles.infoEyebrow}>AI-Ordered Path</Text>
          <Text style={styles.infoTitle}>Foundations to advanced execution</Text>
          <Text style={styles.infoText}>
            This roadmap is generated from the selected role and weighted by your explicit profile and AI profile context.
          </Text>
        </GlassCard>

        {loading ? (
          <GlassCard style={styles.loadingCard} padding={24} radius={20}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Generating roadmap...</Text>
          </GlassCard>
        ) : error ? (
          <GlassCard style={styles.loadingCard} padding={24} radius={20}>
            <Feather name="alert-triangle" size={24} color={Colors.danger} />
            <Text style={styles.errorTitle}>Roadmap unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadRoadmap()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </GlassCard>
        ) : roadmap ? (
          <>
            {roadmap.visualization ? (
              <>
                <Text style={styles.sectionTitle}>Visual roadmap</Text>
                <GlassCard style={styles.visualCard} padding={18} radius={20}>
                  <Text style={styles.visualTitle}>{roadmap.visualization.title}</Text>
                  <Text style={styles.visualSub}>
                    Structured roadmap data rendered as a native diagram so the progression stays readable on mobile.
                  </Text>
                  <View style={styles.visualWrap}>
                    <RoadmapVisualization visualization={roadmap.visualization} />
                  </View>
                </GlassCard>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Stages</Text>
            {roadmap.stages.map((stage, index) => (
              <GlassCard key={`${stage.title}-${index}`} style={styles.stageCard} padding={18} radius={18}>
                <View style={styles.stageHeader}>
                  <View style={styles.stageIndex}>
                    <Text style={styles.stageIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stageHeaderCopy}>
                    <Text style={styles.stageTitle}>{stage.title}</Text>
                    <Text style={styles.stageSub}>
                      {stage.items.length} concepts · {stage.projects.length} projects
                    </Text>
                  </View>
                </View>

                <View style={styles.stageList}>
                  {stage.items.map((item, itemIndex) => (
                    <View key={`${stage.title}-item-${itemIndex}`} style={styles.stageRow}>
                      <Feather name="check-circle" size={15} color={Colors.primary} />
                      <Text style={styles.stageRowText}>{item}</Text>
                    </View>
                  ))}
                </View>

                {stage.projects.length > 0 ? (
                  <View style={styles.projectsBlock}>
                    <Text style={styles.projectsTitle}>Stage Projects</Text>
                    {stage.projects.map((project, projectIndex) => (
                      <View key={`${stage.title}-project-${projectIndex}`} style={styles.projectRow}>
                        <Feather name="code" size={15} color={Colors.accent} />
                        <Text style={styles.projectRowText}>{project}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </GlassCard>
            ))}

            <Text style={styles.sectionTitle}>Tools & Technologies</Text>
            <View style={styles.toolsWrap}>
              {roadmap.tools.map((tool) => (
                <View key={tool} style={styles.toolChip}>
                  <Text style={styles.toolChipText}>{tool}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Final Portfolio Ideas</Text>
            {roadmap.final_projects.map((project, index) => (
              <GlassCard key={`${project}-${index}`} style={styles.finalProjectCard} padding={18} radius={18}>
                <View style={styles.finalProjectHeader}>
                  <View style={styles.finalProjectIcon}>
                    <Feather name="briefcase" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.finalProjectTitle}>Portfolio Project {index + 1}</Text>
                </View>
                <Text style={styles.finalProjectText}>{project}</Text>
              </GlassCard>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroGradient: { paddingBottom: 22 },
  heroContent: { paddingHorizontal: 20 },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.84)",
  },
  heroMeta: {
    marginTop: 16,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoCard: {
    marginBottom: 18,
  },
  visualCard: {
    marginBottom: 18,
  },
  infoEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoTitle: {
    marginTop: 6,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  infoText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  visualTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  visualSub: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  visualWrap: {
    marginTop: 18,
  },
  loadingCard: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  errorText: {
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  retryButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  stageCard: {
    marginBottom: 14,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  stageIndex: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "18",
  },
  stageIndexText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  stageHeaderCopy: { flex: 1 },
  stageTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  stageSub: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  stageList: {
    gap: 10,
  },
  stageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stageRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  projectsBlock: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 10,
  },
  projectsTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  projectRowText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  toolsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  toolChip: {
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  finalProjectCard: {
    marginBottom: 12,
  },
  finalProjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  finalProjectIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  finalProjectTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  finalProjectText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
