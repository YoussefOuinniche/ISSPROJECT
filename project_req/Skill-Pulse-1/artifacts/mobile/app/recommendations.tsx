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
import { Badge } from "@/components/ui/Badge";
import {
  useGetUserRecommendations,
  useRecomputeUserProfileAnalysis,
} from "@workspace/api-client-react";
import { getBottomContentPadding } from "@/lib/layout";

type UiRecommendation = {
  id: string;
  type: "course" | "article" | "book" | "video";
  title: string;
  provider: string;
  duration: string;
  rating: number;
  reviews: number;
  matchScore: number;
  reason: string;
  tags: string[];
  gradient: [string, string];
  isFree: boolean;
  price: string | null;
};

const TYPE_ICONS: Record<string, string> = {
  course: "play-circle",
  article: "file-text",
  book: "book-open",
  video: "video",
};

const TYPE_LABELS: Record<string, string> = {
  course: "Course",
  article: "Article",
  book: "Book",
  video: "Video",
};

const TYPE_GRADIENTS: Record<UiRecommendation["type"], [string, string]> = {
  course: ["#7C3AED", "#EC4899"],
  article: ["#00D4FF", "#0EA5E9"],
  book: ["#EC4899", "#8B5CF6"],
  video: ["#10B981", "#059669"],
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
}

function normalizeType(value: unknown): UiRecommendation["type"] {
  const type = asString(value, "course").toLowerCase();
  if (type === "article" || type === "book" || type === "video") return type;
  return "course";
}

function normalizeRecommendation(item: Record<string, unknown>, index: number): UiRecommendation {
  const type = normalizeType(item.type);

  return {
    id: asString(item.id, `api-rec-${index}`),
    type,
    title: asString(item.title, "Untitled recommendation"),
    provider:
      asString(item.provider) ||
      asString(item.skill_full_name) ||
      asString(item.trend_full_title) ||
      "SkillPulse AI",
    duration: asString(item.duration, "Self-paced"),
    rating: asNumber(item.rating, 4.6),
    reviews: asNumber(item.reviews, 500),
    matchScore: asNumber(item.matchScore, 90),
    reason: asString(item.content, "Recommended based on your profile and skill gaps"),
    tags: asTags(item.tags),
    gradient: TYPE_GRADIENTS[type],
    isFree: item.isFree === true,
    price: asString(item.price) || null,
  };
}

