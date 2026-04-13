import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "@/components/AnimatedSection";
import { SkillBar, TrendBar } from "@/components/ui/SkillBar";
import Colors from "@/constants/colors";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getBottomContentPadding } from "@/lib/layout";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function shortenText(value: string, maxLength = 84) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function getFirstSentence(value: unknown, fallback: string, maxLength = 118) {
  const text = normalizeText(value);
  if (!text) return fallback;

  const sentenceMatch = text.match(/.*?[.!?](?=\s|$)/);
  return shortenText(sentenceMatch?.[0] || text, maxLength);
}

function skillLevelRank(level: unknown) {
  const normalized = normalizeText(level).toLowerCase();
  if (normalized === "expert") return 4;
  if (normalized === "advanced") return 3;
  if (normalized === "intermediate") return 2;
  if (normalized === "beginner") return 1;
  return 0;
}

function skillLevelPercent(level: unknown) {
  const rank = skillLevelRank(level);
  if (rank === 4) return 100;
  if (rank === 3) return 75;
  if (rank === 2) return 50;
  if (rank === 1) return 25;
  return 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueItems(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter(Boolean)
    )
  );
}

type MarketTrendItem = {
  skill: string;
  frequency: number;
};

type PositionComparison = {
  skill: string;
  current: number;
  target: number;
  insight: string;
};

type FeedItemType =
  | { id: string; type: "action"; title: string; subtitle: string; actionText: string; onAction: () => void; hint?: string }
  | { id: string; type: "insight"; title: string; value: string; description?: string }
  | { id: string; type: "trend"; title: string; trends: MarketTrendItem[]; maxFrequency: number; insight: string }
  | { id: string; type: "gap"; title: string; comparisons: PositionComparison[] }
  | { id: string; type: "progress"; title: string; stats: { label: string; value: string | number }[] };

// ==========================================
// REUSABLE FEED COMPONENTS
// ==========================================

function ActionCard({ item }: { item: Extract<FeedItemType, { type: "action" }> }) {
  return (
    <AnimatedSection style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name="target" size={16} color={Colors.textSecondary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.cardValue}>{item.subtitle}</Text>
      <Pressable style={styles.actionButton} onPress={item.onAction}>
        <Text style={styles.actionButtonText}>{item.actionText}</Text>
        <Feather name="arrow-right" size={16} color={Colors.background} />
      </Pressable>
      {item.hint ? <Text style={styles.cardHint}>{item.hint}</Text> : null}
    </AnimatedSection>
  );
}

