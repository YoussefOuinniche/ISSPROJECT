import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { MarketStatTile } from "@/components/market/MarketStatTile";
import { AppButton } from "@/components/ui/AppButton";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import type { CountryCatalogItem, RoleCatalogItem } from "@/lib/api/mobileApi";
import {
  formatCollectedAt,
  formatCurrencyValue,
  formatJobCount,
  resolveFreshnessLabel,
} from "@/lib/marketFormat";

type RoleMarketCardProps = {
  role: RoleCatalogItem;
  selectedCountry?: CountryCatalogItem | null;
  onPressDetails: () => void;
};

export function RoleMarketCard({ role, selectedCountry, onPressDetails }: RoleMarketCardProps) {
  const market = role.market || null;
  const hasSalary = Number.isFinite(Number(market?.avg_salary)) && Number(market?.avg_salary) > 0;
  const hasDemand = Number.isFinite(Number(market?.job_count)) && Number(market?.job_count) > 0;
  const salaryText = hasSalary
    ? formatCurrencyValue(market?.avg_salary, market?.currency)
    : "Data not available yet";
  const demandText = hasDemand
    ? formatJobCount(market?.job_count)
    : "Data not available yet";
  const freshnessLabel = resolveFreshnessLabel(market);
  const sourceLabel = market?.source_name || market?.salary_source_name || market?.demand_source_name || null;
  const countryLabel = selectedCountry
    ? `${selectedCountry.flag_emoji ? `${selectedCountry.flag_emoji} ` : ""}${selectedCountry.name}`
    : "Global role catalog";

  return (
    <GlassCard style={styles.card} padding={18} radius={26}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{role.name}</Text>
        <Text numberOfLines={3} style={styles.description}>
          {role.description || "No role description is available yet."}
        </Text>
      </View>

      <View style={styles.contextRow}>
        <View style={styles.countryPill}>
          <Feather name="map-pin" size={13} color={Colors.accentTertiary} />
          <Text numberOfLines={1} style={styles.countryText}>
            {countryLabel}
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MarketStatTile
          label="Average Salary"
          value={salaryText}
          meta={hasSalary && market?.currency
            ? `${market.currency} annual · ~${formatCurrencyValue(Number(market.avg_salary) / 12, market.currency)}/mo`
            : undefined}
          tone="salary"
          compact
          style={styles.salaryTile}
        />
        <MarketStatTile
          label="Job Demand"
          value={demandText}
          meta={hasDemand ? "Live openings" : undefined}
          tone="demand"
          compact
          style={styles.demandTile}
        />
      </View>

      {(sourceLabel || freshnessLabel || market?.salary_collected_at || market?.demand_collected_at) && (
        <View style={styles.infoStrip}>
          {sourceLabel && (
            <View style={styles.infoItem}>
              <Feather name="database" size={13} color={Colors.textTertiary} />
              <Text numberOfLines={1} style={styles.infoText}>
                {`Source: ${sourceLabel}`}
              </Text>
            </View>
          )}
          {(freshnessLabel || market?.salary_collected_at || market?.demand_collected_at) && (
            <View style={styles.infoItem}>
              <Feather name="clock" size={13} color={Colors.textTertiary} />
              <Text numberOfLines={1} style={styles.infoText}>
                {freshnessLabel ||
                  `Updated ${formatCollectedAt(market?.salary_collected_at || market?.demand_collected_at)}`}
              </Text>
            </View>
          )}
        </View>
      )}

      <AppButton
        label="View Details"
        onPress={onPressDetails}
        trailing={<Feather name="arrow-right" size={15} color={Colors.textInverse} />}
        style={styles.button}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 7,
  },
  titleBlock: {
    gap: 6,
  },
  countryText: {
    flexShrink: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.85,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  countryPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contextHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricsGrid: {
    gap: 8,
  },
  salaryTile: {
    shadowOpacity: 0,
    elevation: 0,
  },
  demandTile: {
    backgroundColor: "#FBFCFE",
  },
  infoStrip: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Newsreader_400Regular",
  },
  button: {
    minHeight: 54,
    borderRadius: 20,
  },
});
