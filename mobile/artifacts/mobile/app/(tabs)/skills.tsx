import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "@/components/AnimatedSection";
import { MotionPressable } from "@/components/MotionPressable";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import Colors from "@/constants/colors";
import { IT_MARKET_ROLES } from "@/constants/itMarketFeed";
import { useAIProfile } from "@/hooks/useAIProfile";
import {
  getSkillCatalog,
  updateExplicitUserProfile,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";
import { useGetUserDashboard } from "@workspace/api-client-react";

type PriorityFilter = "all" | "high" | "medium" | "low";

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

type LocalStrength = {
  skill: string;
  category: string;
  current_level: "intermediate" | "advanced";
  why_it_matters: string;
};

type LocalGap = {
  skill: string;
  priority: "high" | "medium" | "low";
  category: string;
  target_level: "intermediate" | "advanced";
  current_level?: "beginner" | "intermediate" | "advanced";
  gap_severity: "critical" | "moderate" | "minor";
  why_it_matters: string;
};

type LocalRecommendation = {
  title: string;
  priority: "high" | "medium" | "low";
  action: string;
  reason?: string;
};

type LocalAnalysis = {
  strengths: LocalStrength[];
  missingSkills: LocalGap[];
  partialGaps: LocalGap[];
  recommendations: LocalRecommendation[];
};

const EMPTY_LOCAL_ANALYSIS: LocalAnalysis = {
  strengths: [],
  missingSkills: [],
  partialGaps: [],
  recommendations: [],
};

function normalizeSkillText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  values.forEach((item) => {
    const text = String(item || "").trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(text);
  });

  return ordered;
}

function trackSkillsEvent(event: string, payload: Record<string, unknown> = {}) {
  console.info("[Telemetry][Skills]", event, payload);
}

