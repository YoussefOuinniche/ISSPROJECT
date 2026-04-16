import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedSection } from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  getGlobalMarketTrends,
  getPersonalizedMarketInsights,
  getRoleMarketTrends,
  refreshRoleMarketTrends,
  type PersonalizedMarketInsights,
  type RoleMarketTrendsResponse,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

const FALLBACK_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "DevOps Engineer",
  "Cloud Engineer",
  "UI UX Designer",
  "Cybersecurity Analyst",
  "Product Manager",
];

type TrendNewsItem = {
  id: string;
  skill: string;
  headline: string;
  summary: string;
  category: string;
  growthPercent: number;
  demandScore: number;
  sourceCount: number;
  updatedAt: string | null;
  tone: string;
};

function trackTrendsEvent(event: string, payload: Record<string, unknown> = {}) {
  // TODO(analytics): Replace console markers with production analytics SDK events.
  console.info("[Telemetry][Trends]", event, payload);
}

function formatSnapshotTime(value: string | null | undefined) {
  if (!value) return "No snapshot yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No snapshot yet";
  return date.toLocaleString();
}

async function openTrendOnWeb(skill: string, role: string) {
  const query = `${skill} ${role} hiring trend`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error("Failed to open trend web link", error);
  }
}

function normalizeRoleList(items: string[]) {
  const unique = Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  return unique.sort((a, b) => a.localeCompare(b));
}

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [trendRows, setTrendRows] = useState<Record<string, unknown>[]>([]);
  const [marketMeta, setMarketMeta] = useState<RoleMarketTrendsResponse | null>(null);
  const [personalizedInsights, setPersonalizedInsights] = useState<PersonalizedMarketInsights | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const topPadding = Platform.OS === "web" ? insets.top + 54 : insets.top + 10;
  const horizontalPadding = width >= 1200 ? 34 : width >= 980 ? 28 : 20;
  const isWide = width >= 960;

  const loadAvailableRoles = async () => {
    setRolesLoading(true);

    try {
      const global = await getGlobalMarketTrends({ limit: 500 });
      const rows = Array.isArray(global?.trends) ? global.trends : [];
      const discoveredRoles = rows
        .map((row) => String((row as { role?: string | null }).role || "").trim())
        .filter(Boolean);

      const combined = normalizeRoleList([...discoveredRoles, ...FALLBACK_ROLES]);
      setAvailableRoles(combined);
    } catch (error) {
      console.error("Failed to load global roles", error);
      setAvailableRoles(normalizeRoleList(FALLBACK_ROLES));
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableRoles().catch(() => undefined);
  }, []);

  const fetchForRole = async (role: string) => {
    const cleanRole = String(role || "").trim();
    if (!cleanRole) return;

    setScreenError(null);
    setTrendsLoading(true);

    trackTrendsEvent("role_fetch_started", { role: cleanRole });

    try {
      // Trigger live refresh first so role trends reflect the latest web data.
      await refreshRoleMarketTrends({ role: cleanRole, searchLimit: 30 });

      const [roleData, personalized] = await Promise.all([
        getRoleMarketTrends({
          role: cleanRole,
          limit: 120,
          refreshIfStale: false,
        }),
        getPersonalizedMarketInsights({
          role: cleanRole,
          limit: 80,
          refreshIfStale: false,
        }),
      ]);

      setTrendRows(
        Array.isArray(roleData?.trends)
          ? (roleData.trends as unknown as Record<string, unknown>[])
          : []
      );
      setMarketMeta(roleData);
      setPersonalizedInsights(personalized);

      trackTrendsEvent("role_fetch_completed", {
        role: cleanRole,
        trendsFound: Array.isArray(roleData?.trends) ? roleData.trends.length : 0,
        stale: Boolean(roleData?.stale),
      });
    } catch (error) {
      console.error("Role trend fetch failed", error);

      // Fallback path: pull cached/stale data if direct refresh path fails.
      try {
        const [roleData, personalized] = await Promise.all([
          getRoleMarketTrends({ role: cleanRole, limit: 120, refreshIfStale: true }),
          getPersonalizedMarketInsights({ role: cleanRole, limit: 80, refreshIfStale: true }),
        ]);

        setTrendRows(
          Array.isArray(roleData?.trends)
            ? (roleData.trends as unknown as Record<string, unknown>[])
            : []
        );
        setMarketMeta(roleData);
        setPersonalizedInsights(personalized);
        setScreenError("Live refresh failed. Showing latest cached intelligence.");
      } catch (fallbackError) {
        console.error("Fallback role trend fetch failed", fallbackError);
        setTrendRows([]);
        setMarketMeta(null);
        setPersonalizedInsights(null);
        setScreenError("Unable to fetch trends for this role right now.");
      }
    } finally {
      setTrendsLoading(false);
    }
  };

  const onSelectRole = async (role: string) => {
    const cleanRole = String(role || "").trim();
    if (!cleanRole) return;

    setSelectedRole(cleanRole);
    await fetchForRole(cleanRole);
  };

  const newsItems = useMemo<TrendNewsItem[]>(() => {
    const roleLabel = selectedRole || "this role";

    return trendRows
      .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
      .map((item, idx) => {
        const frequency = Number(item.frequency ?? 0);
        const sourceCount = Math.max(1, Number(item.source_count ?? 1));
        const demandScore = Math.max(42, Math.min(99, 45 + frequency * 4));
        const growthPercent = Math.max(6, Math.round(demandScore / 7));
        const category = String(item.category ?? "General");
        const skill = String(item.skill ?? item.title ?? `Trend ${idx + 1}`);
        const updatedAt = typeof item.updated_at === "string" ? item.updated_at : null;

        return {
          id: String(item.id ?? `trend-news-${idx}`),
          skill,
          headline: `${skill} hiring momentum rises for ${roleLabel}`,
          summary: `Signals from ${sourceCount} web sources show strong relevance in ${category.toLowerCase()} and active role demand.`,
          category,
          growthPercent,
          demandScore,
          sourceCount,
          updatedAt,
          tone: demandScore >= 80 ? Colors.success : Colors.accentTertiary,
        };
      });
  }, [selectedRole, trendRows]);

  const aiSummary =
    typeof personalizedInsights?.market_summary === "string" &&
    personalizedInsights.market_summary.trim().length > 0
      ? personalizedInsights.market_summary
      : selectedRole
      ? `Live market signals for ${selectedRole} are being tracked from web trend sources.`
      : "Select a role to generate market summary.";

  const aiNextStep =
    typeof personalizedInsights?.recommended_next_step === "string" &&
    personalizedInsights.recommended_next_step.trim().length > 0
      ? personalizedInsights.recommended_next_step
      : null;

  const highPrioritySkills = Array.isArray(personalizedInsights?.high_priority_skill_names)
    ? personalizedInsights.high_priority_skill_names.slice(0, 4)
    : [];

  const missingSkills = Array.isArray(personalizedInsights?.missing_skill_names)
    ? personalizedInsights.missing_skill_names.slice(0, 4)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPadding,
          paddingHorizontal: horizontalPadding,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 20,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedSection delay={20} style={styles.header}>
        <View style={styles.headerSide}>
          <Image
            source={require("@/assets/images/logo-nexapath.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.screenTitle}>Trends</Text>
        </View>

        <Pressable
          style={[styles.refreshIconBtn, !selectedRole && styles.refreshIconBtnDisabled]}
          disabled={!selectedRole || trendsLoading}
          onPress={() => {
            if (selectedRole) {
              fetchForRole(selectedRole).catch(() => undefined);
            }
          }}
        >
          <Feather name="refresh-cw" size={18} color={Colors.textSecondary} />
        </Pressable>
      </AnimatedSection>

      <AnimatedSection delay={55}>
        <GlassCard style={styles.rolePickerCard} padding={16} radius={18}>
          <View style={styles.roleHeaderRow}>
            <Text style={styles.sectionTitle}>Choose Role</Text>
            <Text style={styles.sectionMeta}>{availableRoles.length} roles</Text>
          </View>

          {rolesLoading ? (
            <View style={styles.rolesLoadingWrap}>
              <ActivityIndicator size="small" color={Colors.accentTertiary} />
              <Text style={styles.rolesLoadingText}>Loading roles from web trend index...</Text>
            </View>
          ) : (
            <View style={styles.roleChipWrap}>
              {availableRoles.map((role) => {
                const active = selectedRole === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => {
                      onSelectRole(role).catch(() => undefined);
                    }}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{role}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassCard>
      </AnimatedSection>

      {!selectedRole ? (
        <AnimatedSection delay={90}>
          <GlassCard style={styles.promptCard} padding={22} radius={20}>
            <Feather name="compass" size={22} color={Colors.accentTertiary} />
            <Text style={styles.promptTitle}>Pick a role to start live trend fetch</Text>
            <Text style={styles.promptBody}>
              Once a role is selected, NexaPath fetches role-specific web trend signals and summarizes them on this page.
            </Text>
          </GlassCard>
        </AnimatedSection>
      ) : null}

      {selectedRole ? (
        <>
          <AnimatedSection delay={110}>
            <GlassCard style={styles.heroCard} padding={20} radius={22}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroPill}>
                  <Feather name="radio" size={14} color={Colors.background} />
                  <Text style={styles.heroPillText}>Live Web + AI Summary</Text>
                </View>
                <Badge
                  label={marketMeta?.stale ? "Stale" : "Fresh"}
                  variant={marketMeta?.stale ? "warning" : "primary"}
                  size="sm"
                />
              </View>

              <Text style={styles.heroTitle}>{selectedRole.toUpperCase()}</Text>
              <Text style={styles.heroSummary}>{aiSummary}</Text>
              {aiNextStep ? <Text style={styles.heroActionLine}>Next step: {aiNextStep}</Text> : null}
              <Text style={styles.heroMeta}>Snapshot: {formatSnapshotTime(marketMeta?.latest_updated_at)}</Text>
            </GlassCard>
          </AnimatedSection>

          {trendsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={Colors.accentTertiary} />
              <Text style={styles.loadingText}>Fetching live signals and summarizing...</Text>
            </View>
          ) : (
            <>
              {screenError ? (
                <AnimatedSection delay={130}>
                  <View style={styles.warningBanner}>
                    <Feather name="alert-triangle" size={15} color={Colors.warning} />
                    <Text style={styles.warningText}>{screenError}</Text>
                  </View>
                </AnimatedSection>
              ) : null}

              <AnimatedSection delay={140} style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Role Trend News</Text>
                <Text style={styles.sectionMeta}>{newsItems.length} signals</Text>
              </AnimatedSection>

              <View style={[styles.newsGrid, isWide && styles.newsGridWide]}>
                {newsItems.length > 0 ? (
                  newsItems.slice(0, 8).map((item, index) => (
                    <AnimatedSection
                      key={item.id}
                      delay={160 + index * 30}
                      style={[styles.newsCell, isWide && styles.newsCellWide]}
                    >
                      <GlassCard style={styles.newsCard} padding={16} radius={18}>
                        <View style={styles.newsTopRow}>
                          <View style={styles.newsTagWrap}>
                            <Badge label={item.category} variant="neutral" size="sm" />
                          </View>
                          <Text style={styles.newsSourceCount}>{item.sourceCount} sources</Text>
                        </View>

                        <Text style={styles.newsHeadline}>{item.headline}</Text>
                        <Text style={styles.newsSummary}>{item.summary}</Text>

                        <View style={styles.newsStatsRow}>
                          <View style={styles.newsStatItem}>
                            <Text style={styles.newsStatLabel}>Growth</Text>
                            <AnimatedCounter
                              value={item.growthPercent}
                              prefix="+"
                              suffix="%"
                              style={[styles.newsStatValue, { color: item.tone }]}
                            />
                          </View>
                          <View style={styles.newsStatDivider} />
                          <View style={styles.newsStatItem}>
                            <Text style={styles.newsStatLabel}>Demand</Text>
                            <AnimatedCounter
                              value={item.demandScore}
                              suffix="/100"
                              style={[styles.newsStatValue, { color: item.tone }]}
                            />
                          </View>
                        </View>

                        <View style={styles.newsFooter}>
                          <Text style={styles.newsTimestamp}>{formatSnapshotTime(item.updatedAt)}</Text>
                          <Pressable
                            style={styles.newsActionBtn}
                            onPress={() => {
                              openTrendOnWeb(item.skill, selectedRole).catch(() => undefined);
                            }}
                          >
                            <Text style={styles.newsActionText}>Open on web</Text>
                            <Feather name="external-link" size={13} color={Colors.background} />
                          </Pressable>
                        </View>
                      </GlassCard>
                    </AnimatedSection>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      No trend news found yet for this role. Try refreshing now to trigger another web fetch.
                    </Text>
                  </View>
                )}
              </View>

              <AnimatedSection delay={380} style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Skill Watchlist</Text>
                <Feather name="target" size={18} color={Colors.textSecondary} />
              </AnimatedSection>

              <AnimatedSection delay={410}>
                <GlassCard style={styles.watchlistCard} padding={18} radius={18}>
                  <Text style={styles.watchlistLabel}>High Priority</Text>
                  <View style={styles.watchlistChipRow}>
                    {highPrioritySkills.length > 0 ? (
                      highPrioritySkills.map((skill) => (
                        <Badge key={`priority-${skill}`} label={skill} variant="accent" size="sm" />
                      ))
                    ) : (
                      <Text style={styles.watchlistFallback}>No high-priority skills surfaced yet.</Text>
                    )}
                  </View>

                  <Text style={[styles.watchlistLabel, { marginTop: 12 }]}>Missing in Market</Text>
                  <View style={styles.watchlistChipRow}>
                    {missingSkills.length > 0 ? (
                      missingSkills.map((skill) => (
                        <Badge key={`missing-${skill}`} label={skill} variant="warning" size="sm" />
                      ))
                    ) : (
                      <Text style={styles.watchlistFallback}>No missing skills found in latest snapshot.</Text>
                    )}
                  </View>
                </GlassCard>
              </AnimatedSection>
            </>
          )}
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
    gap: 14,
  },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logo: {
    width: 38,
    height: 38,
  },
  headerTitleWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    fontSize: 24,
    color: Colors.textPrimary,
  },
  refreshIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIconBtnDisabled: {
    opacity: 0.5,
  },
  rolePickerCard: {
    gap: 10,
  },
  roleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rolesLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  rolesLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_500Medium",
  },
  roleChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  roleChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary,
  },
  roleChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  roleChipTextActive: {
    color: Colors.background,
  },
  promptCard: {
    alignItems: "flex-start",
    gap: 8,
  },
  promptTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  promptBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  heroCard: {
    marginTop: 2,
    gap: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.accentTertiary,
  },
  heroPillText: {
    color: Colors.background,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    letterSpacing: -0.8,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  heroSummary: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  heroActionLine: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_500Medium",
  },
  heroMeta: {
    marginTop: 3,
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
  },
  centerContainer: {
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontFamily: "Newsreader_500Medium",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    backgroundColor: `${Colors.warning}1A`,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
  },
  sectionHeader: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  newsGrid: {
    gap: 10,
  },
  newsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  newsCell: {
    width: "100%",
  },
  newsCellWide: {
    width: "49%",
  },
  newsCard: {
    minHeight: 218,
  },
  newsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  newsTagWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  newsSourceCount: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  newsHeadline: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  newsSummary: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  newsStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 9,
    marginBottom: 10,
  },
  newsStatItem: {
    flex: 1,
    alignItems: "center",
  },
  newsStatLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: "Newsreader_500Medium",
    marginBottom: 2,
  },
  newsStatValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  newsStatDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  newsTimestamp: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textTertiary,
    fontFamily: "Newsreader_400Regular",
  },
  newsActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: Colors.accentTertiary,
  },
  newsActionText: {
    color: Colors.background,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  emptyCard: {
    padding: 18,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
  watchlistCard: {
    gap: 2,
  },
  watchlistLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  watchlistChipRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  watchlistFallback: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_400Regular",
  },
});