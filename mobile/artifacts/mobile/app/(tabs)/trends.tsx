import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlassCard } from "@/components/ui/GradientCard";
import { Badge } from "@/components/ui/Badge";
import { useAIProfile } from "@/hooks/useAIProfile";
import {
  getPersonalizedMarketInsights,
  getRoleMarketTrends,
  type PersonalizedMarketInsights,
  type RoleMarketTrendsResponse,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

function trackTrendsEvent(event: string, payload: Record<string, unknown> = {}) {
  // TODO(analytics): Replace console markers with production analytics SDK events.
  console.info("[Telemetry][Trends]", event, payload);
}

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, summary, loading: profileLoading, error: profileError } = useAIProfile();
  const [trendRows, setTrendRows] = useState<Record<string, unknown>[]>([]);
  const [marketMeta, setMarketMeta] = useState<RoleMarketTrendsResponse | null>(null);
  const [personalizedInsights, setPersonalizedInsights] = useState<PersonalizedMarketInsights | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);

  const effectiveTargetRole =
    summary?.target_role ||
    profile?.target_role ||
    profile?.skill_gap_analysis?.target_role ||
    null;

  const refetch = async () => {
    setTrendsLoading(true);
    trackTrendsEvent("refresh_started", {
      role: effectiveTargetRole || null,
    });
    try {
      const data = await getRoleMarketTrends({
        role: effectiveTargetRole,
        limit: 100,
        refreshIfStale: true,
      });
      setTrendRows(Array.isArray(data?.trends) ? data.trends : []);
      setMarketMeta(data);

      const personalized = await getPersonalizedMarketInsights({
        role: effectiveTargetRole,
        limit: 80,
        refreshIfStale: true,
      });
      setPersonalizedInsights(personalized);

      trackTrendsEvent("refresh_completed", {
        role: data?.role || effectiveTargetRole || null,
        trendsFound: Array.isArray(data?.trends) ? data.trends.length : 0,
        missingSkillsCount: Array.isArray(personalized?.missing_skill_names)
          ? personalized.missing_skill_names.length
          : 0,
        stale: Boolean(data?.stale),
      });
    } catch (e) {
      trackTrendsEvent("refresh_failed", {
        role: effectiveTargetRole || null,
        message: e instanceof Error ? e.message : "Unknown error",
      });
      console.error(e);
    } finally {
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    refetch().catch(() => undefined);
  }, [effectiveTargetRole]);

  const trends = useMemo(
    () =>
      trendRows
        .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
        .map((item, idx) => {
          const baseFrequency = Number(item.frequency ?? 0);
          const demand = Math.max(40, Math.min(99, 45 + baseFrequency * 4));
          const growthValue = `+${Math.max(6, Math.round(demand / 7))}%`;
          const category = String(item.category ?? item.domain ?? "General");
          return {
            id: String(item.id ?? `trend-${idx}`),
            skill: String(item.skill ?? item.title ?? `Trend ${idx + 1}`),
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
  const personalizedMarketSummary =
    typeof personalizedInsights?.market_summary === 'string' && personalizedInsights.market_summary.trim().length > 0
      ? personalizedInsights.market_summary
      : typeof summary?.market_summary === 'string' && summary.market_summary.trim().length > 0
      ? summary.market_summary
      : null;
  const personalizedNextStep =
    typeof personalizedInsights?.recommended_next_step === 'string' && personalizedInsights.recommended_next_step.trim().length > 0
      ? personalizedInsights.recommended_next_step
      : typeof summary?.recommended_next_step === 'string' && summary.recommended_next_step.trim().length > 0
      ? summary.recommended_next_step
      : summary?.next_step || null;
  const personalizedHighPrioritySkills = Array.isArray(personalizedInsights?.high_priority_skill_names)
    ? personalizedInsights.high_priority_skill_names.slice(0, 4)
    : Array.isArray(summary?.high_priority_skills)
    ? summary.high_priority_skills.slice(0, 4)
    : [];
  const personalizedMissingSkills = Array.isArray(personalizedInsights?.missing_skill_names)
    ? personalizedInsights.missing_skill_names.slice(0, 4)
    : Array.isArray(summary?.missing_market_skills)
    ? summary.missing_market_skills.slice(0, 4)
    : Array.isArray(summary?.missing_skills)
    ? summary.missing_skills.slice(0, 4)
    : [];
  const marketUpdatedAtText = marketMeta?.latest_updated_at
    ? new Date(marketMeta.latest_updated_at).toLocaleString()
    : 'no cached snapshot yet';
  const summaryFallbackText = !effectiveTargetRole
    ? "Set your target role to receive role-specific market guidance."
    : `Market signals for ${marketMeta?.role || effectiveTargetRole || 'your role'} show ${trendRows.length > 0 ? 'active hiring momentum' : 'limited current activity'}.`;

  useEffect(() => {
    if (!trendsLoading) {
      trackTrendsEvent("screen_viewed", {
        role: effectiveTargetRole || null,
        trendCount: trends.length,
        hasSummary: Boolean(personalizedMarketSummary),
      });
    }
  }, [effectiveTargetRole, personalizedMarketSummary, trends.length, trendsLoading]);

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
      <AnimatedSection delay={20} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image 
            source={require("@/assets/images/logo-nexapath.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.screenTitle}>Career Intelligence</Text>
            <Text style={styles.screenSub}>Role-based market insights</Text>
          </View>
        </View>
      </AnimatedSection>

      {/* 3. Market Demand Summary (Hero Card) */}
      <AnimatedSection delay={70}>
      <GlassCard style={styles.marketSummaryCard} padding={20} radius={20}>
        <View style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} 
        />
        <View style={styles.summaryTopRow}>
          <View style={styles.summaryIconBox}>
            <Feather name="globe" size={20} color={Colors.primaryLight} />
          </View>
          <Text style={styles.summaryTitle}>Market Summary</Text>
        </View>
        <Text style={styles.summaryDesc}>
          {personalizedMarketSummary || summaryFallbackText}
        </Text>
        {personalizedHighPrioritySkills.length > 0 ? (
          <View style={styles.summaryBadgesRow}>
            {personalizedHighPrioritySkills.map((skill) => (
              <Badge key={`priority-${skill}`} label={skill} variant="accent" size="sm" />
            ))}
          </View>
        ) : null}
        {personalizedMissingSkills.length > 0 ? (
          <View style={styles.summaryBadgesRow}>
            {personalizedMissingSkills.map((skill) => (
              <Badge key={`missing-${skill}`} label={skill} variant="warning" size="sm" />
            ))}
          </View>
        ) : null}
        {/* TODO(analytics): Track taps on summary skill badges if badges become interactive. */}
        {personalizedNextStep ? (
          <Text style={styles.summaryAction}>Recommended next step: {personalizedNextStep}</Text>
        ) : null}
        <Text style={styles.summaryMeta}>
          Snapshot: {marketUpdatedAtText}
          {marketMeta?.stale ? ' (stale, refreshing in background)' : ''}
        </Text>
      </GlassCard>
      </AnimatedSection>

      {/* 1. Trending Skills */}
      <AnimatedSection delay={120} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Skills</Text>
        <Feather name="bar-chart-2" size={18} color={Colors.textSecondary} />
      </AnimatedSection>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={styles.horizontalScrollContent}>
        {trends.length === 0 ? (
          <View style={styles.emptyTrendingContainer}><Text style={styles.emptyText}>No trend data available yet.</Text></View>
        ) : (
          trends.slice(0, 5).map((trend, index) => (
            <AnimatedSection key={trend.id} delay={150 + index * 35}>
            <View style={styles.trendingCard}>
              <View style={styles.trendingHeader}>
                <Feather name="trending-up" size={14} color={Colors.success} />
                <AnimatedCounter value={Number(String(trend.growth).replace(/[^\d]/g, ""))} prefix="+" suffix="%" style={styles.trendingGrowth} />
              </View>
              <Text style={styles.trendingSkill} numberOfLines={1}>{trend.skill}</Text>
              <View style={styles.trendingFooter}>
                <Text style={styles.trendingDemandLabel}>Demand:</Text>
                <AnimatedCounter value={trend.demand} suffix="/100" style={[styles.trendingDemandValue, {color: trend.color}]} />
              </View>
            </View>
            </AnimatedSection>
          ))
        )}
      </ScrollView>

      {/* 2. Skills You Should Learn Next (Gaps) */}
      <AnimatedSection delay={210} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Skills You Should Learn Next</Text>
        <Feather name="target" size={18} color={Colors.textSecondary} />
      </AnimatedSection>
      {gaps.length > 0 ? (
        gaps.map((gap: any, index: number) => (
          <AnimatedSection key={index} delay={240 + index * 35}>
          <View style={styles.gapCard}>
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
          </AnimatedSection>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No skill gaps are available yet. Complete your profile or refresh analysis for deeper guidance.</Text>
        </View>
      )}

      {/* 4. Personalized AI Recommendations */}
      <AnimatedSection delay={320} style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Text style={styles.sectionTitle}>Personalized AI Recommendations</Text>
        <Feather name="cpu" size={18} color={Colors.textSecondary} />
      </AnimatedSection>
      {recommendations.length > 0 ? (
        <AnimatedSection delay={360}>
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
        </AnimatedSection>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Use AI Assistant to generate personalized recommendations.</Text>
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
  summaryDesc: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  summaryBadgesRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryAction: { marginTop: 10, color: Colors.textPrimary, fontSize: 13, lineHeight: 20, fontFamily: "Inter_500Medium" },
  summaryMeta: { marginTop: 8, color: Colors.textTertiary, fontSize: 12, fontFamily: "Inter_400Regular" },

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