function buildSelectionAnalysis(targetRole: string, selectedSkills: string[]): LocalAnalysis {
  const normalizedRole = targetRole.trim().toLowerCase();
  const roleRecord = IT_MARKET_ROLES.find((role) => role.role.toLowerCase() === normalizedRole);

  if (!roleRecord) {
    return EMPTY_LOCAL_ANALYSIS;
  }

  const chosenSkills = uniqueStrings(selectedSkills);
  const chosenSet = new Set(chosenSkills.map((skill) => normalizeSkillText(skill)));
  const requiredSkills = uniqueStrings(roleRecord.requiredSkills);
  const requiredSet = new Set(requiredSkills.map((skill) => normalizeSkillText(skill)));

  const matchedRequiredSkills = requiredSkills.filter((skill) =>
    chosenSet.has(normalizeSkillText(skill))
  );
  const missingRequiredSkills = requiredSkills.filter(
    (skill) => !chosenSet.has(normalizeSkillText(skill))
  );

  const transferableSkills = chosenSkills.filter(
    (skill) => !requiredSet.has(normalizeSkillText(skill))
  );

  const strengths: LocalStrength[] = [
    ...matchedRequiredSkills.map((skill) => ({
      skill,
      category: "Role Core",
      current_level: "advanced" as const,
      why_it_matters: `${skill} is directly aligned with ${roleRecord.role} expectations.`,
    })),
    ...transferableSkills.slice(0, 3).map((skill) => ({
      skill,
      category: "Transferable",
      current_level: "intermediate" as const,
      why_it_matters: `${skill} can accelerate delivery in a ${roleRecord.role} workflow.`,
    })),
  ];

  const partialGaps: LocalGap[] = matchedRequiredSkills.slice(0, 6).map((skill) => ({
    skill,
    priority: "medium",
    category: "Role Core",
    current_level: "intermediate",
    target_level: "advanced",
    gap_severity: "moderate",
    why_it_matters: `Deepening ${skill} improves readiness for advanced ${roleRecord.role} responsibilities.`,
  }));

  const missingSkills: LocalGap[] = missingRequiredSkills.map((skill, index) => {
    const priority = index < 3 ? "high" : index < 6 ? "medium" : "low";
    const gap_severity = index < 3 ? "critical" : index < 6 ? "moderate" : "minor";

    return {
      skill,
      priority,
      category: "Role Core",
      target_level: "intermediate",
      gap_severity,
      why_it_matters: `${skill} is part of the expected baseline for ${roleRecord.role}.`,
    };
  });

  const recommendations: LocalRecommendation[] = [
    {
      title: "Close high-priority gaps first",
      priority: "high",
      action:
        missingSkills.length > 0
          ? `Focus next on: ${missingSkills
              .filter((gap) => gap.priority === "high")
              .slice(0, 3)
              .map((gap) => gap.skill)
              .join(", ") || "top missing skills"}.`
          : "You covered the core gaps; keep strengthening depth skills.",
      reason: "High-priority skills have the strongest impact on role readiness.",
    },
    {
      title: "Build one role-aligned project",
      priority: "medium",
      action: `Create a practical ${roleRecord.role} project that demonstrates at least 4 core required skills together.`,
      reason: "Bundling skills in one project proves practical capability, not isolated knowledge.",
    },
    {
      title: "Track your next refresh",
      priority: "low",
      action: "After adding new skills, run Skill Gap Analysis again to update strengths and gaps from your latest selections.",
      reason: "The result view is selection-driven and updates with your chosen role and skills.",
    },
  ];

  return {
    strengths,
    missingSkills,
    partialGaps,
    recommendations,
  };
}

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(null);
  const [resultsCleared, setResultsCleared] = useState(false);
  const [resultsRefreshing, setResultsRefreshing] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hasSeededSelections, setHasSeededSelections] = useState(false);
  const [catalogRows, setCatalogRows] = useState<Record<string, unknown>[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showSkillLimit, setShowSkillLimit] = useState(48);
  const [selectionAnalysis, setSelectionAnalysis] = useState<LocalAnalysis>(EMPTY_LOCAL_ANALYSIS);

  const { data: dashboardResponse, refetch: refetchDashboard } = useGetUserDashboard();
  const { profile: aiProfile, summary, explicitProfile, refreshProfile } = useAIProfile();

  const dashboardData =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};

  const dashboardSkills = Array.isArray(dashboardData.skills) ? dashboardData.skills : [];
  const marketInsightsRaw =
    dashboardData.marketInsights && typeof dashboardData.marketInsights === "object"
      ? (dashboardData.marketInsights as Record<string, unknown>)
      : {};
  const marketSummary = Array.isArray(marketInsightsRaw.short_summary)
    ? (marketInsightsRaw.short_summary as Array<Record<string, unknown>>)
    : [];
  const marketRisingSkills = Array.isArray(marketInsightsRaw.rising_skills)
    ? (marketInsightsRaw.rising_skills as string[])
    : [];

  const strengths = selectionAnalysis.strengths;
  const missingSkills = selectionAnalysis.missingSkills;
  const partialGaps = selectionAnalysis.partialGaps;
  const analysisRecommendations = selectionAnalysis.recommendations;

  const visibleStrengths = resultsCleared ? [] : strengths;
  const visibleMissingSkills = resultsCleared ? [] : missingSkills;
  const visiblePartialGaps = resultsCleared ? [] : partialGaps;
  const visibleRecommendations = resultsCleared ? [] : analysisRecommendations;

  const effectiveTargetRole =
    (typeof explicitProfile?.target_role === "string" && explicitProfile.target_role.trim()) ||
    (typeof aiProfile?.target_role === "string" && aiProfile.target_role.trim()) ||
    (typeof summary?.top_goal === "string" && summary.top_goal.trim()) ||
    null;

  const personalizedMissingSkills = Array.isArray(summary?.missing_market_skills)
    ? summary.missing_market_skills.slice(0, 10)
    : Array.isArray(summary?.missing_skills)
      ? summary.missing_skills.slice(0, 10)
      : [];
  const personalizedHighPrioritySkills = Array.isArray(summary?.high_priority_skills)
    ? summary.high_priority_skills.slice(0, 10)
    : [];

  const currentSkillNames = useMemo(
    () =>
      uniqueStrings(
        dashboardSkills.map((item, idx) => {
          const row =
            typeof item === "object" && item !== null
              ? (item as Record<string, unknown>)
              : { name: `Skill ${idx + 1}` };
          return String(row.name ?? row.full_name ?? "");
        })
      ),
    [dashboardSkills]
  );

  const explicitSkillNames = useMemo(
    () =>
      uniqueStrings(
        Array.isArray(explicitProfile?.skills)
          ? explicitProfile.skills.map((skill) => String(skill?.name || ""))
          : []
      ),
    [explicitProfile?.skills]
  );

  const risingSkillSet = useMemo(
    () => new Set(marketRisingSkills.map((skill) => normalizeSkillText(skill)).filter(Boolean)),
    [marketRisingSkills]
  );

  const marketHighlightSkills = useMemo(
    () =>
      marketSummary
        .map((item) => String(item.skill ?? "").trim())
        .filter(Boolean)
        .slice(0, 8),
    [marketSummary]
  );

  const marketRoleOptions = useMemo(
    () => IT_MARKET_ROLES.map((role) => role.role),
    []
  );

  const globalRoleSkills = useMemo(
    () => uniqueStrings(IT_MARKET_ROLES.flatMap((role) => role.requiredSkills)),
    []
  );

  const roleSpecificSkills = useMemo(() => {
    const matchedRole = IT_MARKET_ROLES.find(
      (role) => role.role.toLowerCase() === selectedRole.trim().toLowerCase()
    );

    return matchedRole ? uniqueStrings(matchedRole.requiredSkills) : [];
  }, [selectedRole]);

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      setCatalogLoading(true);
      try {
        const catalog = await getSkillCatalog();
        if (!mounted) return;
        setCatalogRows(catalog);
      } catch (error) {
        if (!mounted) return;
        trackSkillsEvent("catalog_load_failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedRole || !effectiveTargetRole) return;
    setSelectedRole(effectiveTargetRole);
  }, [effectiveTargetRole, selectedRole]);

  useEffect(() => {
    if (hasSeededSelections) return;
    const seed = uniqueStrings([...explicitSkillNames, ...currentSkillNames]).slice(0, 12);
    if (seed.length === 0) return;

    setSelectedSkills(seed);
    setHasSeededSelections(true);
  }, [explicitSkillNames, currentSkillNames, hasSeededSelections]);

  const suggestedSkills = useMemo(
    () =>
      uniqueStrings([
        ...roleSpecificSkills,
        ...personalizedHighPrioritySkills,
        ...personalizedMissingSkills,
        ...marketHighlightSkills,
        ...marketRisingSkills,
        ...globalRoleSkills,
      ]).slice(0, 24),
    [
      roleSpecificSkills,
      personalizedHighPrioritySkills,
      personalizedMissingSkills,
      marketHighlightSkills,
      marketRisingSkills,
      globalRoleSkills,
    ]
  );

  const skillLibrary = useMemo(
    () =>
      uniqueStrings([
        ...catalogRows.map((row) => String(row.name ?? "")),
        ...globalRoleSkills,
        ...explicitSkillNames,
        ...currentSkillNames,
      ]),
    [catalogRows, globalRoleSkills, explicitSkillNames, currentSkillNames]
  );

  const combinedGaps = useMemo(
    () => [
      ...visibleMissingSkills.map((gap, idx) => ({
        id: `missing-${idx}-${gap.skill}`,
        kind: "missing" as const,
        name: gap.skill,
        priority:
          gap.priority === "high" || gap.priority === "medium" || gap.priority === "low"
            ? gap.priority
            : "medium",
        icon: "alert-triangle",
        category: gap.category || "General",
        color:
          gap.priority === "high"
            ? Colors.danger
            : gap.priority === "medium"
              ? Colors.warning
              : Colors.success,
        currentLevel: 0,
        targetLevel:
          gap.target_level === "advanced"
            ? 90
            : gap.target_level === "intermediate"
              ? 70
              : 50,
        gapSeverity: gap.gap_severity || "moderate",
        whyItMatters: gap.why_it_matters || "",
        currentLevelLabel: "none",
        targetLevelLabel: gap.target_level || "intermediate",
      })),
      ...visiblePartialGaps.map((gap, idx) => ({
        id: `partial-${idx}-${gap.skill}`,
        kind: "partial" as const,
        name: gap.skill,
        priority:
          gap.priority === "high" || gap.priority === "medium" || gap.priority === "low"
            ? gap.priority
            : "medium",
        icon: "trending-up",
        category: gap.category || "General",
        color:
          gap.priority === "high"
            ? Colors.danger
            : gap.priority === "medium"
              ? Colors.warning
              : Colors.success,
        currentLevel:
          gap.current_level === "advanced"
            ? 85
            : gap.current_level === "intermediate"
              ? 65
              : 35,
        targetLevel:
          gap.target_level === "advanced"
            ? 90
            : gap.target_level === "intermediate"
              ? 70
              : 50,
        gapSeverity: gap.gap_severity || "moderate",
        whyItMatters: gap.why_it_matters || "",
        currentLevelLabel: gap.current_level || "beginner",
        targetLevelLabel: gap.target_level || "intermediate",
      })),
    ],
    [visibleMissingSkills, visiblePartialGaps]
  );

  const filteredGaps =
    priorityFilter === "all"
      ? combinedGaps
      : combinedGaps.filter((gap) => gap.priority === priorityFilter);

  const toggleSkill = (skill: string) => {
    const normalized = String(skill || "").trim();
    if (!normalized) return;

    setSelectedSkills((current) => {
      const exists = current.some((item) => item.toLowerCase() === normalized.toLowerCase());
      if (exists) {
        return current.filter((item) => item.toLowerCase() !== normalized.toLowerCase());
      }

      return [...current, normalized];
    });
  };

  const runManagedGapAnalysis = async () => {
    const targetRole = selectedRole.trim();

    if (!targetRole) {
      setAnalysisError("Choose a role before running analysis.");
      setAnalysisNotice(null);
      return;
    }

    if (selectedSkills.length === 0) {
      setAnalysisError("Choose at least one current skill before running analysis.");
      setAnalysisNotice(null);
      return;
    }

    trackSkillsEvent("analysis_management_run", {
      role: targetRole,
      selectedSkills: selectedSkills.length,
    });

    const nextSelectionAnalysis = buildSelectionAnalysis(targetRole, selectedSkills);
    setSelectionAnalysis(nextSelectionAnalysis);
    setResultsCleared(false);

    setAnalysisRefreshing(true);
    setAnalysisError(null);
    setAnalysisNotice(null);

    try {
      await updateExplicitUserProfile({
        skills: selectedSkills.map((name) => ({
          name,
          level: "intermediate",
        })),
        target_role: targetRole,
        education: explicitProfile?.education || "",
        experience: explicitProfile?.experience || "",
        preferences: {
          domain: explicitProfile?.preferences?.domain || "",
          stack: explicitProfile?.preferences?.stack || "",
        },
      });

      await Promise.allSettled([
        refreshProfile(),
        refetchDashboard(),
        queryClient.invalidateQueries(),
      ]);

      setAnalysisNotice("Selection-based analysis updated from your chosen role and skills.");
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Unable to sync profile updates.");
      setAnalysisNotice("Selection-based results are ready, but profile sync failed.");
    } finally {
      setAnalysisRefreshing(false);
    }
  };

  const clearResultView = () => {
    setResultsCleared(true);
    setPriorityFilter("all");
    setAnalysisError(null);
    setAnalysisNotice("Results cleared to zero. Use Refresh Results or run analysis to load analysis-based output.");
  };

  const refreshResultView = async () => {
    setResultsRefreshing(true);
    setAnalysisError(null);
    try {
      if (!selectedRole.trim() || selectedSkills.length === 0) {
        setAnalysisNotice("Choose role and skills first, then run or refresh analysis.");
        return;
      }

      const nextSelectionAnalysis = buildSelectionAnalysis(selectedRole, selectedSkills);
      setSelectionAnalysis(nextSelectionAnalysis);
      setResultsCleared(false);
      setAnalysisNotice("Results refreshed from your selected role and skills.");
    } catch (error) {
      setAnalysisError(
        error instanceof Error ? error.message : "Unable to refresh selection-based results."
      );
    } finally {
      setResultsRefreshing(false);
    }
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
      <AnimatedSection style={styles.header} variant="up">
        <View style={styles.headerCopy}>
          <View style={styles.headerBrand}>
            <Image
              source={require("@/assets/images/logo-nexapath.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.screenTitle}>Skills Manager</Text>
              <Text style={styles.screenSub}>Pick role, pick skills, run AI gap analysis.</Text>
            </View>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection delay={40}>
        <GlassCard style={styles.managementCard} padding={18} radius={20}>
          <Text style={styles.kicker}>Step 1</Text>
          <Text style={styles.blockTitle}>Choose Your Target Role</Text>
          <View style={styles.roleWrap}>
            {marketRoleOptions.map((role) => {
              const active = selectedRole === role;
              return (
                <Pressable
                  key={role}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{role}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.kicker}>Step 2</Text>
          <View style={styles.skillsHeaderRow}>
            <Text style={styles.blockTitle}>Choose Current Skills</Text>
            <Badge label={`${selectedSkills.length} selected`} variant="primary" size="sm" />
          </View>

          {selectedSkills.length > 0 ? (
            <View style={styles.selectedRow}>
              {selectedSkills.map((skill) => (
                <Pressable
                  key={`selected-${skill}`}
                  style={styles.selectedSkillChip}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text style={styles.selectedSkillChipText}>{skill}</Text>
                  <Feather name="x" size={12} color={Colors.textPrimary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.hintText}>Select from suggested skills or the full library below.</Text>
          )}

          <Text style={styles.subBlockTitle}>Suggested Skills</Text>
          <View style={styles.skillWrap}>
            {suggestedSkills.map((skill) => {
              const active = selectedSkills.some(
                (item) => item.toLowerCase() === skill.toLowerCase()
              );
              return (
                <Pressable
                  key={`suggested-${skill}`}
                  style={[styles.skillChip, active && styles.skillChipActive]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text style={[styles.skillChipText, active && styles.skillChipTextActive]}>
                    {skill}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.subBlockTitle}>Skill Library</Text>
          {catalogLoading ? (
            <View style={styles.catalogLoadingRow}>
              <ActivityIndicator size="small" color={Colors.textSecondary} />
              <Text style={styles.catalogLoadingText}>Loading catalog...</Text>
            </View>
          ) : (
            <>
              <View style={styles.skillWrap}>
                {skillLibrary.slice(0, showSkillLimit).map((skill) => {
                  const active = selectedSkills.some(
                    (item) => item.toLowerCase() === skill.toLowerCase()
                  );
                  return (
                    <Pressable
                      key={`library-${skill}`}
                      style={[styles.skillChip, active && styles.skillChipActive]}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Text style={[styles.skillChipText, active && styles.skillChipTextActive]}>
                        {skill}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {showSkillLimit < skillLibrary.length ? (
                <MotionPressable
                  containerStyle={styles.moreButton}
                  onPress={() => setShowSkillLimit((count) => count + 24)}
                >
                  <Text style={styles.moreButtonText}>Show more skills</Text>
                </MotionPressable>
              ) : null}
            </>
          )}

          <Text style={styles.kicker}>Step 3</Text>
          <MotionPressable
            containerStyle={[
              styles.analysisButton,
              (!selectedRole || selectedSkills.length === 0 || analysisRefreshing) &&
                styles.analysisButtonDisabled,
            ]}
            disabled={!selectedRole || selectedSkills.length === 0 || analysisRefreshing}
            onPress={runManagedGapAnalysis}
          >
            {analysisRefreshing ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Feather name="cpu" size={16} color={Colors.background} />
            )}
            <Text style={styles.analysisButtonText}>
              {analysisRefreshing ? "Running analysis..." : "Run Skill Gap Analysis"}
            </Text>
          </MotionPressable>

          <View style={styles.actionsRow}>
            <MotionPressable
              containerStyle={[styles.refreshButton, resultsRefreshing && styles.analysisButtonDisabled]}
              disabled={resultsRefreshing}
              onPress={refreshResultView}
            >
              {resultsRefreshing ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Feather name="refresh-cw" size={14} color={Colors.background} />
              )}
              <Text style={styles.actionButtonText}>Refresh Results</Text>
            </MotionPressable>

            <MotionPressable
              containerStyle={styles.clearButton}
              onPress={clearResultView}
            >
              <Feather name="rotate-ccw" size={14} color={Colors.background} />
              <Text style={styles.actionButtonText}>Clear Results</Text>
            </MotionPressable>
          </View>

          {analysisError ? <Text style={styles.analysisError}>{analysisError}</Text> : null}
          {analysisNotice ? <Text style={styles.analysisNotice}>{analysisNotice}</Text> : null}
        </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <Text style={styles.kicker}>Results</Text>
      </AnimatedSection>

      {visibleStrengths.length === 0 && filteredGaps.length === 0 && visibleRecommendations.length === 0 ? (
        <AnimatedSection delay={100}>
          <GlassCard style={styles.emptyCard} padding={18} radius={18}>
            <Text style={styles.emptyTitle}>No analysis results yet</Text>
            <Text style={styles.emptyBody}>
              Choose your role and current skills, then run analysis to see strengths, gaps, and next actions.
            </Text>
          </GlassCard>
        </AnimatedSection>
      ) : null}

      {visibleStrengths.length > 0 ? (
        <>
          <AnimatedSection delay={110}>
            <Text style={styles.sectionLabel}>Strengths</Text>
          </AnimatedSection>
          {visibleStrengths.map((strength, index) => (
            <AnimatedSection key={`${strength.skill}-${index}`} delay={130 + index * 35}>
              <GlassCard style={styles.strengthCard} padding={18} radius={18}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>{strength.skill}</Text>
                  <View style={styles.gapTags}>
                    <Badge label={strength.category || "General"} variant="neutral" size="sm" />
                    <Badge label={`${strength.current_level} ready`} variant="success" size="sm" />
                    {risingSkillSet.has(normalizeSkillText(strength.skill)) ? (
                      <Badge label="Rising" variant="accent" size="sm" />
                    ) : null}
                  </View>
                </View>
                <Text style={styles.resultBody}>{strength.why_it_matters}</Text>
              </GlassCard>
            </AnimatedSection>
          ))}
        </>
      ) : null}

      <AnimatedSection delay={140}>
        <View style={styles.filterWrap}>
          {(["all", "high", "medium", "low"] as PriorityFilter[]).map((filter) => {
            const active = priorityFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setPriorityFilter(filter)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {filter === "all" ? "All Priorities" : `${filter.toUpperCase()} Priority`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AnimatedSection>

      {filteredGaps.length > 0 ? (
        filteredGaps.map((gap, index) => (
          <AnimatedSection key={gap.id} delay={160 + index * 35}>
            <GlassCard style={styles.gapCard} padding={18} radius={18}>
              <View style={styles.gapHeader}>
                <View style={styles.gapIcon}>
                  <Feather name={gap.icon as never} size={18} color={gap.color} />
                </View>
                <View style={styles.gapMeta}>
                  <Text style={styles.gapName}>{gap.name}</Text>
                  <View style={styles.gapTags}>
                    <Badge
                      label={gap.priority.toUpperCase()}
                      variant={PRIORITY_VARIANT[gap.priority]}
                      size="sm"
                    />
                    <Badge
                      label={gap.kind === "missing" ? "Missing" : "Partial"}
                      variant="primary"
                      size="sm"
                    />
                    <Badge label={gap.gapSeverity} variant="neutral" size="sm" />
                  </View>
                </View>
              </View>

              <View style={styles.gapBarSection}>
                <View style={styles.gapBarLabels}>
                  <Text style={styles.gapBarLabel}>Current</Text>
                  <Text style={styles.gapBarLabel}>Target</Text>
                </View>
                <SkillBar
                  current={gap.currentLevel}
                  target={gap.targetLevel}
                  color={gap.color}
                  showLabel={false}
                  height={10}
                />
                <View style={styles.gapBarValues}>
                  <Text style={styles.gapBarValue}>{gap.currentLevelLabel}</Text>
                  <Text style={[styles.gapBarValue, { color: gap.color }]}>{gap.targetLevelLabel}</Text>
                </View>
              </View>

              <Text style={styles.gapReasonText}>{gap.whyItMatters}</Text>

              <View style={styles.gapFooter}>
                <View style={styles.gapFooterItem}>
                  <Feather name="layers" size={13} color={Colors.textTertiary} />
                  <Text style={styles.gapFooterText}>{gap.category}</Text>
                </View>
                <View style={styles.gapFooterItem}>
                  <Feather name="flag" size={13} color={Colors.textTertiary} />
                  <Text style={styles.gapFooterText}>{gap.gapSeverity}</Text>
                </View>
              </View>
            </GlassCard>
          </AnimatedSection>
        ))
      ) : (
        <AnimatedSection delay={170}>
          <GlassCard style={styles.emptyCard} padding={18} radius={18}>
            <Text style={styles.emptyBody}>No gaps match this priority filter yet.</Text>
          </GlassCard>
        </AnimatedSection>
      )}

      {visibleRecommendations.length > 0 ? (
        <>
          <AnimatedSection delay={200}>
            <Text style={styles.sectionLabel}>Recommendations</Text>
          </AnimatedSection>
          {visibleRecommendations.map((recommendation, index) => (
            <AnimatedSection key={`${recommendation.title}-${index}`} delay={220 + index * 35}>
              <GlassCard style={styles.recommendationCard} padding={18} radius={18}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>{recommendation.title}</Text>
                  <Badge
                    label={recommendation.priority.toUpperCase()}
                    variant={
                      recommendation.priority === "high"
                        ? "danger"
                        : recommendation.priority === "low"
                          ? "success"
                          : "warning"
                    }
                    size="sm"
                  />
                </View>
                <Text style={styles.resultBody}>{recommendation.action}</Text>
                {recommendation.reason ? (
                  <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
                ) : null}
              </GlassCard>
            </AnimatedSection>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 18,
  },
  headerCopy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  screenSub: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  managementCard: {
    marginBottom: 18,
  },
  kicker: {
    color: "rgba(255, 255, 255, 0.68)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  subBlockTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roleChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary + "20",
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  roleChipTextActive: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  skillsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  selectedSkillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.accentTertiary + "1A",
    borderWidth: 1,
    borderColor: Colors.accentTertiary,
  },
  selectedSkillChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  skillChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "1A",
  },
  skillChipText: {
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  skillChipTextActive: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  catalogLoadingRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catalogLoadingText: {
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  moreButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  moreButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  analysisButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 24,
    backgroundColor: Colors.accentTertiary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  analysisButtonDisabled: {
    opacity: 0.55,
  },
  analysisButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  refreshButton: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: "#B91C1C",
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  clearButton: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: Colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  analysisError: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
    color: Colors.danger,
  },
  analysisNotice: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
    color: Colors.success,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptyCard: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  strengthCard: {
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  resultBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  recommendationCard: {
    marginBottom: 12,
  },
  recommendationReason: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  filterWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary + "18",
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  gapCard: {
    marginBottom: 12,
  },
  gapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  gapIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
  gapMeta: {
    flex: 1,
  },
  gapName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  gapTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  gapBarSection: {
    marginBottom: 12,
  },
  gapBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  gapBarLabel: {
    fontSize: 11,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
  },
  gapBarValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  gapBarValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  gapReasonText: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  gapFooter: {
    flexDirection: "row",
    gap: 14,
  },
  gapFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gapFooterText: {
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
  },
});
