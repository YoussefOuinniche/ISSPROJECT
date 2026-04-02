import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { useGetCurrentUser, useGetUserDashboard } from "@workspace/api-client-react";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { getBottomContentPadding } from "@/lib/layout";

function StatCard({
  label,
  value,
  icon,
  color,
  sublabel,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  sublabel?: string;
}) {
  return (
    <GlassCard style={styles.statCard} padding={16} radius={16}>
      <View style={[styles.statIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
    </GlassCard>
  );
}

function QuickActionButton({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={[styles.quickActionWrap, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.quickActionBtn}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: color + "15" }]}>
          <Feather name={icon as any} size={20} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapGapColor(level: number): string {
  if (level >= 4) return Colors.danger;
  if (level >= 3) return Colors.warning;
  return Colors.primary;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const {
    data: dashboardResponse,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useGetUserDashboard();
  const currentUserQuery = useGetCurrentUser();
  const refetchCurrentUser = currentUserQuery.refetch;

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      refetchCurrentUser();
    }, [refetch, refetchCurrentUser])
  );

  const dashboard = useMemo(() => asRecord(dashboardResponse?.data), [dashboardResponse]);
  const profile = asRecord(dashboard.profile);
  const gapStatistics = asRecord(dashboard.gapStatistics);

  const skillRows = Array.isArray(dashboard.skills) ? dashboard.skills : [];
  const gapRows = Array.isArray(dashboard.skillGaps) ? dashboard.skillGaps : [];
  const recommendationRows = Array.isArray(dashboard.recentRecommendations)
    ? dashboard.recentRecommendations
    : [];

  const topPriorityGaps = gapRows
    .map((item) => asRecord(item))
    .filter((gap) => asNumber(gap.gap_level) >= 3)
    .slice(0, 3);

  const recentRecommendations = recommendationRows
    .map((item) => asRecord(item))
    .slice(0, 3);

  const currentUserEnvelope = asRecord(currentUserQuery.data?.data);
  const currentUser = asRecord(currentUserEnvelope.user);
  const fullName = asString(currentUser.full_name, asString(profile.full_name, "SkillPulse User"));
  const title = asString(profile.title, "Professional");
  const domainsWithGaps = asNumber(gapStatistics.domains_with_gaps);
  const score = computeProfileCompleteness(profile, skillRows);
  const highPriorityCount = asNumber(gapStatistics.high_priority_count);
  const totalGaps = asNumber(gapStatistics.total_gaps);
  const totalSkills = skillRows.length;
  const totalRecommendations = recommendationRows.length;

  return (
    <Reanimated.View entering={FadeIn.duration(280)} style={{ flex: 1 }}>
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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.userName}>{fullName}</Text>
        </View>
        <Pressable style={styles.notifButton} onPress={() => refetch()}>
          <Feather name="bell" size={22} color={Colors.textSecondary} />
          <View style={styles.notifDot} />
        </Pressable>
      </View>

      {/* Hero Score Card */}
      <LinearGradient
        colors={["#0F172A", "#1E293B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={["rgba(0,212,255,0.15)", "rgba(124,58,237,0.15)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>Your Growth Snapshot</Text>
          <Text style={styles.heroSubtitle}>
            <Text style={{ color: Colors.primary }}>{title}</Text>
          </Text>
          <View style={styles.heroBadge}>
            <Feather name="trending-up" size={12} color={Colors.success} />
            <Text style={styles.heroBadgeText}>
              {isLoading ? "Loading your dashboard" : isRefetching ? "Updating" : "Ready"}
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}>
              <Feather name="zap" size={14} color={Colors.warning} />
              <Text style={styles.heroMetaText}>{highPriorityCount} high-priority gaps</Text>
            </View>
            <View style={styles.heroMetaItem}>
              <Feather name="clock" size={14} color={Colors.primary} />
              <Text style={styles.heroMetaText}>{domainsWithGaps} domains affected</Text>
            </View>
          </View>
        </View>
        <ScoreRing
          score={score}
          size={120}
          strokeWidth={8}
          primaryColor={Colors.primary}
          trackColor="rgba(255,255,255,0.1)"
          label="SCORE"
          sublabel="/100"
        />
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          label="Skills"
          value={totalSkills}
          icon="check-circle"
          color={Colors.success}
          sublabel="persisted"
        />
        <StatCard
          label="Skill Gaps"
          value={totalGaps}
          icon="play-circle"
          color={Colors.primary}
        />
        <StatCard
          label="Recommendations"
          value={totalRecommendations}
          icon="award"
          color={Colors.warning}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <QuickActionButton
          label="Skill Gap"
          icon="target"
          color={Colors.accent}
          onPress={() => router.push("/(tabs)/skills")}
        />
        <QuickActionButton
          label="My Path"
          icon="map"
          color={Colors.primary}
          onPress={() => router.push("/(tabs)/learn")}
        />
        <QuickActionButton
          label="Trends"
          icon="trending-up"
          color={Colors.success}
          onPress={() => router.push("/(tabs)/trends")}
        />
        <QuickActionButton
          label="AI Coach"
          icon="cpu"
          color={Colors.warning}
          onPress={() => router.push("/ai-assistant")}
        />
      </View>

      <GlassCard style={styles.chartCard} padding={16} radius={16}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Insights</Text>
          <Text style={styles.sectionMeta}>{isError ? "Update failed" : "Auto refresh"}</Text>
        </View>
        <Text style={styles.gapTime}>
          {isLoading
            ? "Preparing your profile overview..."
            : isRefetching
            ? "Refreshing your latest progress..."
            : "Your dashboard reflects your latest saved profile, skills, and recommendations."}
        </Text>
      </GlassCard>

      {/* Top Priority Gap */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Priority Gaps</Text>
        <Pressable onPress={() => router.push("/(tabs)/skills")}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {topPriorityGaps.map((gap, idx) => {
        const gapLevel = Math.max(0, asNumber(gap.gap_level));
        const currentLevel = Math.max(0, Math.min(100, Math.round(100 - gapLevel * 20)));
        const targetLevel = 100;
        const color = mapGapColor(gapLevel);
        const skillName = asString(gap.skill_full_name) || asString(gap.skill_name, `Gap ${idx + 1}`);
        const demandScore = Math.max(50, 100 - gapLevel * 5);

        return (
        <GlassCard key={asString(gap.id, `gap-${idx}`)} style={styles.gapCard} padding={18} radius={16}>
          <View style={styles.gapHeader}>
            <View style={[styles.gapIcon, { backgroundColor: color + "15" }]}> 
              <Feather name="target" size={18} color={color} />
            </View>
            <View style={styles.gapInfo}>
              <Text style={styles.gapName}>{skillName}</Text>
              <Text style={styles.gapTime}>Gap level {gapLevel} out of 5</Text>
            </View>
            <Badge
              label={`${demandScore}% demand`}
              variant="primary"
            />
          </View>
          <SkillBar
            current={currentLevel}
            target={targetLevel}
            color={color}
            style={{ marginTop: 12 }}
            showLabel={false}
          />
          <View style={styles.gapLevels}>
            <Text style={styles.gapLevel}>Current: {currentLevel}%</Text>
            <Text style={[styles.gapLevel, { color }]}>Target: {targetLevel}%</Text>
          </View>
        </GlassCard>
      );
      })}

      {/* Recent Recommendations */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Recommendations</Text>
        <Pressable onPress={() => router.push("/recommendations")}> 
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {recentRecommendations.map((rec, idx) => {
        const titleText = asString(rec.title, `Recommendation ${idx + 1}`);
        const contentText = asString(rec.content, "Personalized recommendation");
        const recType = asString(rec.type, "course");
        const createdAt = asString(rec.created_at);
        const gradient = recType === "article"
          ? ["#00D4FF", "#0EA5E9"]
          : recType === "book"
          ? ["#EC4899", "#8B5CF6"]
          : ["#7C3AED", "#EC4899"];

        return (
        <Pressable
          key={asString(rec.id, `rec-${idx}`)}
          onPress={() => router.push("/recommendations")}
        >
          <GlassCard style={styles.learnCard} padding={0} radius={16}>
            <LinearGradient
              colors={gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.learnCardHeader}
            >
              <View>
                <Text style={styles.learnCardTitle}>{titleText}</Text>
                <Text style={styles.learnCardProvider}>{recType.toUpperCase()}</Text>
              </View>
              <View style={styles.learnProgress}>
                <Text style={styles.learnProgressText}>{Math.max(60, 100 - idx * 10)}%</Text>
              </View>
            </LinearGradient>
            <View style={styles.learnCardBody}>
              <View style={styles.learnCardNext}>
                <Feather name="play-circle" size={14} color={Colors.primary} />
                <Text style={styles.learnNextText} numberOfLines={1}>
                  {contentText}
                </Text>
                <Text style={styles.learnDuration}>{createdAt ? new Date(createdAt).toLocaleDateString("en-GB") : "Now"}</Text>
              </View>
              <SkillBar
                current={Math.max(60, 100 - idx * 10)}
                color={gradient[0]}
                showLabel={false}
                showPercentage={false}
                height={4}
                style={{ marginTop: 10 }}
              />
            </View>
          </GlassCard>
        </Pressable>
      );
      })}
    </ScrollView>
    </Reanimated.View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroSubtitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textInverse,
    marginTop: 4,
    lineHeight: 28,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.success,
  },
  heroMeta: {
    marginTop: 12,
    gap: 6,
  },
  heroMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  statSublabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
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
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  quickActionWrap: {
    flex: 1,
  },
  quickActionBtn: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  chartCard: {
    marginBottom: 24,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 80,
    gap: 8,
  },
  chartBar: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  chartBarTrack: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: {
    borderRadius: 6,
    width: "100%",
  },
  chartDayLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  gapCard: {
    marginBottom: 12,
  },
  gapHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  gapIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gapInfo: {
    flex: 1,
  },
  gapName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  gapTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  gapLevels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  gapLevel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  learnCard: {
    marginBottom: 12,
    overflow: "hidden",
  },
  learnCardHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  learnCardTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textInverse,
  },
  learnCardProvider: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  learnProgress: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  learnProgressText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textInverse,
  },
  learnCardBody: {
    padding: 14,
  },
  learnCardNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  learnNextText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  learnDuration: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
});
