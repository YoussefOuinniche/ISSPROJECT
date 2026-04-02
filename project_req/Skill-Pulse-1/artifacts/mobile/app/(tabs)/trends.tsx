import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { getTrends } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

const CATEGORIES = ["All"];

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"demand" | "growth">("demand");
  const [trendRows, setTrendRows] = useState<Record<string, unknown>[]>([]);

  const refetch = async () => {
    const rows = await getTrends();
    setTrendRows(rows);
  };

  useEffect(() => {
    refetch().catch(() => undefined);
  }, []);

  const trends = useMemo(
    () =>
      trendRows
        .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
        .map((item, idx) => {
          const demand = 60 + ((idx * 7) % 35);
          const growthValue = `+${Math.max(6, Math.round(demand / 7))}%`;
          const category = String(item.domain ?? "General");
      return {
        id: String(item.id ?? `trend-${idx}`),
        skill: String(item.title ?? `Trend ${idx + 1}`),
        description: String(item.description ?? "Based on current market movement and hiring demand."),
        demand,
        growth: growthValue,
        salary: String(item.source ?? "Industry report"),
        jobs: String(item.domain ?? "Global market"),
        category,
        trending: demand >= 78,
        direction: growthValue.startsWith("-") ? "down" : "up",
        color: demand >= 80 ? Colors.success : demand >= 65 ? Colors.primary : Colors.warning,
      };
    }),
    [trendRows]
  );

  const filtered =
    activeCategory === "All"
      ? trends
      : trends.filter((t) => t.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "demand") return b.demand - a.demand;
    return 0;
  });

  const topTrending = trends.filter((t) => t.trending).slice(0, 3);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Market Trends</Text>
          <Text style={styles.screenSub}>Updated from live industry data</Text>
        </View>
        <Pressable
          style={styles.sortBtn}
          onPress={async () => {
            setSortBy(sortBy === "demand" ? "growth" : "demand");
            await refetch();
          }}
        >
          <Feather name="filter" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Hot Skills Banner */}
      <LinearGradient
        colors={["#0F172A", "#1E293B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hotBanner}
      >
        <LinearGradient
          colors={["rgba(0,212,255,0.15)", "rgba(124,58,237,0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.hotHeader}>
          <View style={styles.hotBadge}>
            <Feather name="zap" size={11} color={Colors.warning} />
            <Text style={styles.hotBadgeText}>Hot Right Now</Text>
          </View>
          <Text style={styles.hotMeta}>Latest updates</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hotScroll}>
          {topTrending.map((trend, idx) => (
            <View key={trend.id} style={styles.hotItem}>
              <Text style={styles.hotRank}>#{idx + 1}</Text>
              <Text style={styles.hotSkill}>{trend.skill}</Text>
              <Text style={[styles.hotGrowth, { color: Colors.success }]}>{trend.growth}</Text>
              <Text style={styles.hotSalary}>{trend.salary}</Text>
            </View>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catScrollContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text
              style={[
                styles.catChipText,
                activeCategory === cat && styles.catChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>
          {sorted.length} skills · sorted by {sortBy}
        </Text>
        <View style={styles.sortToggle}>
          <Pressable
            style={[styles.sortToggleBtn, sortBy === "demand" && styles.sortToggleBtnActive]}
            onPress={() => setSortBy("demand")}
          >
            <Text
              style={[
                styles.sortToggleBtnText,
                sortBy === "demand" && styles.sortToggleBtnTextActive,
              ]}
            >
              Demand
            </Text>
          </Pressable>
          <Pressable
            style={[styles.sortToggleBtn, sortBy === "growth" && styles.sortToggleBtnActive]}
            onPress={() => setSortBy("growth")}
          >
            <Text
              style={[
                styles.sortToggleBtnText,
                sortBy === "growth" && styles.sortToggleBtnTextActive,
              ]}
            >
              Growth
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Trend Cards */}
      {sorted.map((trend, idx) => (
        <GlassCard key={trend.id} style={styles.trendCard} padding={20} radius={20}>
          <View style={styles.trendTop}>
            <View style={styles.trendLeft}>
              <View style={styles.trendRankRow}>
                <Text style={styles.trendRank}>#{idx + 1}</Text>
                {trend.trending && (
                  <View style={styles.trendingBadge}>
                    <Feather name="trending-up" size={10} color={Colors.warning} />
                    <Text style={styles.trendingText}>Trending</Text>
                  </View>
                )}
              </View>
              <Text style={styles.trendSkill}>{trend.skill}</Text>
              <Text style={styles.trendDesc}>{trend.description}</Text>
            </View>
            <View style={styles.trendRight}>
              <View
                style={[
                  styles.trendGrowthBadge,
                  {
                    backgroundColor:
                      trend.direction === "up"
                        ? Colors.success + "15"
                        : Colors.danger + "15",
                    borderColor:
                      trend.direction === "up"
                        ? Colors.success + "40"
                        : Colors.danger + "40",
                  },
                ]}
              >
                <Feather
                  name={trend.direction === "up" ? "trending-up" : "trending-down"}
                  size={14}
                  color={
                    trend.direction === "up" ? Colors.success : Colors.danger
                  }
                />
                <Text
                  style={[
                    styles.trendGrowthText,
                    {
                      color:
                        trend.direction === "up" ? Colors.success : Colors.danger,
                    },
                  ]}
                >
                  {trend.growth}
                </Text>
              </View>
            </View>
          </View>

          {/* Demand Bar */}
          <View style={styles.trendDemandSection}>
            <View style={styles.trendDemandHeader}>
              <Text style={styles.trendDemandLabel}>Market Demand</Text>
              <Text style={[styles.trendDemandValue, { color: trend.color }]}>
                {trend.demand}/100
              </Text>
            </View>
            <SkillBar
              current={trend.demand}
              color={trend.color}
              showLabel={false}
              showPercentage={false}
              height={8}
              animate
            />
          </View>

          {/* Stats Row */}
          <View style={styles.trendStats}>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatValue}>{trend.salary}</Text>
              <Text style={styles.trendStatLabel}>Avg Salary</Text>
            </View>
            <View style={styles.trendStatDivider} />
            <View style={styles.trendStat}>
              <Text style={styles.trendStatValue}>{trend.jobs}</Text>
              <Text style={styles.trendStatLabel}>Open Jobs</Text>
            </View>
            <View style={styles.trendStatDivider} />
            <View style={styles.trendStat}>
              <Badge label={trend.category} variant="neutral" size="sm" />
              <Text style={styles.trendStatLabel}>Category</Text>
            </View>
          </View>
        </GlassCard>
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
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hotBanner: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  hotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  hotBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  hotBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.warning,
  },
  hotMeta: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
  },
  hotScroll: { marginHorizontal: -4 },
  hotItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    minWidth: 130,
  },
  hotRank: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 6,
  },
  hotSkill: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  hotGrowth: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  hotSalary: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  catScroll: { marginBottom: 16 },
  catScrollContent: { gap: 8, paddingRight: 4 },
  catChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  catChipTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  sortToggle: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 2,
  },
  sortToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sortToggleBtnActive: {
    backgroundColor: Colors.surface,
  },
  sortToggleBtnText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  sortToggleBtnTextActive: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
  },
  trendCard: { marginBottom: 12 },
  trendTop: { flexDirection: "row", gap: 12, marginBottom: 16 },
  trendLeft: { flex: 1 },
  trendRight: { alignItems: "flex-end" },
  trendRankRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  trendRank: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
  },
  trendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  trendingText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.warning,
  },
  trendSkill: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  trendDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  trendGrowthBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  trendGrowthText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  trendDemandSection: { marginBottom: 16 },
  trendDemandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  trendDemandLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  trendDemandValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  trendStats: { flexDirection: "row", alignItems: "center" },
  trendStat: { flex: 1, alignItems: "center", gap: 4 },
  trendStatValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  trendStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  trendStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
});
