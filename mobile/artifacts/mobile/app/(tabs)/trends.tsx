import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { AnimatedSection } from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  getTrendDomains,
  getTrends,
  type TrendCatalogItem,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

const ALL_DOMAINS_LABEL = "All Domains";

function trackTrendsEvent(event: string, payload: Record<string, unknown> = {}) {
  console.info("[Telemetry][Trends]", event, payload);
}

function formatSnapshotTime(value: string | null | undefined) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";
  return date.toLocaleString();
}

function normalizeDomains(domains: string[]) {
  return [ALL_DOMAINS_LABEL, ...Array.from(new Set(domains.map((item) => String(item || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))];
}

async function openTrendOnWeb(url: string | null | undefined) {
  const sourceUrl = String(url || "").trim();
  if (!sourceUrl) return;

  try {
    await Linking.openURL(sourceUrl);
  } catch (error) {
    console.error("Failed to open trend web link", error);
  }
}

export default function TrendsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const refreshInFlightRef = useRef(false);

  const [availableDomains, setAvailableDomains] = useState<string[]>([ALL_DOMAINS_LABEL]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [selectedDomain, setSelectedDomain] = useState(ALL_DOMAINS_LABEL);

  const [trendRows, setTrendRows] = useState<TrendCatalogItem[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const topPadding = Platform.OS === "web" ? insets.top + 54 : insets.top + 10;
  const horizontalPadding = width >= 1200 ? 34 : width >= 980 ? 28 : 20;
  const isWide = width >= 960;

  const loadDomains = async () => {
    setDomainsLoading(true);

    try {
      const domains = await getTrendDomains();
      setAvailableDomains(normalizeDomains(domains));
    } catch (error) {
      console.error("Failed to load trend domains", error);
      setAvailableDomains([ALL_DOMAINS_LABEL]);
    } finally {
      setDomainsLoading(false);
    }
  };

  const loadTrends = async (domain: string) => {
    setScreenError(null);
    setTrendsLoading(true);

    trackTrendsEvent("trend_catalog_fetch_started", { domain });

    try {
      const trends = await getTrends({
        limit: 120,
        domain: domain === ALL_DOMAINS_LABEL ? undefined : domain,
      });

      setTrendRows(Array.isArray(trends) ? trends : []);

      trackTrendsEvent("trend_catalog_fetch_completed", {
        domain,
        trendsFound: Array.isArray(trends) ? trends.length : 0,
      });
    } catch (error) {
      console.error("Trend catalog fetch failed", error);
      setTrendRows([]);
      setScreenError("Unable to fetch trends from the backend right now.");
    } finally {
      setTrendsLoading(false);
    }
  };

  useEffect(() => {
    loadDomains().catch(() => undefined);
    loadTrends(ALL_DOMAINS_LABEL).catch(() => undefined);
  }, []);

  const onSelectDomain = async (domain: string) => {
    setSelectedDomain(domain);
    await loadTrends(domain);
  };

  const refreshAll = async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      await Promise.allSettled([loadDomains(), loadTrends(selectedDomain)]);
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  const isRefreshing = trendsLoading || domainsLoading;

  const filteredTrends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return trendRows
      .filter((item) => {
        if (!query) return true;

        const searchableText = [
          item.title,
          item.description,
          item.domain,
          item.source_name,
          item.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((left, right) => {
        const leftTime = new Date(left.published_at || left.scraped_at || left.created_at || 0).getTime();
        const rightTime = new Date(right.published_at || right.scraped_at || right.created_at || 0).getTime();
        return rightTime - leftTime;
      });
  }, [searchQuery, trendRows]);

  const latestSnapshot = useMemo(() => {
    const values = filteredTrends
      .map((item) => item.scraped_at || item.published_at || item.updated_at || item.created_at || null)
      .filter(Boolean) as string[];

    return values.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
  }, [filteredTrends]);

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
            source={require("@/assets/images/nexapath.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.screenTitle}>Trends</Text>
        </View>

        <Pressable
          style={[styles.refreshIconBtn, isRefreshing && styles.refreshIconBtnDisabled]}
          disabled={isRefreshing}
          onPress={() => {
            refreshAll().catch(() => undefined);
          }}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={Colors.accentTertiary} />
          ) : (
            <Feather name="refresh-cw" size={15} color={Colors.textSecondary} />
          )}
        </Pressable>
      </AnimatedSection>

      <AnimatedSection delay={50}>
        <GlassCard style={styles.searchCard} padding={16} radius={18}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search titles, descriptions, or sources"
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <GlassCard style={styles.domainPickerCard} padding={16} radius={18}>
          <View style={styles.domainHeaderRow}>
            <Text style={styles.sectionTitle}>Choose Domain</Text>
            <Text style={styles.sectionMeta}>{availableDomains.length - 1} domains</Text>
          </View>

          {domainsLoading ? (
            <View style={styles.domainsLoadingWrap}>
              <ActivityIndicator size="small" color={Colors.accentTertiary} />
              <Text style={styles.domainsLoadingText}>Loading domains from backend trend catalog...</Text>
            </View>
          ) : (
            <View style={styles.domainChipWrap}>
              {availableDomains.map((domain) => {
                const active = selectedDomain === domain;
                return (
                  <Pressable
                    key={domain}
                    onPress={() => {
                      onSelectDomain(domain).catch(() => undefined);
                    }}
                    style={[styles.domainChip, active && styles.domainChipActive]}
                  >
                    <Text style={[styles.domainChipText, active && styles.domainChipTextActive]}>
                      {domain}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={110}>
        <GlassCard style={styles.heroCard} padding={20} radius={22}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroPill}>
              <Feather name="database" size={14} color={Colors.background} />
              <Text style={styles.heroPillText}>Backend Catalog</Text>
            </View>
            <Badge
              label={selectedDomain === ALL_DOMAINS_LABEL ? "All domains" : selectedDomain}
              variant="accentYellow"
              size="sm"
            />
          </View>

          <Text style={styles.heroTitle}>{filteredTrends.length} live trend entries</Text>
          <Text style={styles.heroSummary}>
            This screen now reads only from the persisted backend `/api/trends` catalog.
          </Text>
          <Text style={styles.heroMeta}>Latest snapshot: {formatSnapshotTime(latestSnapshot)}</Text>
        </GlassCard>
      </AnimatedSection>

      {trendsLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accentTertiary} />
          <Text style={styles.loadingText}>Loading trends from the backend...</Text>
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
            <Text style={styles.sectionTitle}>Trend Catalog</Text>
            <Text style={styles.sectionMeta}>{filteredTrends.length} results</Text>
          </AnimatedSection>

          <View style={[styles.newsGrid, isWide && styles.newsGridWide]}>
            {filteredTrends.length > 0 ? (
              filteredTrends.map((item, index) => (
                <AnimatedSection
                  key={item.id}
                  delay={160 + index * 20}
                  style={[styles.newsCell, isWide && styles.newsCellWide]}
                >
                  <GlassCard style={styles.newsCard} padding={16} radius={18}>
                    <View style={styles.newsTopRow}>
                      <View style={styles.newsTagWrap}>
                        <Badge label={item.domain || "General Tech"} variant="neutral" size="sm" />
                      </View>
                      <Text style={styles.newsSourceCount}>
                        {item.source_name || item.source || "Unknown source"}
                      </Text>
                    </View>

                    <Text style={styles.newsHeadline}>{item.title}</Text>
                    <Text style={styles.newsSummary}>
                      {item.description || "No description available for this trend entry."}
                    </Text>

                    <View style={styles.newsFooter}>
                      <Text style={styles.newsTimestamp}>
                        Published: {formatSnapshotTime(item.published_at || item.scraped_at || item.created_at)}
                      </Text>
                      <Pressable
                        style={[styles.newsActionBtn, !item.source_url && styles.newsActionBtnDisabled, { overflow: "hidden" }]}
                        onPress={() => {
                          openTrendOnWeb(item.source_url).catch(() => undefined);
                        }}
                        disabled={!item.source_url}
                      >
                       <LinearGradient
                          colors={Colors.gradientAccentTertiary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFill}
                        />
                        <Text style={[styles.newsActionText, { zIndex: 1 }]}>
                          {item.source_url ? "Open source" : "No source URL"}
                        </Text>
                        <Feather name="external-link" size={13} color={Colors.background} style={{ zIndex: 1 }} />
                      </Pressable>
                    </View>
                  </GlassCard>
                </AnimatedSection>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No trends match the current backend filters.
                </Text>
              </View>
            )}
          </View>
        </>
      )}
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
    width: 104,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  logo: {
    width: 96,
    height: 36,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIconBtnDisabled: {
    opacity: 0.6,
  },
  searchCard: {
    gap: 10,
  },
  searchInput: {
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  domainPickerCard: {
    gap: 10,
  },
  domainHeaderRow: {
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
  domainsLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  domainsLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_500Medium",
  },
  domainChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  domainChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  domainChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary,
  },
  domainChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  domainChipTextActive: {
    color: Colors.background,
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
    minHeight: 210,
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
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
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
  newsFooter: {
    marginTop: "auto",
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
  newsActionBtnDisabled: {
    opacity: 0.55,
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
});

