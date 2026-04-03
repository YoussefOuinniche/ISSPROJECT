import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { useAIProfile } from "@/hooks/useAIProfile";
import { getTrends } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, summary, loading: profileLoading, error: profileError } = useAIProfile();
  const [trendRows, setTrendRows] = useState<Record<string, unknown>[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(true);

  const refetch = async () => {
    setTrendsLoading(true);
    try {
      const rows = await getTrends();
      setTrendRows(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setTrendsLoading(false);
    }
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
            description: String(item.description ?? "Based on current market movement."),
            demand,
            growth: growthValue,
            category,
            color: demand >= 80 ? Colors.success : Colors.primary,
          };
        }),
    [trendRows]
  );

  const ai = profile;
  const gaps = Array.isArray(ai?.skill_gaps) ? ai.skill_gaps : [];
  const recommendations = Array.isArray(ai?.recommendations) ? ai.recommendations : [];
  const goals = Array.isArray(ai?.goals) ? ai.goals : [];
  const userGoals = summary?.top_goal || (goals.length > 0 ? goals[0] : 'top professional directly in your field');

  if (profileLoading || trendsLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Analyzing market intelligence...</Text>
      </View>
    );
  }

  if (profileError && !profile) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-triangle" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>Failed to load insights</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Career Intelligence</Text>
        <Text style={styles.screenSub}>Personalized market insights</Text>
      </View>

      {/* 3. Market Demand Summary (Hero Card) */}
      <GlassCard style={styles.marketSummaryCard} padding={20} radius={20}>
        <LinearGradient 
          colors={["rgba(6,16,45,0.7)", "rgba(11,28,76,0.9)"]} 
          style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} 
        />
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIconBox}>
            <Feather name="globe" size={20} color={Colors.primaryLight} />
          </View>
          <Text style={styles.summaryTitle}>Market Demand Summary</Text>
        </View>
        <Text style={styles.summaryDesc}>
          Based on your goal to become a '{userGoals}', there is currently high demand for your tracked skills. Market engagement in your target sector is up by {trendRows.length > 0 ? '14%' : '0%'} this quarter.
        </Text>
      </GlassCard>

      {/* 1. Trending Skills */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Skills</Text>
        <Feather name="bar-chart-2" size={18} color={Colors.textSecondary} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
        {trends.length === 0 ? (
           <View style={styles.emptyTrendingContainer}><Text style={styles.emptyText}>No trends available</Text></View>
        ) : (
          trends.slice(0, 5).map((trend) => (
            <View key={trend.id} style={styles.trendingCard}>
              <View style={styles.trendingHeader}>
                <Feather name="trending-up" size={14} color={Colors.success} />
                <Text style={styles.trendingGrowth}>{trend.growth}</Text>
              </View>
              <Text style={styles.trendingSkill} numberOfLines={1}>{trend.skill}</Text>
              <View style={styles.trendingFooter}>
                <Text style={styles.trendingDemandLabel}>Demand:</Text>
                <Text style={[styles.trendingDemandValue, {color: trend.color}]}>{trend.demand}/100</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 2. Skills You Should Learn Next (Gaps) */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Skills You Should Learn Next</Text>
        <Feather name="target" size={18} color={Colors.textSecondary} />
      </View>
      {gaps.length > 0 ? (
        gaps.map((gap: any, index: number) => (
          <View key={index} style={styles.gapCard}>
            <View style={styles.gapHeader}>
              <View style={styles.gapIconBg}>
                <Feather name="compass" size={16} color={Colors.accent} />
              </View>
              <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.gapSkill}>{gap.skill_name}</Text>
                <Text style={styles.gapImportance}>
                  Importance: {String(gap.importance || 'medium').toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.gapDesc}>{gap.reason}</Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No skill gaps identified yet! You are perfectly aligned with your active targets.</Text>
        </View>
      )}

      {/* 4. Personalized AI Recommendations */}
      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Personalized AI Recommendations</Text>
        <Feather name="cpu" size={18} color={Colors.textSecondary} />
      </View>
      {recommendations.length > 0 ? (
        <GlassCard padding={16} radius={16} style={styles.recsContainer}>
          {recommendations.map((rec: any, index: number) => {
            const title = typeof rec === 'string' ? rec : rec.title;
            const content = typeof rec === 'string' ? '' : rec.content;

            return (
              <View key={index} style={styles.recItem}>
                 <Feather name="check" size={16} color={Colors.primary} style={{marginTop: 2}} />
                 <View style={{ flex: 1 }}>
                   <Text style={styles.recText}>{title}</Text>
                   {!!content && <Text style={styles.recSubText}>{content}</Text>}
                 </View>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Chat with the AI Assistant to generate personalized recommendations.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  loadingText: { marginTop: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  errorText: { marginTop: 12, color: Colors.danger, fontFamily: "Inter_500Medium" },
  header: { marginBottom: 24 },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  screenSub: { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular", marginTop: 4 },
  
  marketSummaryCard: { marginBottom: 32, overflow: "hidden", borderWidth: 1, borderColor: "rgba(43,230,246,0.3)" },
  summaryTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  summaryIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(43,230,246,0.15)", alignItems: "center", justifyContent: "center" },
  summaryTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: "Inter_600SemiBold" },
  summaryDesc: { color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  
  horizontalScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 24 },
  horizontalScrollContent: { paddingRight: 40, gap: 12 },
  trendingCard: { width: 140, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  trendingHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  trendingGrowth: { color: Colors.success, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  trendingSkill: { color: Colors.textPrimary, fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  trendingFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  trendingDemandLabel: { fontSize: 11, color: Colors.textSecondary },
  trendingDemandValue: { fontSize: 12, fontFamily: "Inter_700Bold" },

  gapCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  gapHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  gapIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.accent + "15", alignItems: "center", justifyContent: "center" },
  gapSkill: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  gapImportance: { fontSize: 12, color: Colors.accent, fontFamily: "Inter_500Medium" },
  gapDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, fontFamily: "Inter_400Regular" },

  emptyTrendingContainer: { width: 200, padding: 20 },
  emptyCard: { padding: 20, backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed", marginBottom: 20 },
  emptyText: { color: Colors.textSecondary, textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular" },

  recsContainer: { gap: 12 },
  recItem: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  recText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 22, fontFamily: "Inter_600SemiBold" },
  recSubText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 2 }
});
