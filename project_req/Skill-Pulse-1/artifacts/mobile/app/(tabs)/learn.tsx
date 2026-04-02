import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import { GlassCard } from "@/components/ui/GradientCard";
import { SkillBar } from "@/components/ui/SkillBar";
import { Badge } from "@/components/ui/Badge";
import { useGetUserRecommendations } from "@workspace/api-client-react";
import { getBottomContentPadding } from "@/lib/layout";

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={10}
          color={s <= Math.round(rating) ? Colors.warning : Colors.border}
        />
      ))}
    </View>
  );
}

const DIFFICULTY_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  Beginner: "success",
  Intermediate: "warning",
  Advanced: "danger",
};

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("All");
  const filters = ["All", "In Progress", "Not Started", "Completed"];

  const { data: recommendationsResponse, refetch } = useGetUserRecommendations({ limit: 50 });

  const learningPaths = (Array.isArray(recommendationsResponse?.data) ? recommendationsResponse.data : [])
    .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
    .map((item, idx) => {
      const title = String(item.title ?? `Learning path ${idx + 1}`);
      const score = typeof item.matchScore === "number" ? item.matchScore : 60;
      const progress = Math.max(0, Math.min(100, Math.round(score - 40)));
      return {
        id: String(item.id ?? `path-${idx}`),
        title,
        description: String(item.content ?? "Personalized learning sequence generated from your profile."),
        gradient: idx % 2 === 0 ? (["#0EA5E9", "#2563EB"] as [string, string]) : (["#7C3AED", "#EC4899"] as [string, string]),
        duration: String(item.duration ?? "4-6 weeks"),
        enrolled: 1200 + idx * 137,
        rating: 4.5,
        progress,
        color: idx % 2 === 0 ? Colors.primary : Colors.accent,
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 3).map(String) : [String(item.type ?? "course")],
        difficulty: progress >= 70 ? "Advanced" : progress >= 35 ? "Intermediate" : "Beginner",
        skills: Array.isArray(item.tags) ? item.tags.map(String) : ["Skill Growth", "Practice"],
        completedModules: Math.floor(progress / 20),
        modules: 5,
        instructor: String(item.provider ?? "SkillPulse AI"),
      };
    });

  const filteredPaths =
    activeFilter === "All"
      ? learningPaths
      : activeFilter === "In Progress"
      ? learningPaths.filter((p) => p.progress > 0 && p.progress < 100)
      : activeFilter === "Not Started"
      ? learningPaths.filter((p) => p.progress === 0)
      : learningPaths.filter((p) => p.progress === 100);

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
          <Text style={styles.screenTitle}>Learning Paths</Text>
          <Text style={styles.screenSub}>Personalized for your goals</Text>
        </View>
        <Pressable style={styles.searchBtn} onPress={() => refetch()}>
          <Feather name="search" size={20} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Featured Path */}
      {learningPaths[0] && (
        <Pressable
          onPress={() =>
            router.push({ pathname: "/learn/[id]", params: { id: learningPaths[0].id } })
          }
        >
          <LinearGradient
            colors={learningPaths[0].gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            <View style={styles.featuredBadge}>
              <Feather name="zap" size={12} color={Colors.warning} />
              <Text style={styles.featuredBadgeText}>Recommended For You</Text>
            </View>
            <Text style={styles.featuredTitle}>{learningPaths[0].title}</Text>
            <Text style={styles.featuredDesc}>{learningPaths[0].description}</Text>
            <View style={styles.featuredMeta}>
              <View style={styles.featuredMetaItem}>
                <Feather name="clock" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.featuredMetaText}>{learningPaths[0].duration}</Text>
              </View>
              <View style={styles.featuredMetaItem}>
                <Feather name="users" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.featuredMetaText}>
                  {(learningPaths[0].enrolled / 1000).toFixed(1)}k enrolled
                </Text>
              </View>
              <View style={styles.featuredMetaItem}>
                <StarRating rating={learningPaths[0].rating} />
                <Text style={styles.featuredMetaText}>{learningPaths[0].rating}</Text>
              </View>
            </View>
            {learningPaths[0].progress > 0 && (
              <View style={styles.featuredProgress}>
                <View style={styles.featuredProgressTrack}>
                  <View
                    style={[
                      styles.featuredProgressFill,
                      { width: `${learningPaths[0].progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.featuredProgressText}>
                  {learningPaths[0].progress}% complete
                </Text>
              </View>
            )}
            <View style={styles.featuredStartBtn}>
              <Text style={styles.featuredStartText}>
                {learningPaths[0].progress > 0 ? "Continue" : "Start Learning"}
              </Text>
              <Feather name="arrow-right" size={16} color={learningPaths[0].color} />
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filters.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              activeFilter === f && styles.filterChipActive,
            ]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f && styles.filterChipTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Path Cards */}
      {filteredPaths.map((path) => (
        <Pressable
          key={path.id}
          onPress={() =>
            router.push({ pathname: "/learn/[id]", params: { id: path.id } })
          }
        >
          <GlassCard style={styles.pathCard} padding={0} radius={20}>
            {/* Color Strip */}
            <LinearGradient
              colors={path.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pathStrip}
            />

            <View style={styles.pathContent}>
              {/* Tags row */}
              <View style={styles.pathTags}>
                {path.tags.map((tag) => (
                  <Badge key={tag} label={tag} variant="neutral" size="sm" />
                ))}
                <Badge
                  label={path.difficulty}
                  variant={DIFFICULTY_VARIANT[path.difficulty]}
                  size="sm"
                />
              </View>

              {/* Title */}
              <Text style={styles.pathTitle}>{path.title}</Text>
              <Text style={styles.pathDesc}>{path.description}</Text>

              {/* Skills */}
              <View style={styles.skillsRow}>
                {path.skills.slice(0, 3).map((s) => (
                  <View key={s} style={styles.skillChip}>
                    <Text style={styles.skillChipText}>{s}</Text>
                  </View>
                ))}
                {path.skills.length > 3 && (
                  <Text style={styles.skillsMore}>+{path.skills.length - 3}</Text>
                )}
              </View>

              {/* Meta */}
              <View style={styles.pathMeta}>
                <View style={styles.pathMetaItem}>
                  <Feather name="clock" size={13} color={Colors.textTertiary} />
                  <Text style={styles.pathMetaText}>{path.duration}</Text>
                </View>
                <View style={styles.pathMetaItem}>
                  <Feather name="book" size={13} color={Colors.textTertiary} />
                  <Text style={styles.pathMetaText}>
                    {path.completedModules}/{path.modules} modules
                  </Text>
                </View>
                <View style={styles.pathMetaItem}>
                  <StarRating rating={path.rating} />
                  <Text style={styles.pathMetaText}>{path.rating}</Text>
                </View>
              </View>

              {/* Progress */}
              {path.progress > 0 && (
                <View style={styles.pathProgressSection}>
                  <SkillBar
                    current={path.progress}
                    color={path.color}
                    showLabel={false}
                    height={6}
                  />
                  <Text style={[styles.pathProgressText, { color: path.color }]}>
                    {path.progress}% complete
                  </Text>
                </View>
              )}

              {/* CTA */}
              <View style={styles.pathCTA}>
                <View style={styles.instructorRow}>
                  <View style={[styles.instructorAvatar, { backgroundColor: path.color + "20" }]}>
                    <Feather name="user" size={14} color={path.color} />
                  </View>
                  <Text style={styles.instructorName}>{path.instructor}</Text>
                </View>
                <View style={[styles.pathBtn, { backgroundColor: path.color + "15", borderColor: path.color + "40" }]}>
                  <Text style={[styles.pathBtnText, { color: path.color }]}>
                    {path.progress > 0 ? "Continue" : "Start"}
                  </Text>
                  <Feather name="arrow-right" size={14} color={path.color} />
                </View>
              </View>
            </View>
          </GlassCard>
        </Pressable>
      ))}

      <Pressable style={styles.searchBtn} onPress={() => refetch()}>
        <Feather name="refresh-cw" size={16} color={Colors.textSecondary} />
      </Pressable>
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
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featuredCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 12,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  featuredTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 6,
  },
  featuredDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
    lineHeight: 20,
  },
  featuredMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  featuredMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  featuredProgress: {
    marginBottom: 16,
  },
  featuredProgressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  featuredProgressFill: {
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 4,
  },
  featuredProgressText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  featuredStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  featuredStartText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  filterScroll: { marginBottom: 16 },
  filterScrollContent: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  pathCard: {
    marginBottom: 14,
    overflow: "hidden",
  },
  pathStrip: {
    height: 4,
  },
  pathContent: {
    padding: 18,
  },
  pathTags: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  pathTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  pathDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  skillsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  skillChip: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skillChipText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  skillsMore: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    alignSelf: "center",
  },
  pathMeta: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  pathMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pathMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  pathProgressSection: {
    marginBottom: 12,
    gap: 6,
  },
  pathProgressText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  pathCTA: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  instructorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  instructorName: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  pathBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pathBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
