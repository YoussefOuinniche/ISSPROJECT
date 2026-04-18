import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "@/components/AnimatedSection";
import { RoleMarketCard } from "@/components/home/RoleMarketCard";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  getCountriesCatalog,
  getRolesCatalog,
  type CountryCatalogItem,
  type RoleCatalogItem,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

const DEFAULT_COUNTRY_CODE = "US";

function hasUsefulMarketSignal(role: RoleCatalogItem) {
  const market = role?.market;
  if (!market) {
    return false;
  }

  const hasSalary = Number.isFinite(Number(market.avg_salary)) && Number(market.avg_salary) > 0;
  const hasDemand = Number.isFinite(Number(market.job_count)) && Number(market.job_count) > 0;

  return hasSalary || hasDemand;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const refreshInFlightRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_COUNTRY_CODE);

  const countriesQuery = useQuery({
    queryKey: ["market-countries"],
    queryFn: () => getCountriesCatalog(),
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    const countries = countriesQuery.data || [];
    if (countries.length === 0) {
      return;
    }

    const hasSelectedCountry = countries.some((country) => country.code === selectedCountryCode);
    if (hasSelectedCountry) {
      return;
    }

    const preferredCountry =
      countries.find((country) => country.code === DEFAULT_COUNTRY_CODE) || countries[0];
    if (preferredCountry) {
      setSelectedCountryCode(preferredCountry.code);
    }
  }, [countriesQuery.data, selectedCountryCode]);

  const rolesQuery = useQuery({
    queryKey: ["market-roles", selectedCountryCode],
    queryFn: () =>
      getRolesCatalog({
        countryCode: selectedCountryCode || undefined,
      }),
    enabled: Boolean(selectedCountryCode),
    staleTime: 1000 * 60 * 5,
  });

  const countries = countriesQuery.data || [];
  const selectedCountry =
    countries.find((country) => country.code === selectedCountryCode) || null;

  const filteredRoles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const rows = rolesQuery.data || [];

    return rows
      .filter((role) => hasUsefulMarketSignal(role))
      .filter((role) => {
        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [role.name, role.slug, role.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [rolesQuery.data, searchQuery]);

  const isInitialLoading =
    (countriesQuery.isLoading && !countriesQuery.data) ||
    (rolesQuery.isLoading && !rolesQuery.data);
  const isRefreshing = countriesQuery.isRefetching || rolesQuery.isRefetching;
  const screenError = countriesQuery.error || rolesQuery.error;

  const refreshAll = async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;
    try {
      await Promise.allSettled([countriesQuery.refetch(), rolesQuery.refetch()]);
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 14,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }) + 20,
        },
      ]}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            refreshAll().catch(() => undefined);
          }}
          refreshing={isRefreshing}
          tintColor={Colors.accentTertiary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <AnimatedSection delay={20} style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={require("@/assets/images/logo-nexapath.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.screenTitle} numberOfLines={1} ellipsizeMode="tail">
            Explore IT Roles
          </Text>
        </View>

        <Pressable
          style={[styles.refreshIconBtn, isRefreshing && styles.refreshIconBtnDisabled]}
          onPress={() => {
            refreshAll().catch(() => undefined);
          }}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={Colors.accentTertiary} />
          ) : (
            <Feather name="refresh-cw" size={15} color={Colors.textSecondary} />
          )}
        </Pressable>
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <GlassCard style={styles.controlsCard} padding={18} radius={24}>
          <Text style={styles.sectionTitle}>Search Roles</Text>
          <View style={styles.searchShell}>
            <Feather name="search" size={16} color={Colors.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by role name or keyword"
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.countryHeader}>
            <Text style={styles.sectionTitle}>Country Lens</Text>
            <Text style={styles.sectionMeta}>{countries.length} countries</Text>
          </View>

          {countriesQuery.isLoading && !countriesQuery.data ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={Colors.accentTertiary} />
              <Text style={styles.inlineLoadingText}>Loading countries...</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.countryWrap}
            >
              {countries.map((country: CountryCatalogItem) => {
                const active = country.code === selectedCountryCode;
                return (
                  <Pressable
                    key={country.code}
                    onPress={() => setSelectedCountryCode(country.code)}
                    style={[styles.countryChip, active && styles.countryChipActive, active && { overflow: "hidden" }]}
                  >
                    {active && (
                      <LinearGradient
                        colors={Colors.gradientAccentTertiary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}
                    <Text style={[styles.countryChipText, active && styles.countryChipTextActive]}>
                      {country.flag_emoji ? `${country.flag_emoji} ` : ""}
                      {country.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </GlassCard>
      </AnimatedSection>

      {isInitialLoading ? (
        <GlassCard style={styles.centerState} padding={22} radius={24}>
          <ActivityIndicator size="large" color={Colors.accentTertiary} />
          <Text style={styles.centerStateTitle}>Loading live role market data...</Text>
          <Text style={styles.centerStateText}>The Home page is syncing with backend role, salary, and demand records.</Text>
        </GlassCard>
      ) : screenError ? (
        <AnimatedSection delay={120}>
          <GlassCard style={styles.errorCard} padding={22} radius={24}>
            <View style={styles.errorRow}>
              <Feather name="alert-triangle" size={18} color={Colors.warning} />
              <Text style={styles.errorTitle}>Unable to load the live roles explorer</Text>
            </View>
            <Text style={styles.errorText}>
              {screenError instanceof Error
                ? screenError.message
                : "The backend did not return role market data."}
            </Text>
            <Text style={styles.retryText} onPress={() => refreshAll().catch(() => undefined)}>
              Try again
            </Text>
          </GlassCard>
        </AnimatedSection>
      ) : filteredRoles.length === 0 ? (
        <AnimatedSection delay={120}>
          <GlassCard style={styles.emptyCard} padding={22} radius={24}>
            <Text style={styles.emptyTitle}>No roles match this search</Text>
            <Text style={styles.emptyText}>
              Adjust your search or country to explore available role market cards.
            </Text>
          </GlassCard>
        </AnimatedSection>
      ) : (
        <>
          <AnimatedSection delay={120} style={styles.listHeader}>
            <Text style={styles.listTitle}>All Roles</Text>
            <Text style={styles.listMeta}>{filteredRoles.length} results</Text>
          </AnimatedSection>

          {filteredRoles.map((role, index) => (
            <AnimatedSection key={role.slug} delay={140 + index * 18}>
              <RoleMarketCard
                role={role}
                selectedCountry={selectedCountry}
                onPressDetails={() => {
                  const slug = String(role.slug || "").trim();
                  if (!slug) {
                    return;
                  }

                  router.push({
                    pathname: "/role-details",
                    params: {
                      slug,
                      countryCode: selectedCountryCode,
                    },
                  });
                }}
              />
            </AnimatedSection>
          ))}
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
    paddingHorizontal: 20,
    gap: 14,
  },
  header: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    marginRight: 10,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    fontSize: 22,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  logo: {
    width: 42,
    height: 42,
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
  controlsCard: {
    gap: 12,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  searchShell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  countryHeader: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  inlineLoadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Newsreader_500Medium",
  },
  countryWrap: {
    gap: 8,
    paddingRight: 4,
  },
  countryChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
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
    color: Colors.textInverse,
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    gap: 8,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  centerStateTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  centerStateText: {
    maxWidth: 280,
    textAlign: "center",
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  errorCard: {
    gap: 10,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorTitle: {
    flex: 1,
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
  retryText: {
    alignSelf: "flex-start",
    color: Colors.accentTertiary,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  emptyCard: {
    gap: 8,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  listHeader: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  listMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