function ProgressCard({ item }: { item: Extract<FeedItemType, { type: "progress" }> }) {
  return (
    <AnimatedSection style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name="bar-chart-2" size={16} color={Colors.textSecondary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <View style={styles.progressRow}>
        {item.stats.map((stat, idx) => (
          <React.Fragment key={stat.label}>
            <View style={styles.progressItem}>
              <Text style={styles.progressValue}>{stat.value}</Text>
              <Text style={styles.progressLabel}>{stat.label}</Text>
            </View>
            {idx < item.stats.length - 1 && <View style={styles.progressDivider} />}
          </React.Fragment>
        ))}
      </View>
    </AnimatedSection>
  );
}

function InsightCard({ item }: { item: Extract<FeedItemType, { type: "insight" }> }) {
  return (
    <AnimatedSection style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name="zap" size={16} color={Colors.textSecondary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      <Text style={styles.insightValue}>{item.value}</Text>
      {item.description ? <Text style={styles.cardHint}>{item.description}</Text> : null}
    </AnimatedSection>
  );
}

function TrendCard({ item }: { item: Extract<FeedItemType, { type: "trend" }> }) {
  return (
    <AnimatedSection style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name="trending-up" size={16} color={Colors.textSecondary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      {item.trends.length > 0 ? (
        <View style={styles.chartStack}>
          {item.trends.map((trend, index) => (
            <TrendBar
              key={`${trend.skill}-${trend.frequency}`}
              label={trend.skill}
              value={trend.frequency}
              maxValue={item.maxFrequency}
              color={index === 0 ? Colors.textPrimary : Colors.textSecondary}
              muted={index !== 0}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyStateText}>Pull to refresh to load market signals.</Text>
      )}
      <Text style={styles.insightDesc}>{item.insight}</Text>
    </AnimatedSection>
  );
}

function GapCard({ item }: { item: Extract<FeedItemType, { type: "gap" }> }) {
  return (
    <AnimatedSection style={styles.card}>
      <View style={styles.cardHeader}>
        <Feather name="git-pull-request" size={16} color={Colors.textSecondary} />
        <Text style={styles.cardTitle}>{item.title}</Text>
      </View>
      {item.comparisons.length > 0 ? (
        <View style={styles.comparisonStack}>
          {item.comparisons.map((comp) => (
            <View key={comp.skill} style={styles.comparisonBlock}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonSkill}>{comp.skill}</Text>
                <Text style={styles.comparisonMeta}>
                  You {comp.current}% | Market {comp.target}%
                </Text>
              </View>
              <SkillBar
                current={comp.current}
                target={comp.target}
                color={Colors.textPrimary}
                height={8}
                showLabel={false}
                showPercentage={false}
              />
              <Text style={styles.comparisonInsight}>{comp.insight}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyStateText}>
          Missing and high-priority skills will appear here.
        </Text>
      )}
    </AnimatedSection>
  );
}

// ==========================================
// MAIN SCREEN
// ==========================================

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, summary, explicitProfile, loading, error, refreshProfile } = useAIProfile();

  const ai = profile;
  const confidence = typeof ai?.confidence === "number" ? ai.confidence : 0;
  const confidencePercent = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const skills = Array.isArray(ai?.skills) ? ai.skills : [];
  const gaps = Array.isArray(ai?.skill_gaps) ? ai.skill_gaps : [];
  const recommendations = Array.isArray(ai?.recommendations) ? ai.recommendations : [];
  const goals = Array.isArray(ai?.goals) ? ai.goals : [];
  const experienceYears = typeof ai?.experience_years === "number" ? ai.experience_years : 0;

  const targetRole =
    normalizeText(summary?.target_role) ||
    normalizeText(explicitProfile?.target_role) ||
    normalizeText(ai?.target_role) ||
    normalizeText(goals[0]) ||
    "Current profile";

  const strongestSkill = useMemo(() => {
    return [...skills].sort((left, right) => {
      const rankDifference =
        skillLevelRank(right?.proficiency_level || right?.level) -
        skillLevelRank(left?.proficiency_level || left?.level);

      if (rankDifference !== 0) return rankDifference;

      return normalizeText(left?.skill_name || left?.name).localeCompare(
        normalizeText(right?.skill_name || right?.name)
      );
    })[0];
  }, [skills]);

  const trendItems = useMemo<MarketTrendItem[]>(
    () =>
      (Array.isArray(summary?.market_short_summary) ? summary.market_short_summary : [])
        .map((item) => {
          const skill = normalizeText(item.skill);
          const frequency = Number(item.frequency || 0);

          if (!skill || !Number.isFinite(frequency)) return null;

          return {
            skill,
            frequency: Math.max(0, frequency),
          };
        })
        .filter((item): item is MarketTrendItem => Boolean(item))
        .sort((left, right) => right.frequency - left.frequency)
        .slice(0, 5),
    [summary?.market_short_summary]
  );

  // Fallback to sample data if backend market summary is empty or fails (placeholder for UI demo)
  const displayTrends = trendItems.length > 0 ? trendItems : [
    { skill: "React", frequency: 85 },
    { skill: "TypeScript", frequency: 72 },
    { skill: "Node.js", frequency: 64 },
    { skill: "AWS", frequency: 45 },
  ];
  const displayMaxTrendFrequency = displayTrends[0]?.frequency || 1;

  const userSkillLookup = useMemo(() => {
    const lookup = new Map<string, number>();

    skills.forEach((skill) => {
      const name = normalizeText(skill.skill_name || skill.name);
      if (!name) return;

      lookup.set(
        name,
        Math.max(
          lookup.get(name) || 0,
          skillLevelPercent(skill.proficiency_level || skill.level)
        )
      );
    });

    return lookup;
  }, [skills]);

  const trendFrequencyLookup = useMemo(() => {
    return new Map(trendItems.map((item) => [item.skill, item.frequency]));
  }, [trendItems]);

  const topMissingSkill =
    normalizeText(summary?.missing_market_skills?.[0]) ||
    normalizeText(summary?.missing_skills?.[0]) ||
    normalizeText(summary?.urgent_gaps?.[0]) ||
    normalizeText(gaps[0]?.skill_name) ||
    "No gap highlighted yet";

  const strongestSkillLabel = strongestSkill
    ? shortenText(
        `${normalizeText(strongestSkill.skill_name || strongestSkill.name)}${
          normalizeText(strongestSkill.proficiency_level || strongestSkill.level)
            ? ` | ${normalizeText(strongestSkill.proficiency_level || strongestSkill.level)}`
            : ""
        }`,
        72
      )
    : "No confirmed skill yet";

  const marketSignal = trendItems[0]
    ? `${trendItems[0].skill} | ${trendItems[0].frequency} signals`
    : normalizeText(summary?.high_priority_skills?.[0])
    ? `${normalizeText(summary?.high_priority_skills?.[0])} is trending`
    : getFirstSentence(summary?.market_summary, "Refresh to load market movement.", 72);

  const nextStep =
    normalizeText(summary?.recommended_next_step) ||
    normalizeText(summary?.next_step) ||
    normalizeText(recommendations[0]?.content || recommendations[0]?.title) ||
    "Open your roadmap and continue the next stage.";

  const comparisonSkills = useMemo(
    () =>
      uniqueItems([
        summary?.missing_market_skills?.[0],
        summary?.missing_skills?.[0],
        summary?.high_priority_skills?.[0],
        summary?.high_priority_skills?.[1],
      ]).slice(0, 2),
    [
      summary?.high_priority_skills,
      summary?.missing_market_skills,
      summary?.missing_skills,
    ]
  );

  const getMarketTargetPercent = (skill: string, fallback: number) => {
    const frequency = trendFrequencyLookup.get(skill);
    if (!frequency) return fallback;

    return Math.max(35, Math.round((frequency / maxTrendFrequency) * 100));
  };

  const maxTrendFrequency = trendItems[0]?.frequency || 1;

  const positionComparisons = useMemo<PositionComparison[]>(
    () =>
      comparisonSkills.map((skill, index) => {
        const current = userSkillLookup.get(skill) || 0;
        const target = index === 0
          ? Math.max(90, getMarketTargetPercent(skill, 100))
          : Math.max(75, getMarketTargetPercent(skill, 88));

        let insight = "Needs more depth to match current demand.";
        if (current === 0) {
          insight = "Not in your tracked skills yet.";
        } else if (current >= target - 10) {
          insight = "You are close to current market demand.";
        }

        return {
          skill,
          current,
          target,
          insight,
        };
      }),
    [comparisonSkills, maxTrendFrequency, trendFrequencyLookup, userSkillLookup, getMarketTargetPercent]
  );

  const roadmapRole =
    normalizeText(ai?.learning_roadmap?.role) ||
    (targetRole !== "Current profile" ? targetRole : "");

  const handleContinueRoadmap = () => {
    if (roadmapRole) {
      router.push({
        pathname: "/learn/[id]",
        params: {
          id: slugify(roadmapRole) || "role-roadmap",
          role: roadmapRole,
        },
      });
      return;
    }

    router.push("/learn");
  };

  const displayComparisons = positionComparisons.length > 0 ? positionComparisons : [
    { skill: "React", current: 40, target: 85, insight: "Needs more depth to match current demand." },
    { skill: "TypeScript", current: 0, target: 72, insight: "Not in your tracked skills yet." }
  ];

  const marketInsight = trendItems[0]
    ? shortenText(
        `${trendItems[0].skill} leads current demand, and ${topMissingSkill.toLowerCase()} is the clearest skill to close next.`,
        132
      )
    : getFirstSentence(summary?.market_summary, "Market signals will appear here after the next refresh.", 132);

  const feedData = useMemo<FeedItemType[]>(() => {
    return [
      {
        id: "progress",
        type: "progress",
        title: "Career Progress",
        stats: [
          { label: "Confidence", value: `${confidencePercent}%` },
          { label: "Experience", value: `${experienceYears}y` },
          { label: "Goals", value: goals.length },
        ],
      },
      {
        id: "insight-strongest",
        type: "insight",
        title: "Strongest Skill",
        value: strongestSkillLabel,
      },
      {
        id: "insight-missing",
        type: "insight",
        title: "Top Missing Skill",
        value: topMissingSkill,
      },
      {
        id: "trend-market",
        type: "trend",
        title: "Market Signal",
        trends: displayTrends,
        maxFrequency: displayMaxTrendFrequency,
        insight: marketInsight,
      },
      {
        id: "gap-market",
        type: "gap",
        title: "Your Position vs Market",
        comparisons: displayComparisons,
      },
    ];
  }, [
    confidencePercent,
    experienceYears,
    goals.length,
    strongestSkillLabel,
    topMissingSkill,
    displayTrends,
    displayMaxTrendFrequency,
    marketInsight,
    displayComparisons,
  ]);

  if (loading && !profile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.textPrimary} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={44} color={Colors.textSecondary} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refreshProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feedData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + 24,
            paddingBottom: getBottomContentPadding(insets.bottom) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!profile}
            onRefresh={refreshProfile}
            tintColor={Colors.textPrimary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.headerTop}>
              <Text style={styles.greeting}>For You</Text>
              <Pressable style={styles.refreshIcon} onPress={refreshProfile}>
                <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.roleTitle}>{targetRole}</Text>
            <View style={styles.focusContainer}>
              <ActionCard
                item={{
                  id: "action-next",
                  type: "action",
                  title: "Today's Focus",
                  subtitle: shortenText(nextStep, 92),
                  actionText: "Continue Roadmap",
                  onAction: handleContinueRoadmap,
                  hint: goals.length === 0 ? normalizeText(summary?.profile_completion_hint) || "Add more profile detail to sharpen the next roadmap step." : undefined,
                }}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          switch (item.type) {
            case "progress":
              return <ProgressCard item={item} />;
            case "insight":
              return <InsightCard item={item} />;
            case "trend":
              return <TrendCard item={item} />;
            case "gap":
              return <GapCard item={item} />;
            default:
              return null;
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerSection: {
    marginBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  roleTitle: {
    marginTop: 4,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  refreshIcon: {
    padding: 8,
  },
  focusContainer: {
    marginTop: 24,
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardValue: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  insightValue: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  cardHint: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressItem: {
    flex: 1,
  },
  progressValue: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  chartStack: {
    gap: 12,
    marginBottom: 16,
  },
  insightDesc: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  comparisonStack: {
    gap: 16,
  },
  comparisonBlock: {
    gap: 8,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comparisonSkill: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  comparisonMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  comparisonInsight: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 99,
    backgroundColor: Colors.textPrimary,
  },
  retryText: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
  },
});
