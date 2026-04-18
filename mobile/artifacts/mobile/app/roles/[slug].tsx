import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
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
import { SectionContainer } from "@/components/design-system/SectionContainer";
import { EmptyStateSystem } from "@/components/design-system/EmptyStateSystem";
import { Label } from "@/components/design-system/Label";

import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";
import { getRoleMarketDetail } from "@/lib/api/mobileApi";
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
  const params = useLocalSearchParams<{ slug?: string; countryCode?: string }>();
  const slug = String(params.slug || "").trim().toLowerCase();
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    String(params.countryCode || "").trim().toUpperCase()
  );

  const roleQuery = useQuery({
    queryKey: ["role-market-detail", slug, selectedCountryCode],
    queryFn: () => getRoleMarketDetail(slug, { countryCode: selectedCountryCode || undefined }),
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
    ).trim().toUpperCase();

    if (backendCountryCode && backendCountryCode !== selectedCountryCode) {
      setSelectedCountryCode(backendCountryCode);
    }
  }, [roleQuery.data?.market?.country_code, roleQuery.data?.selected_country?.code, selectedCountryCode]);

  const payload = roleQuery.data;
  const selectedCountry = payload?.selected_country || null;
  const selectedMarket = payload?.market || null;
  
  const hasSalary = Number.isFinite(Number(selectedMarket?.avg_salary)) && Number(selectedMarket?.avg_salary) > 0;
  const hasDemand = Number.isFinite(Number(selectedMarket?.job_count)) && Number(selectedMarket?.job_count) > 0;
  
  const marketSummary = useMemo(
    () => payload ? buildMarketSummary(payload.role.name, selectedCountry, selectedMarket) : null,
    [payload, selectedCountry, selectedMarket]
  );

  const roleName = payload?.role.name || "Role";
  const roleDescription = payload?.role.description || "Description unavailable.";
  const hasRoleDescription = Boolean(String(payload?.role.description || "").trim());
  
  const availableMarkets = payload?.available_markets || [];
  const salaryText = hasSalary ? formatCurrencyValue(selectedMarket?.avg_salary, selectedMarket?.currency) : null;
  const demandText = hasDemand ? formatJobCount(selectedMarket?.job_count) : null;
  
  const sourceName = selectedMarket?.source_name || selectedMarket?.salary_source_name || selectedMarket?.demand_source_name || null;
  const collectedAt = selectedMarket?.collected_at ? formatCollectedAt(selectedMarket?.collected_at) : null;
  
  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.flag_emoji ? `${selectedCountry.flag_emoji} ` : ""}${selectedCountry.name}`
    : "Market Context";
  const selectedCountryName = selectedCountry?.name || String(selectedMarket?.country_name || selectedMarket?.country_code || "").trim() || "Selected market";
  
  const marketSalaryValues = useMemo(() => availableMarkets.map(m => Number(m?.avg_salary)).filter(v => Number.isFinite(v) && v > 0), [availableMarkets]);
  const marketDemandValues = useMemo(() => availableMarkets.map(m => Number(m?.job_count)).filter(v => Number.isFinite(v) && v > 0), [availableMarkets]);
  
  const selectedCurrencyCode = String(selectedMarket?.currency || "").trim().toUpperCase();
  const sourceDisplay = sourceName || "Unknown source";
  const updatedDisplay = collectedAt || "Pending update";

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.pageContent,
          { paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: false }) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { paddingTop: Platform.OS === "web" ? insets.top + 32 : insets.top + 14 }]}>
          <Pressable style={styles.navButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.heroTitles}>
            <Text style={styles.heroTitle}>{roleName}</Text>
            {hasRoleDescription && (
              <Text style={styles.heroDescription}>
                {roleDescription}
              </Text>
            )}
            <View style={styles.heroMeta}>
              <Label text={selectedCountryLabel} variant="accent" />
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          {roleQuery.isLoading && !payload ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Fetching market intel...</Text>
            </View>
          ) : roleQuery.error ? (
            <EmptyStateSystem 
              icon="alert-circle"
              title="Failed to Load" 
              description={roleQuery.error instanceof Error ? roleQuery.error.message : "Backend request failed."} 
            />
          ) : payload ? (
            <>
              {marketSummary ? (
                <SectionContainer title="Market Context">
                  <View style={styles.calloutCard}>
                    <Text style={styles.calloutText}>{marketSummary}</Text>
                  </View>
                </SectionContainer>
              ) : null}

              <SectionContainer 
                title="Market Insights" 
              >
                <SalaryMarketIndicator
                  hasSalary={hasSalary}
                  salaryValue={salaryText}
                  averageSalary={selectedMarket?.avg_salary}
                  salaryReferenceValues={marketSalaryValues}
                  currencyCode={selectedCurrencyCode || null}
                  countryLabel={selectedCountryName}
                />
                
                <DemandSignalChart
                  hasDemand={hasDemand}
                  demandCount={selectedMarket?.job_count}
                  demandReferenceValues={marketDemandValues}
                  demandValue={demandText}
                />
                
                {sourceDisplay !== "Unknown source" ? (
                  <View style={styles.sourceInfo}>
                    <Text style={styles.sourceText}>
                      Data sourced from {sourceDisplay} ({updatedDisplay})
                    </Text>
                  </View>
                ) : null}
              </SectionContainer>
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
    backgroundColor: Colors.backgroundSecondary,
  },
  scroll: {
    flex: 1,
  },
  pageContent: {
  },
  heroSection: {
    backgroundColor: Colors.surface,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AppTheme.spacing.lg,
  },
  heroTitles: {
    gap: AppTheme.spacing.sm,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  heroDescription: {
    ...AppTheme.type.body,
    color: Colors.textSecondary,
    maxWidth: "90%",
  },
  heroMeta: {
    marginTop: AppTheme.spacing.sm,
    flexDirection: "row",
  },
  contentSection: {
    paddingHorizontal: AppTheme.spacing.xl,
    paddingTop: AppTheme.spacing.xl,
    gap: AppTheme.spacing.lg,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.md,
  },
  loadingText: {
    ...AppTheme.type.bodyStrong,
    color: Colors.textSecondary,
  },
  calloutCard: {
    backgroundColor: Colors.accentTertiaryLight,
    padding: AppTheme.spacing.lg,
    borderRadius: AppTheme.radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.accentTertiary,
  },
  calloutText: {
    ...AppTheme.type.body,
    color: Colors.accentTertiary,
    fontFamily: AppTheme.fonts.medium,
  },
  sourceInfo: {
    marginTop: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.sm,
  },
  sourceText: {
    ...AppTheme.type.caption,
    color: Colors.textTertiary,
  },
});