export default function RecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const [activeType, setActiveType] = useState("All");
  const types = ["All", "Courses", "Articles", "Books"];

  const queryType =
    activeType === "Courses"
      ? "course"
      : activeType === "Articles"
      ? "article"
      : activeType === "Books"
      ? "book"
      : undefined;

  const {
    data: apiResponse,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useGetUserRecommendations({ type: queryType, limit: 50 });

  const recomputeAnalysis = useRecomputeUserProfileAnalysis();

  const apiRecommendations = Array.isArray(apiResponse?.data)
    ? apiResponse.data
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map(normalizeRecommendation)
    : [];

  const sourceRecommendations: UiRecommendation[] = apiRecommendations;

  const filtered =
    activeType === "All"
      ? sourceRecommendations
      : activeType === "Courses"
      ? sourceRecommendations.filter((r) => r.type === "course")
      : activeType === "Articles"
      ? sourceRecommendations.filter((r) => r.type === "article")
      : sourceRecommendations.filter((r) => r.type === "book");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop:
              Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.navTitle}>Recommendations</Text>
        </View>
        <Pressable style={styles.filterBtn} onPress={() => router.push("/ai-assistant")}>
          <Feather name="cpu" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Match Banner */}
        <LinearGradient
          colors={["#0F172A", "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.matchBanner}
        >
          <LinearGradient
            colors={["rgba(124,58,237,0.2)", "rgba(0,212,255,0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.matchBannerContent}>
            <View>
              <Text style={styles.matchBannerLabel}>AI-Matched For You</Text>
              <Text style={styles.matchBannerTitle}>
                {sourceRecommendations.length} Recommendations
              </Text>
              <Text style={styles.matchBannerSub}>
                {isLoading
                  ? "Loading your personalized recommendations..."
                  : isError
                  ? "We could not load your recommendations"
                  : isRefetching
                  ? "Refreshing your latest matches"
                  : "Based on your skill gaps and goals"}
              </Text>
            </View>
            <View style={styles.matchScore}>
              <Text style={styles.matchScoreValue}>98%</Text>
              <Text style={styles.matchScoreLabel}>match</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Type Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {types.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.filterChip,
                activeType === t && styles.filterChipActive,
              ]}
              onPress={() => setActiveType(t)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeType === t && styles.filterChipTextActive,
                ]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.recomputeRow}>
          <Pressable
            style={styles.recomputeBtn}
            onPress={async () => {
              await recomputeAnalysis.mutateAsync({ data: {} });
              await refetch();
            }}
            disabled={recomputeAnalysis.isPending}
          >
            <Feather name="refresh-cw" size={14} color={Colors.primary} />
            <Text style={styles.recomputeBtnText}>
              {recomputeAnalysis.isPending ? "Refreshing..." : "Refresh Recommendations"}
            </Text>
          </Pressable>
        </View>

        {!isLoading && filtered.length === 0 ? (
          <GlassCard style={styles.emptyCard} padding={20} radius={16}>
            <Text style={styles.emptyTitle}>No recommendations yet</Text>
            <Text style={styles.emptyCopy}>
              Complete your profile details to receive personalized learning suggestions.
            </Text>
          </GlassCard>
        ) : null}

        {/* Recommendation Cards */}
        {filtered.map((rec, idx) => (
          <GlassCard key={rec.id} style={styles.recCard} padding={0} radius={20}>
            {/* Gradient Header */}
            <LinearGradient
              colors={rec.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recHeader}
            >
              <View style={styles.recHeaderTop}>
                <View style={styles.recTypeChip}>
                  <Feather name={TYPE_ICONS[rec.type] as any} size={12} color="#fff" />
                  <Text style={styles.recTypeText}>{TYPE_LABELS[rec.type]}</Text>
                </View>
                <View style={styles.recMatchBadge}>
                  <Text style={styles.recMatchText}>{rec.matchScore}% match</Text>
                </View>
              </View>

              <View style={styles.recRank}>
                <Text style={styles.recRankNum}>#{idx + 1}</Text>
              </View>
            </LinearGradient>

            <View style={styles.recBody}>
              {/* Title & Provider */}
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recProvider}>{rec.provider}</Text>

              {/* Reason */}
              <View style={styles.reasonRow}>
                <Feather name="zap" size={13} color={rec.gradient[0]} />
                <Text style={[styles.reasonText, { color: rec.gradient[0] }]}>
                  {rec.reason}
                </Text>
              </View>

              {/* Tags */}
              <View style={styles.tagsRow}>
                {rec.tags.map((tag) => (
                  <Badge key={tag} label={tag} variant="neutral" size="sm" />
                ))}
              </View>

              {/* Meta Row */}
              <View style={styles.recMeta}>
                <View style={styles.recMetaItem}>
                  <Feather name="clock" size={13} color={Colors.textTertiary} />
                  <Text style={styles.recMetaText}>{rec.duration}</Text>
                </View>
                <View style={styles.recMetaItem}>
                  <Feather name="star" size={13} color={Colors.warning} />
                  <Text style={styles.recMetaText}>
                    {rec.rating} ({(rec.reviews / 1000).toFixed(1)}k)
                  </Text>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.recCTA}>
                <View>
                  {rec.isFree ? (
                    <Badge label="Free" variant="success" size="md" />
                  ) : (
                    <Text style={styles.recPrice}>{rec.price}</Text>
                  )}
                </View>
                <Pressable
                  style={[
                    styles.recBtn,
                    {
                      backgroundColor: rec.gradient[0] + "15",
                      borderColor: rec.gradient[0] + "40",
                    },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/learn/[id]",
                      params: { id: rec.id },
                    })
                  }
                >
                  <Text style={[styles.recBtnText, { color: rec.gradient[0] }]}>
                    {rec.isFree ? "Read Now" : "Enroll"}
                  </Text>
                  <Feather name="arrow-right" size={14} color={rec.gradient[0]} />
                </Pressable>
              </View>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  recomputeRow: {
    marginBottom: 14,
  },
  recomputeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
    backgroundColor: Colors.primary + "12",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recomputeBtnText: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  emptyCard: {
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptyCopy: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  matchBanner: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
  matchBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  matchBannerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  matchBannerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 4,
  },
  matchBannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
  },
  matchScore: {
    alignItems: "center",
    backgroundColor: Colors.success + "20",
    borderRadius: 16,
    padding: 14,
  },
  matchScoreValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.success,
  },
  matchScoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.success,
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
  recCard: { marginBottom: 16, overflow: "hidden" },
  recHeader: { padding: 16, minHeight: 80, justifyContent: "space-between" },
  recHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recTypeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  recMatchBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recMatchText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  recRank: {
    alignSelf: "flex-start",
    marginTop: 8,
  },
  recRankNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.4)",
  },
  recBody: { padding: 18 },
  recTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 4,
    lineHeight: 24,
  },
  recProvider: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  recMeta: { flexDirection: "row", gap: 16, marginBottom: 16 },
  recMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  recMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  recCTA: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recPrice: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  recBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  recBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
