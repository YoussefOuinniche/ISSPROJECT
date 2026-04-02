import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
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
import { GlassCard, GradientCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { useGetUserDashboard, useGetUserSkillGaps } from "@workspace/api-client-react";
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

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<FilterTab>("gaps");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const { data: dashboardResponse, refetch: refetchDashboard } = useGetUserDashboard();
  const { data: gapsResponse, refetch: refetchGaps } = useGetUserSkillGaps();

  const dashboardData =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};

  const dashboardSkills = Array.isArray(dashboardData.skills) ? dashboardData.skills : [];
  const apiGaps = Array.isArray(gapsResponse?.data) ? gapsResponse.data : [];

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

  const mappedGaps = apiGaps
    .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
    .map((gap, idx) => {
      const gapLevel = typeof gap.gap_level === "number" ? gap.gap_level : 3;
      const priority = gapLevel >= 4 ? "high" : gapLevel >= 3 ? "medium" : "low";
      const color = priority === "high" ? Colors.danger : priority === "medium" ? Colors.warning : Colors.success;
      const currentLevel = Math.max(0, Math.min(100, 100 - gapLevel * 20));
      return {
        id: String(gap.id ?? `gap-${idx}`),
        name: String(gap.skill_full_name ?? gap.skill_name ?? `Gap ${idx + 1}`),
        priority,
        gradient: priority === "high" ? (["#EF4444", "#F97316"] as [string, string]) : priority === "medium" ? (["#F59E0B", "#F97316"] as [string, string]) : (["#10B981", "#06B6D4"] as [string, string]),
        icon: priority === "high" ? "alert-triangle" : "target",
        marketDemand: Math.max(55, 100 - gapLevel * 8),
        currentLevel,
        targetLevel: 100,
        color,
        timeToClose: `${Math.max(2, gapLevel * 2)} weeks`,
        relatedRoles: [String(gap.domain ?? "General")],
      };
    });

  const onRefresh = async () => {
    await Promise.all([refetchDashboard(), refetchGaps()]);
  };

  const filteredGaps =
    priorityFilter === "all"
      ? mappedGaps
      : mappedGaps.filter((g) => g.priority === priorityFilter);

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
          <Text style={styles.screenTitle}>Skill Analysis</Text>
          <Text style={styles.screenSub}>Identify and close your gaps</Text>
        </View>
        <Pressable style={styles.filterBtn} onPress={onRefresh}>
          <Feather name="sliders" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Gap Summary Card */}
      <LinearGradient
        colors={["#0F172A", "#1E293B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <LinearGradient
          colors={["rgba(124,58,237,0.2)", "rgba(0,212,255,0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.summaryTitle}>Gap Overview</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.danger }]}>
              {mappedGaps.filter((g) => g.priority === "high").length}
            </Text>
            <Text style={styles.summaryLabel}>Critical</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {mappedGaps.filter((g) => g.priority === "medium").length}
            </Text>
            <Text style={styles.summaryLabel}>Moderate</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {mappedGaps.filter((g) => g.priority === "low").length}
            </Text>
            <Text style={styles.summaryLabel}>Minor</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {currentSkills.length}
            </Text>
            <Text style={styles.summaryLabel}>Strengths</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Switcher */}
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

      {activeTab === "gaps" ? (
        <>
          {/* Priority Filter */}
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

          {/* Gap Cards */}
          {filteredGaps.map((gap) => (
            <GlassCard key={gap.id} style={styles.gapCard} padding={20} radius={20}>
              {/* Header */}
              <View style={styles.gapHeader}>
                <LinearGradient
                  colors={gap.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gapIcon}
                >
                  <Feather name={gap.icon as any} size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.gapMeta}>
                  <Text style={styles.gapName}>{gap.name}</Text>
                  <View style={styles.gapTags}>
                    <Badge
                      label={gap.priority.toUpperCase()}
                      variant={PRIORITY_VARIANT[gap.priority]}
                      size="sm"
                    />
                    <Badge label={`${gap.marketDemand}% demand`} variant="primary" size="sm" />
                  </View>
                </View>
              </View>

              {/* Skill Bar */}
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
                  <Text style={styles.gapBarValue}>{gap.currentLevel}%</Text>
                  <Text style={[styles.gapBarValue, { color: gap.color }]}>
                    {gap.targetLevel}%
                  </Text>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.gapFooter}>
                <View style={styles.gapFooterItem}>
                  <Feather name="clock" size={13} color={Colors.textTertiary} />
                  <Text style={styles.gapFooterText}>{gap.timeToClose}</Text>
                </View>
                <View style={styles.gapFooterItem}>
                  <Feather name="briefcase" size={13} color={Colors.textTertiary} />
                  <Text style={styles.gapFooterText} numberOfLines={1}>
                    {gap.relatedRoles.slice(0, 2).join(", ")}
                  </Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.subheading}>Your Skill Strengths</Text>
          {currentSkills.map((skill) => (
            <GlassCard key={skill.id} style={styles.skillCard} padding={18} radius={16}>
              <View style={styles.skillHeader}>
                <View style={styles.skillInfo}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Badge label={skill.category} variant="neutral" size="sm" />
                </View>
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
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
  },
  skillCard: { marginBottom: 10 },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  skillInfo: { flex: 1, gap: 6 },
  skillName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  skillLevel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
