import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DemandSignalChart } from "@/components/market/DemandSignalChart";
import { SalaryMarketIndicator } from "@/components/market/SalaryMarketIndicator";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import { getRoleMarketDetail, type RoleMarketRow } from "@/lib/api/mobileApi";
import {
  buildMarketSummary,
  formatCollectedAt,
  formatCurrencyValue,
  formatJobCount,
} from "@/lib/marketFormat";
import { getBottomContentPadding } from "@/lib/layout";

export default function RoleDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 390;
  const params = useLocalSearchParams<{ slug?: string; countryCode?: string }>();
  const slug = String(params.slug || "").trim().toLowerCase();
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    String(params.countryCode || "").trim().toUpperCase()
  );

  const roleQuery = useQuery({
    queryKey: ["role-market-detail", slug, selectedCountryCode],
    queryFn: () =>
      getRoleMarketDetail(slug, {
        countryCode: selectedCountryCode || undefined,
      }),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const nextCountryCode = String(params.countryCode || "").trim().toUpperCase();
    if (nextCountryCode && nextCountryCode !== selectedCountryCode) {
      setSelectedCountryCode(nextCountryCode);
    }
  }, [params.countryCode, selectedCountryCode]);

  useEffect(() => {
    const backendCountryCode = String(
      roleQuery.data?.selected_country?.code || roleQuery.data?.market?.country_code || ""
    )
      .trim()
      .toUpperCase();

    if (backendCountryCode && backendCountryCode !== selectedCountryCode) {
      setSelectedCountryCode(backendCountryCode);
    }
  }, [
    roleQuery.data?.market?.country_code,
    roleQuery.data?.selected_country?.code,
    selectedCountryCode,
  ]);

  const payload = roleQuery.data;
  const selectedCountry = payload?.selected_country || null;
  const selectedMarket = payload?.market || null;
  const hasSalary = Number.isFinite(Number(selectedMarket?.avg_salary)) && Number(selectedMarket?.avg_salary) > 0;
  const hasDemand = Number.isFinite(Number(selectedMarket?.job_count)) && Number(selectedMarket?.job_count) > 0;
  const marketSummary = useMemo(
    () =>
      payload ? buildMarketSummary(payload.role.name, selectedCountry, selectedMarket) : null,
    [payload, selectedCountry, selectedMarket]
  );

  const roleName = payload?.role.name || "Role";
  const roleDescription = payload?.role.description || "No role description is available.";
  const hasRoleDescription = Boolean(String(payload?.role.description || "").trim());
  const availableMarkets = payload?.available_markets || [];
  const salaryText = hasSalary
    ? formatCurrencyValue(selectedMarket?.avg_salary, selectedMarket?.currency)
    : null;
  const demandText = hasDemand ? formatJobCount(selectedMarket?.job_count) : null;
  const sourceName =
    selectedMarket?.source_name ||
    selectedMarket?.salary_source_name ||
    selectedMarket?.demand_source_name ||
    null;
  const collectedAt = selectedMarket?.collected_at
    ? formatCollectedAt(selectedMarket?.collected_at)
    : null;
  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.flag_emoji ? `${selectedCountry.flag_emoji} ` : ""}${selectedCountry.name}`
    : null;
  const selectedCountryName =
    selectedCountry?.name ||
    String(selectedMarket?.country_name || selectedMarket?.country_code || "").trim() ||
    "Selected market";
  const marketSalaryValues = useMemo(
    () =>
      availableMarkets
        .map((market) => Number(market?.avg_salary))
        .filter((value) => Number.isFinite(value) && value > 0),
    [availableMarkets]
  );
  const marketDemandValues = useMemo(
    () =>
      availableMarkets
        .map((market) => Number(market?.job_count))
        .filter((value) => Number.isFinite(value) && value > 0),
    [availableMarkets]
  );
  const selectedCountryDisplay = selectedCountryLabel || selectedCountryName;
  const selectedCurrencyCode = String(selectedMarket?.currency || "").trim().toUpperCase();
  const sourceDisplay = sourceName || "Not available yet";
  const updatedDisplay = collectedAt || "Not available yet";
  const salaryExplanation = hasSalary
    ? `This figure represents a market-based average estimate for this role in ${selectedCountryName}. Actual compensation can vary depending on seniority, company size, and location.`
    : "Salary data is not available yet for this market";
  const demandExplanation = hasDemand
    ? "This reflects the number of job opportunities currently detected for this role in the selected market. Higher values usually indicate stronger hiring activity."
    : "Demand data is not available yet for this market";

  function formatSalaryAvailability(value: number | null | undefined, currency: string | null | undefined) {
    const hasValue = Number.isFinite(Number(value)) && Number(value) > 0;
    return hasValue ? formatCurrencyValue(value, currency) : "Data not available yet";
  }

  function formatDemandAvailability(value: number | null | undefined) {
    const hasValue = Number.isFinite(Number(value)) && Number(value) > 0;
    return hasValue ? `${formatJobCount(value)} openings` : "Data not available yet";
  }

  const detailItems = useMemo(() => {
    if (!payload) {
      return [] as Array<{ label: string; value: string }>;
    }

    const rawItems: Array<{ label: string; value: string | null | undefined }> = [
      { label: "Role Name", value: payload.role.name },
      { label: "Role Slug", value: payload.role.slug },
      { label: "Country", value: selectedCountryLabel },
      { label: "Country Code", value: selectedMarket?.country_code || null },
      { label: "Average Salary", value: salaryText },
      { label: "Demand (Openings)", value: demandText },
      { label: "Currency", value: selectedMarket?.currency || null },
      { label: "Source", value: sourceName },
      { label: "Collected", value: collectedAt },
      {
        label: "Salary Updated",
        value: selectedMarket?.salary_collected_at ? formatCollectedAt(selectedMarket.salary_collected_at) : null,
      },
      {
        label: "Demand Updated",
        value: selectedMarket?.demand_collected_at ? formatCollectedAt(selectedMarket.demand_collected_at) : null,
      },
    ];

    return rawItems
      .map((item) => ({
        label: item.label,
        value: String(item.value || "").trim(),
      }))
      .filter((item) => item.value.length > 0);
  }, [
    collectedAt,
    demandText,
    payload,
    salaryText,
    selectedCountryLabel,
    selectedMarket?.country_code,
    selectedMarket?.currency,
    selectedMarket?.demand_collected_at,
    selectedMarket?.salary_collected_at,
    sourceName,
  ]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.pageContent,
          { paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: false }) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#081226", "#102B57", "#17366E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View
            style={[
              styles.heroContent,
              {
                paddingTop: Platform.OS === "web" ? insets.top + 32 : insets.top + 14,
              },
            ]}
          >
            <View style={styles.navRow}>
              <Pressable style={styles.navButton} onPress={() => router.back()}>
                <Feather name="arrow-left" size={20} color={Colors.background} />
              </Pressable>
            </View>

            <Text style={[styles.heroTitle, isCompactScreen && styles.heroTitleCompact]}>{roleName}</Text>
            <Text
              style={styles.heroDescription}
              numberOfLines={isCompactScreen ? 2 : 3}
              ellipsizeMode="tail"
            >
              {roleDescription}
            </Text>

            <View style={[styles.heroMetaRow, isCompactScreen && styles.heroMetaRowCompact]}>
              <View style={styles.heroCountryPill}>
                <Feather name="map-pin" size={14} color={Colors.background} />
                <Text style={styles.heroCountry}>{selectedCountryLabel || "Country context"}</Text>
              </View>
              <View style={styles.heroMiniCard}>
                <Text style={styles.heroMiniLabel}>Demand</Text>
                <Text style={styles.heroMiniValue}>{demandText || "N/A"}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.scrollContent}>
        {roleQuery.isLoading && !payload ? (
          <GlassCard style={styles.loadingCard} padding={22} radius={24}>
            <ActivityIndicator size="large" color={Colors.accentTertiary} />
            <Text style={styles.centerTitle}>Loading role market details...</Text>
            <Text style={styles.centerSubtitle}>
              Pulling the latest saved market snapshot for this role and country.
            </Text>
          </GlassCard>
        ) : roleQuery.error ? (
          <GlassCard style={styles.errorCard} padding={22} radius={24}>
            <Text style={styles.errorTitle}>Unable to load this role</Text>
            <Text style={styles.errorText}>
              {roleQuery.error instanceof Error ? roleQuery.error.message : "Backend request failed."}
            </Text>
          </GlassCard>
        ) : payload ? (
          <>
            <GlassCard style={styles.summaryCard} padding={20} radius={24}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderCopy}>
                  <Text style={styles.sectionKicker}>Selected Market</Text>
                  <Text style={styles.sectionTitle}>{selectedCountryLabel || "Market context"}</Text>
                </View>
              </View>
              {marketSummary ? <Text style={styles.summaryText}>{marketSummary}</Text> : null}
            </GlassCard>

            {hasRoleDescription && (
              <GlassCard style={styles.descriptionCard} padding={20} radius={24}>
                <Text style={styles.cardTitle}>Role Description</Text>
                <Text style={styles.longDescriptionText}>{roleDescription}</Text>
              </GlassCard>
            )}

            <GlassCard style={styles.marketInsightsCard} padding={20} radius={24}>
              <View style={styles.sectionHeaderCopy}>
                <Text style={styles.sectionKicker}>Market Insights</Text>
                <Text style={styles.sectionTitle}>Salary and Demand Signals</Text>
              </View>

              <Text style={styles.marketInsightsLead}>
                Real backend market signals for the selected country.
              </Text>
              <Text style={styles.marketContextText}>{selectedCountryDisplay}</Text>

              <View style={styles.insightsStack}>
                <SalaryMarketIndicator
                  hasSalary={hasSalary}
                  salaryValue={salaryText}
                  averageSalary={selectedMarket?.avg_salary}
                  salaryReferenceValues={marketSalaryValues}
                  currencyCode={selectedCurrencyCode || null}
                  countryLabel={selectedCountryDisplay}
                  explanation={salaryExplanation}
                />

                <DemandSignalChart
                  hasDemand={hasDemand}
                  demandCount={selectedMarket?.job_count}
                  demandReferenceValues={marketDemandValues}
                  demandValue={demandText}
                  explanation={demandExplanation}
                />
              </View>

              <View style={styles.marketMetaFooter}>
                <View style={styles.marketMetaRow}>
                  <Text style={styles.marketMetaLabel}>Source</Text>
                  <Text style={styles.marketMetaValue}>{sourceDisplay}</Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.marketMetaRow}>
                  <Text style={styles.marketMetaLabel}>Updated</Text>
                  <Text style={styles.marketMetaValue}>{updatedDisplay}</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.detailCard} padding={20} radius={24}>
              <Text style={styles.cardTitle}>Market Source</Text>
              {sourceName ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Source</Text>
                    <Text style={styles.detailValue}>{sourceName}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              ) : null}
              {collectedAt ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Collected</Text>
                    <Text style={styles.detailValue}>{collectedAt}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              ) : null}
              {selectedMarket?.country_code ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Country code</Text>
                  <Text style={styles.detailValue}>{selectedMarket.country_code}</Text>
                </View>
              ) : null}

              {marketSummary ? (
                <>
                  <View style={styles.noteDivider} />
                  <View style={styles.noteCard}>
                    <Text style={styles.noteLabel}>Market insight</Text>
                    <Text style={styles.noteText}>{marketSummary}</Text>
                  </View>
                </>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryButton, styles.secondaryButtonFull]}
                  onPress={() => router.push("/(tabs)/learn")}
                >
                  <Text style={styles.secondaryButtonText}>Roadmap</Text>
                  <Feather name="map" size={14} color={Colors.textPrimary} />
                </Pressable>
              </View>
            </GlassCard>

            {detailItems.length > 0 && (
              <GlassCard style={styles.fullDetailsCard} padding={20} radius={24}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionKicker}>All Job Details</Text>
                    <Text style={styles.sectionTitle}>Complete Role Snapshot</Text>
                  </View>
                </View>

                <View style={styles.detailChipGrid}>
                  {detailItems.map((item) => (
                    <View key={item.label} style={styles.detailChip}>
                      <Text style={styles.detailChipLabel}>{item.label}</Text>
                      <Text style={styles.detailChipValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            )}

            <Text style={styles.sectionTitleStandalone}>Available Country Markets</Text>
            {availableMarkets.length > 0 ? (
              <>
                <View style={styles.countryChipWrap}>
                  {availableMarkets.map((market) => {
                    const active = market.country_code === selectedCountryCode;
                    return (
                      <Pressable
                        key={market.country_code}
                        style={[styles.countryChip, active && styles.countryChipActive]}
                        onPress={() => setSelectedCountryCode(market.country_code)}
                      >
                        <Text style={[styles.countryChipText, active && styles.countryChipTextActive]}>
                          {market.flag_emoji ? `${market.flag_emoji} ` : ""}
                          {market.country_name || market.country_code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.marketList}>
                  {availableMarkets.map((market: RoleMarketRow) => {
                    const isSelected = market.country_code === selectedCountryCode;

                    return (
                      <GlassCard
                        key={`${market.country_code}-${market.collected_at || "none"}`}
                        style={[styles.marketRowCard, isSelected && styles.marketRowCardActive]}
                        padding={18}
                        radius={22}
                      >
                        <View style={styles.marketRowTop}>
                          <View style={styles.marketRowCountryBlock}>
                            <Text style={styles.marketRowCountry}>
                              {market.flag_emoji ? `${market.flag_emoji} ` : ""}
                              {market.country_name || market.country_code}
                            </Text>
                            <Text style={styles.marketRowUpdate}>
                              {formatCollectedAt(market.collected_at)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.marketRowMetrics}>
                          <View style={styles.marketMetricBlock}>
                            <Text style={styles.marketMetricLabel}>Salary</Text>
                            <Text style={styles.marketRowValue}>
                              {formatSalaryAvailability(market.avg_salary, market.currency)}
                            </Text>
                          </View>
                          <View style={styles.marketMetricDivider} />
                          <View style={styles.marketMetricBlock}>
                            <Text style={styles.marketMetricLabel}>Demand</Text>
                            <Text style={styles.marketRowMeta}>
                              {formatDemandAvailability(market.job_count)}
                            </Text>
                          </View>
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              </>
            ) : (
              <GlassCard style={styles.emptyStateCard} padding={22} radius={22}>
                <Text style={styles.emptyStateTitle}>No live market rows yet</Text>
                <Text style={styles.emptyStateText}>
                  This role exists in the catalog, but there is no ingested salary or demand data available yet.
                </Text>
              </GlassCard>
            )}
          </>
        ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroGradient: {
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  heroContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.2,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  heroTitleCompact: {
    fontSize: 29,
    lineHeight: 33,
  },
  heroDescription: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Newsreader_400Regular",
  },
  heroMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    gap: 10,
  },
  heroMetaRowCompact: {
    flexDirection: "column",
  },
  heroCountryPill: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroCountry: {
    flex: 1,
    color: "rgba(255,255,255,0.96)",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  heroMiniCard: {
    minWidth: 110,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
  },
  heroMiniLabel: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },
  heroMiniValue: {
    marginTop: 2,
    color: Colors.background,
    fontSize: 18,
    lineHeight: 22,
    fontFamily: "Inter_700Bold",
  },
  scroll: {
    flex: 1,
  },
  pageContent: {
    gap: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 14,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  centerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  centerSubtitle: {
    maxWidth: 300,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  errorCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  errorTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  summaryCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  sectionKicker: {
    color: Colors.accentTertiary,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  marketInsightsCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  marketInsightsLead: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
  marketContextText: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  insightsStack: {
    gap: 10,
    marginTop: 2,
  },
  marketMetaFooter: {
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  marketMetaRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  marketMetaLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_600SemiBold",
  },
  marketMetaValue: {
    flex: 1,
    textAlign: "right",
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
  },
  detailCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  descriptionCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  fullDetailsCard: {
    gap: 12,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: "Inter_600SemiBold",
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
  },
  longDescriptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Newsreader_400Regular",
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  noteDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 6,
  },
  noteCard: {
    marginTop: 4,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#DCE7F8",
    gap: 4,
  },
  noteLabel: {
    color: Colors.accentTertiary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },
  noteText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  detailChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailChip: {
    minWidth: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  detailChipLabel: {
    color: Colors.textTertiary,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.65,
    fontFamily: "Inter_700Bold",
  },
  detailChipValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
  },
  actionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryButtonFull: {
    flex: 1,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  sectionTitleStandalone: {
    marginTop: 6,
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  countryChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  countryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
  },
  countryChipActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: Colors.accentTertiary,
  },
  countryChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  countryChipTextActive: {
    color: Colors.background,
  },
  marketList: {
    gap: 10,
  },
  emptyStateCard: {
    gap: 8,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  emptyStateTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  marketRowCard: {
    gap: 12,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  marketRowCardActive: {
    borderColor: Colors.accentTertiary,
    backgroundColor: "#FBFCFF",
  },
  marketRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  marketRowCountryBlock: {
    flex: 1,
    gap: 4,
  },
  marketRowCountry: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  marketRowUpdate: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Newsreader_500Medium",
  },
  marketRowMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  marketMetricBlock: {
    flex: 1,
    gap: 4,
  },
  marketMetricDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: Colors.border,
  },
  marketMetricLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },
  marketRowValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
  },
  marketRowMeta: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
  },
});
