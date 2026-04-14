import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
import Colors from "@/constants/colors";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { MotionPressable } from "@/components/MotionPressable";
import { GlassCard, GradientCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { useGetUserDashboard } from "@workspace/api-client-react";
import { useAIProfile } from "@/hooks/useAIProfile";
import { analyzeSkillGapsWithAi } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

type FilterTab = "gaps" | "current";
type PriorityFilter = "all" | "high" | "medium" | "low";

const PRIORITY_COLORS: Record<string, string> = {
  high: Colors.danger,
  medium: Colors.warning,
  low: Colors.success,
};

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

const careerPulseAnimation = require("@/assets/animations/career-pulse.json");

function normalizeSkillText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function trackSkillsEvent(event: string, payload: Record<string, unknown> = {}) {
  // TODO(analytics): Replace console markers with production analytics SDK events.
  console.info("[Telemetry][Skills]", event, payload);
}

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>("gaps");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasAutoTriggeredAnalysis, setHasAutoTriggeredAnalysis] = useState(false);

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
  const analysis = aiProfile?.skill_gap_analysis;
  const strengths = Array.isArray(analysis?.strengths) ? analysis.strengths : [];
  const missingSkills = Array.isArray(analysis?.missing_skills) ? analysis.missing_skills : [];
  const partialGaps = Array.isArray(analysis?.partial_gaps) ? analysis.partial_gaps : [];
  const analysisRecommendations = Array.isArray(analysis?.recommendations)
    ? analysis.recommendations
    : [];
  const roadmap = aiProfile?.learning_roadmap || null;
  const effectiveTargetRole =
    (typeof explicitProfile?.target_role === "string" && explicitProfile.target_role.trim()) ||
    (typeof aiProfile?.target_role === "string" && aiProfile.target_role.trim()) ||
    (typeof summary?.top_goal === "string" && summary.top_goal.trim()) ||
    null;
  const aiGoals = Array.isArray(aiProfile?.goals) ? aiProfile.goals : [];
  const aiInterests = Array.isArray(aiProfile?.interests) ? aiProfile.interests : [];
  const personalizedMissingSkills = Array.isArray(summary?.missing_market_skills)
    ? summary.missing_market_skills.slice(0, 6)
    : Array.isArray(summary?.missing_skills)
    ? summary.missing_skills.slice(0, 6)
    : [];
  const personalizedHighPrioritySkills = Array.isArray(summary?.high_priority_skills)
    ? summary.high_priority_skills.slice(0, 6)
    : [];

  const currentSkills = dashboardSkills
    .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
    .map((skill, idx) => {
      const rawLevel = typeof skill.proficiency_level === "number" ? skill.proficiency_level : typeof skill.level === "number" ? skill.level : 0;
      const level = rawLevel <= 5 ? Math.round((rawLevel / 5) * 100) : Math.max(0, Math.min(100, rawLevel));
      return {
        id: String(skill.id ?? `skill-${idx}`),
        name: String(skill.name ?? skill.full_name ?? `Skill ${idx + 1}`),
        category: String(skill.category ?? "General"),
        level,
      };
    });

  const risingSkillSet = useMemo(
    () =>
      new Set(
        marketRisingSkills
          .map((skill) => normalizeSkillText(skill))
          .filter(Boolean)
      ),
    [marketRisingSkills]
  );

  const marketHighlightSkills = useMemo(
    () =>
      marketSummary
        .map((item) => {
          const skill = String(item.skill ?? "").trim();
          const frequency = Number(item.frequency ?? 0);
          return {
            skill,
            frequency,
            category: String(item.category ?? "General"),
          };
        })
        .filter((item) => item.skill.length > 0)
        .slice(0, 4),
    [marketSummary]
  );

  const personalizedMissingSkillSet = useMemo(
    () =>
      new Set(
        personalizedMissingSkills
          .map((skill) => normalizeSkillText(skill))
          .filter(Boolean)
      ),
    [personalizedMissingSkills]
  );

  const personalizedHighPrioritySet = useMemo(
    () =>
      new Set(
        personalizedHighPrioritySkills
          .map((skill) => normalizeSkillText(skill))
          .filter(Boolean)
      ),
    [personalizedHighPrioritySkills]
  );

  const combinedGaps = useMemo(
    () =>
      [
        ...missingSkills.map((gap, idx) => ({
          id: `missing-${idx}-${gap.skill}`,
          kind: "missing" as const,
          name: gap.skill,
          priority: gap.priority === "high" || gap.priority === "medium" || gap.priority === "low" ? gap.priority : "medium",
          gradient:
            gap.priority === "high"
              ? (["#EF4444", "#F97316"] as [string, string])
              : gap.priority === "medium"
                ? (["#F59E0B", "#F97316"] as [string, string])
                : (["#10B981", "#06B6D4"] as [string, string]),
          icon: gap.priority === "high" ? "alert-triangle" : "target",
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
        ...partialGaps.map((gap, idx) => ({
          id: `partial-${idx}-${gap.skill}`,
          kind: "partial" as const,
          name: gap.skill,
          priority: gap.priority === "high" || gap.priority === "medium" || gap.priority === "low" ? gap.priority : "medium",
          gradient:
            gap.priority === "high"
              ? (["#EF4444", "#F97316"] as [string, string])
              : gap.priority === "medium"
                ? (["#F59E0B", "#F97316"] as [string, string])
                : (["#10B981", "#06B6D4"] as [string, string]),
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
    [missingSkills, partialGaps]
  );

  const filteredGaps =
    priorityFilter === "all"
      ? combinedGaps
      : combinedGaps.filter((gap) => gap.priority === priorityFilter);

  const criticalGapCount = combinedGaps.filter((gap) => gap.gapSeverity === "critical").length;
  const moderateGapCount = combinedGaps.filter((gap) => gap.gapSeverity === "moderate").length;
  const minorGapCount = combinedGaps.filter((gap) => gap.gapSeverity === "minor").length;
  const hasMarketSkillSignals =
    personalizedMissingSkills.length > 0 || marketHighlightSkills.length > 0;

  const runAnalysis = async (targetRoleOverride?: string | null, source: "auto" | "manual" = "manual") => {
    const resolvedRole = (targetRoleOverride || effectiveTargetRole || "").trim();
    if (!resolvedRole) {
      setAnalysisError("Set a target role in Complete Your Profile before running analysis.");
      return;
    }

    trackSkillsEvent("analysis_refresh_requested", {
      role: resolvedRole,
      source,
    });

    setAnalysisRefreshing(true);
    setAnalysisError(null);
    try {
      await analyzeSkillGapsWithAi({ targetRole: resolvedRole });
      await Promise.allSettled([
        refreshProfile(),
        refetchDashboard(),
        queryClient.invalidateQueries(),
      ]);
      trackSkillsEvent("analysis_refresh_completed", {
        role: resolvedRole,
        gapCount: combinedGaps.length,
      });
    } catch (error) {
      trackSkillsEvent("analysis_refresh_failed", {
        role: resolvedRole,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setAnalysisError(error instanceof Error ? error.message : "Unable to refresh skill-gap analysis.");
    } finally {
      setAnalysisRefreshing(false);
      setHasAutoTriggeredAnalysis(true);
    }
  };

  useEffect(() => {
    if (!effectiveTargetRole || analysisRefreshing || hasAutoTriggeredAnalysis) {
      return;
    }

    if (combinedGaps.length === 0 && strengths.length === 0 && currentSkills.length > 0) {
      runAnalysis(effectiveTargetRole, "auto").catch(() => undefined);
    }
  }, [effectiveTargetRole, analysisRefreshing, hasAutoTriggeredAnalysis, combinedGaps.length, strengths.length, currentSkills.length]);

  const onRefresh = async () => {
    trackSkillsEvent("screen_refresh_tap", {
      hasTargetRole: Boolean(effectiveTargetRole),
    });
    await Promise.allSettled([refetchDashboard(), refreshProfile()]);
    if (effectiveTargetRole) {
      await runAnalysis(effectiveTargetRole, "manual");
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
      {/* Header */}
      <AnimatedSection style={styles.header} variant="up">
        <View style={styles.headerCopy}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image 
              source={require("@/assets/images/logo-nexapath.png")}
              style={{ width: 44, height: 44 }}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.screenTitle}>Skill Analysis</Text>
            </View>
          </View>
          </View>
        <Pressable style={styles.filterBtn} onPress={onRefresh}>
          {analysisRefreshing ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Feather name="refresh-cw" size={18} color={Colors.textSecondary} />
          )}
        </Pressable>
      </AnimatedSection>

      {/* Gap Summary Card */}
      <AnimatedSection delay={40}>
        <MotionPressable
          containerStyle={styles.profileCta}
          onPress={() => {
            trackSkillsEvent("open_profile_completion", { source: "profile-cta" });
            router.push("/profile-completion");
          }}
        >
          <View style={styles.profileCtaCopy}>
            <Text style={styles.profileCtaTitle}>Complete Your Profile</Text>
            <Text style={styles.profileCtaText}>
              Add explicit skills, target role, education, and preferences for more accurate AI guidance.
            </Text>
          </View>
          <View style={styles.profileCtaIcon}>
            <Feather name="arrow-right" size={18} color={Colors.background} />
          </View>
        </MotionPressable>
      </AnimatedSection>

      <AnimatedSection delay={80}>
      <GlassCard style={styles.profileSnapshotCard} padding={18} radius={20}>
        <View style={styles.snapshotHeader}>
          <View>
            <Text style={styles.snapshotEyebrow}>Explicit Profile</Text>
            <Text style={styles.snapshotTitle}>
              {explicitProfile?.target_role || "Add your target role"}
            </Text>
          </View>
          <Badge
            label={`${explicitProfile?.skills?.length || 0} explicit skills`}
            variant="primary"
            size="sm"
          />
        </View>
        <Text style={styles.snapshotBody}>
          {explicitProfile?.education ||
            explicitProfile?.experience ||
            "Define your education, experience, and preferences so the AI stops relying only on inference."}
        </Text>
        <View style={styles.snapshotMetaRow}>
          {explicitProfile?.preferences?.domain ? (
            <Badge label={explicitProfile.preferences.domain} variant="neutral" size="sm" />
          ) : null}
          {explicitProfile?.preferences?.stack ? (
            <Badge label={explicitProfile.preferences.stack} variant="neutral" size="sm" />
          ) : null}
        </View>
      </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={120}>
      <GlassCard style={styles.profileSnapshotCard} padding={18} radius={20}>
        <View style={styles.snapshotHeader}>
          <View>
            <Text style={styles.snapshotEyebrow}>AI Profile</Text>
            <Text style={styles.snapshotTitle}>
              {summary?.target_role || aiGoals[0] || "Profile still learning"}
            </Text>
          </View>
          <Badge
            label={`${Math.round((aiProfile?.confidence || 0) * 100)}% confidence`}
            variant="success"
            size="sm"
          />
        </View>
        <Text style={styles.snapshotBody}>
          {summary?.recommended_next_step ||
            summary?.next_step ||
            "Run AI analysis or chat with the assistant to produce a sharper next step."}
        </Text>
        <View style={styles.snapshotMetaRow}>
          {aiInterests.slice(0, 2).map((interest) => (
            <Badge key={interest} label={interest} variant="neutral" size="sm" />
          ))}
          {roadmap?.role ? (
            <Pressable
              style={styles.inlineRoadmapButton}
              onPress={() => {
                trackSkillsEvent("open_roadmap", {
                  role: roadmap.role,
                  source: "skills-inline-roadmap",
                });
                router.push({
                  pathname: "/learn/[id]",
                  params: {
                    id: String(roadmap.role).toLowerCase().replace(/\s+/g, "-"),
                    role: roadmap.role,
                  },
                });
              }}
            >
              <Feather name="map" size={14} color={Colors.primary} />
              <Text style={styles.inlineRoadmapButtonText}>Open roadmap</Text>
            </Pressable>
          ) : null}
        </View>
      </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={160}>
      <GradientCard style={styles.analysisBanner}>
        <Text style={styles.analysisBannerTitle}>AI Gap Analysis</Text>
        <Text style={styles.analysisBannerSubtitle}>
          {effectiveTargetRole
            ? `Role target: ${effectiveTargetRole}`
            : "Add a target role to unlock role-based gap analysis."}
        </Text>
        <Text style={styles.analysisBannerText}>
          Structured analysis uses your explicit profile first, then AI profile context, against the selected role taxonomy.
        </Text>
        <MotionPressable
          containerStyle={[
            styles.analysisButton,
            (!effectiveTargetRole || analysisRefreshing) && styles.analysisButtonDisabled,
          ]}
          disabled={!effectiveTargetRole || analysisRefreshing}
          onPress={() => runAnalysis(effectiveTargetRole)}
        >
          {analysisRefreshing ? (
            <ActivityIndicator size="small" color={Colors.background} />
          ) : (
            <Feather name="zap" size={16} color={Colors.background} />
          )}
          <Text style={styles.analysisButtonText}>
            {analysisRefreshing ? "Analyzing..." : "Refresh AI analysis"}
          </Text>
        </MotionPressable>
        {analysisError ? <Text style={styles.analysisError}>{analysisError}</Text> : null}
      </GradientCard>
      </AnimatedSection>

      <AnimatedSection delay={200}>
      <View style={styles.summaryCard}>
        <View style={StyleSheet.absoluteFill}
        />
        <Text style={styles.summaryTitle}>Gap Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <AnimatedCounter
              value={criticalGapCount}
              style={[styles.summaryValue, { color: Colors.danger }]}
            />
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <AnimatedCounter
              value={moderateGapCount}
              style={[styles.summaryValue, { color: Colors.warning }]}
            />
            <Text style={styles.summaryLabel}>Moderate</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <AnimatedCounter
              value={minorGapCount}
              style={[styles.summaryValue, { color: Colors.success }]}
            />
            <Text style={styles.summaryLabel}>Minor</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <AnimatedCounter
              value={strengths.length}
              style={[styles.summaryValue, { color: Colors.primary }]}
            />
            <Text style={styles.summaryLabel}>Strengths</Text>
          </View>
        </View>
      </View>
      </AnimatedSection>

      {/* Tab Switcher */}
      <AnimatedSection delay={240}>
      <View style={styles.tabSwitcher}>
        {(["gaps", "current"] as FilterTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === tab && styles.tabBtnTextActive,
              ]}
            >
              {tab === "gaps" ? "Skill Gaps" : "Current Skills"}
            </Text>
          </Pressable>
        ))}
      </View>
      </AnimatedSection>

      {activeTab === "gaps" ? (
        <>
          {/* Priority Filter */}
          <AnimatedSection delay={260}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {(["all", "high", "medium", "low"] as PriorityFilter[]).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  priorityFilter === f && {
                    backgroundColor:
                      f === "high"
                        ? Colors.danger + "20"
                        : f === "medium"
                        ? Colors.warning + "20"
                        : f === "low"
                        ? Colors.success + "20"
                        : Colors.primary + "20",
                    borderColor:
                      f === "high"
                        ? Colors.danger
                        : f === "medium"
                        ? Colors.warning
                        : f === "low"
                        ? Colors.success
                        : Colors.primary,
                  },
                ]}
                onPress={() => setPriorityFilter(f)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    priorityFilter === f && {
                      color:
                        f === "high"
                          ? Colors.danger
                          : f === "medium"
                          ? Colors.warning
                          : f === "low"
                          ? Colors.success
                          : Colors.primary,
                    },
                  ]}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          </AnimatedSection>

          {strengths.length > 0 ? (
            <>
              <AnimatedSection delay={280}>
                <Text style={styles.subheading}>Role-Aligned Strengths</Text>
              </AnimatedSection>
              {strengths.map((strength, index) => (
                <AnimatedSection key={`${strength.skill}-${index}`} delay={300 + index * 40}>
                <GlassCard key={`${strength.skill}-${index}`} style={styles.strengthCard} padding={18} radius={18}>
                  <View style={styles.strengthHeader}>
                    <View style={styles.strengthIcon}>
                      <Feather name="check-circle" size={18} color={Colors.success} />
                    </View>
                    <View style={styles.strengthMeta}>
                      <Text style={styles.strengthName}>{strength.skill}</Text>
                      <View style={styles.gapTags}>
                        <Badge label={strength.category} variant="neutral" size="sm" />
                        <Badge label={`${strength.current_level} ready`} variant="success" size="sm" />
                        {risingSkillSet.has(normalizeSkillText(strength.skill)) ? (
                            <Badge label="Rising demand" variant="accent" size="sm" />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.strengthReason}>{strength.why_it_matters}</Text>
                </GlassCard>
                </AnimatedSection>
              ))}
            </>
          ) : null}

          {filteredGaps.length > 0 ? (
            filteredGaps.map((gap, index) => (
              <AnimatedSection key={gap.id} delay={320 + index * 35}>
              <GlassCard style={styles.gapCard} padding={20} radius={20}>
                <View style={styles.gapHeader}>
                  <View style={styles.gapIcon}>
                    <Feather name={gap.icon as any} size={20} color={Colors.textPrimary} />
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
                      {risingSkillSet.has(normalizeSkillText(gap.name)) ? (
                        <Badge label="Rising demand" variant="accent" size="sm" />
                      ) : null}
                      {personalizedHighPrioritySet.has(normalizeSkillText(gap.name)) ? (
                        <Badge label="High demand" variant="accent" size="sm" />
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.gapBarSection}>
                  <View style={styles.gapBarLabels}>
                    <Text style={styles.gapBarLabel}>Current Level</Text>
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
                    <Text style={[styles.gapBarValue, { color: gap.color }]}>
                      {gap.targetLevelLabel}
                    </Text>
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
            <AnimatedSection delay={320}>
              <GlassCard style={styles.emptyAnalysisCard} padding={20} radius={18}>
                <Text style={styles.emptyAnalysisTitle}>No structured gap analysis yet</Text>
                <Text style={styles.emptyAnalysisBody}>
                  {effectiveTargetRole
                    ? "Run the AI analysis to compare your explicit profile and AI profile against your target role."
                    : "Add a target role in Complete Your Profile to unlock role-based gap analysis."}
                </Text>
              </GlassCard>
            </AnimatedSection>
          )}

          <AnimatedSection delay={360}>
            <Text style={styles.subheading}>Recommendations</Text>
          </AnimatedSection>
          {analysisRecommendations.length > 0 ? (
            analysisRecommendations.map((recommendation, index) => (
              <AnimatedSection key={`${recommendation.title}-${index}`} delay={380 + index * 40}>
              <GlassCard style={styles.recommendationCard} padding={18} radius={18}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIcon}>
                    <Feather name="zap" size={16} color={Colors.primary} />
                  </View>
                  <View style={styles.recommendationMeta}>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
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
                </View>
                <Text style={styles.recommendationText}>{recommendation.action}</Text>
                {recommendation.reason ? (
                  <Text style={styles.recommendationReason}>{recommendation.reason}</Text>
                ) : null}
              </GlassCard>
              </AnimatedSection>
            ))
          ) : (
            <AnimatedSection delay={380}>
              <GlassCard style={styles.emptyAnalysisCard} padding={20} radius={18}>
                <Text style={styles.emptyAnalysisBody}>
                  Recommendations appear after role-based analysis is complete.
                </Text>
              </GlassCard>
            </AnimatedSection>
          )}
        </>
      ) : (
        <>
          <AnimatedSection delay={280}>
            <Text style={styles.subheading}>Your Skill Strengths</Text>
          </AnimatedSection>
          {!hasMarketSkillSignals ? (
            <AnimatedSection delay={285}>
              <GlassCard style={styles.emptyAnalysisCard} padding={16} radius={14}>
                <Text style={styles.emptyAnalysisBody}>
                  Market signals are limited right now. Refresh to load the latest demand snapshot.
                </Text>
              </GlassCard>
            </AnimatedSection>
          ) : null}
          {personalizedMissingSkills.length > 0 ? (
            <AnimatedSection delay={290}>
              <GlassCard style={styles.marketSkillsCard} padding={14} radius={14}>
                <Text style={styles.marketSkillsTitle}>Missing In Market</Text>
                <View style={styles.marketSkillsRow}>
                  {personalizedMissingSkills.map((skill) => (
                    <Badge key={`missing-${skill}`} label={skill} variant="warning" size="sm" />
                  ))}
                </View>
              </GlassCard>
            </AnimatedSection>
          ) : null}
          {marketHighlightSkills.length > 0 ? (
            <AnimatedSection delay={300}>
              <GlassCard style={styles.marketSkillsCard} padding={14} radius={14}>
                <Text style={styles.marketSkillsTitle}>Rising For Your Role</Text>
                <View style={styles.marketSkillsRow}>
                  {marketHighlightSkills.map((item, index) => (
                    <Badge
                      key={`${item.skill}-${index}`}
                      label={`${item.skill} (${item.frequency})`}
                      variant="accent"
                      size="sm"
                    />
                  ))}
                </View>
              </GlassCard>
            </AnimatedSection>
          ) : null}
          {currentSkills.map((skill, index) => (
            <AnimatedSection key={skill.id} delay={320 + index * 35}>
            <GlassCard style={styles.skillCard} padding={18} radius={16}>
              <View style={styles.skillHeader}>
                <View style={styles.skillInfo}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <View style={styles.skillBadges}>
                    <Badge label={skill.category} variant="neutral" size="sm" />
                    {risingSkillSet.has(normalizeSkillText(skill.name)) ? (
                      <Badge label="Rising" variant="accent" size="sm" />
                    ) : null}
                    {personalizedMissingSkillSet.has(normalizeSkillText(skill.name)) ? (
                      <Badge label="Gap" variant="warning" size="sm" />
                    ) : null}
                    {personalizedHighPrioritySet.has(normalizeSkillText(skill.name)) ? (
                      <Badge label="Priority" variant="accent" size="sm" />
                    ) : null}
                  </View>
                </View>
                {/* TODO(analytics): Track taps on market skill badges if chips become interactive. */}
                <Text
                  style={[
                    styles.skillLevel,
                    {
                      color:
                        skill.level >= 80
                          ? Colors.success
                          : skill.level >= 60
                          ? Colors.primary
                          : Colors.warning,
                    },
                  ]}
                >
                  {skill.level >= 80
                    ? "Expert"
                    : skill.level >= 60
                    ? "Proficient"
                    : "Developing"}
                </Text>
              </View>
              <SkillBar
                current={skill.level}
                color={
                  skill.level >= 80
                    ? Colors.success
                    : skill.level >= 60
                    ? Colors.primary
                    : Colors.warning
                }
                showLabel={false}
                style={{ marginTop: 12 }}
                height={8}
              />
            </GlassCard>
            </AnimatedSection>
          ))}
        </>
      )}
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
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  headerAccent: {
    opacity: 0.95,
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileCta: {
    marginBottom: 18,
    borderRadius: 18,
    padding: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileCtaCopy: {
    flex: 1,
  },
  profileCtaTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  profileCtaText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  profileCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSnapshotCard: {
    marginBottom: 14,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  snapshotEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  snapshotTitle: {
    marginTop: 6,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  snapshotBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  snapshotMetaRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  inlineRoadmapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  inlineRoadmapButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
  },
  analysisBanner: {
    marginBottom: 18,
  },
  analysisBannerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  analysisBannerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.background + "CC",
  },
  analysisBannerText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.background + "D9",
  },
  analysisButton: {
    marginTop: 14,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
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
  analysisError: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
  },
  summaryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
  },
  summaryTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: Colors.surface,
                      },
  tabBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  tabBtnTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  filterScroll: { marginBottom: 16 },
  filterScrollContent: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  gapCard: { marginBottom: 14 },
  gapHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 16 },
  gapIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gapMeta: { flex: 1 },
  gapName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  gapTags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  gapBarSection: { marginBottom: 14 },
  gapBarLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  gapBarLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  gapBarValues: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  gapBarValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  gapReasonText: {
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  gapFooter: { flexDirection: "row", gap: 16 },
  gapFooterItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  gapFooterText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    flex: 1,
  },
  subheading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 14,
    marginTop: 4,
  },
  strengthCard: {
    marginBottom: 12,
  },
  strengthHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  strengthIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success + "18",
  },
  strengthMeta: {
    flex: 1,
    gap: 6,
  },
  strengthName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  strengthReason: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  recommendationCard: {
    marginBottom: 12,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  recommendationIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "15",
  },
  recommendationMeta: {
    flex: 1,
    gap: 6,
  },
  recommendationTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  recommendationReason: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyAnalysisCard: {
    marginBottom: 14,
  },
  emptyAnalysisTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  emptyAnalysisBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  skillCard: { marginBottom: 10 },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  skillInfo: { flex: 1, gap: 6 },
  skillBadges: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  skillName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  marketSkillsCard: {
    marginBottom: 12,
  },
  marketSkillsTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  marketSkillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skillLevel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
