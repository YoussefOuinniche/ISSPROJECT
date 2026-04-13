import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";
import type { AiRoleSnapshot, RoleSnapshotDemandLevel } from "@/services/aiRoleSnapshot";

type SalaryLandscapeProps = {
  countries: AiRoleSnapshot["countries"];
};

function getDemandValue(level: RoleSnapshotDemandLevel) {
  if (level === "very-high") return 5;
  if (level === "high") return 4;
  if (level === "medium-high") return 3;
  if (level === "medium") return 2;
  if (level === "medium-low") return 1;
  return 0;
}

function formatDemand(level: RoleSnapshotDemandLevel) {
  return level === "unknown" ? "Unclear" : level.replace(/-/g, " ");
}

function DemandDots({ level }: { level: RoleSnapshotDemandLevel }) {
  const activeCount = getDemandValue(level);
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={`${level}-${index}`}
          style={[styles.dot, index < activeCount ? styles.dotActive : styles.dotMuted]}
        />
      ))}
    </View>
  );
}

export function SalaryLandscape({ countries }: SalaryLandscapeProps) {
  const rankedCountries = useMemo(
    () => [...countries].sort((left, right) => right.salary_score - left.salary_score),
    [countries]
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Salary landscape</Text>
        <Text style={styles.sectionMeta}>Ranked by relative pay signal</Text>
      </View>

      <View style={styles.rows}>
        {rankedCountries.map((country, index) => (
          <View
            key={country.name}
            style={[styles.row, index < rankedCountries.length - 1 && styles.rowBorder]}
          >
            <Text style={styles.rank}>{String(index + 1).padStart(2, "0")}</Text>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.countryName}>{country.name}</Text>
                <Text style={styles.salaryEstimate}>{country.salary_estimate}</Text>
              </View>

              <View style={styles.rowBottom}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      index === 0 && styles.barFillLead,
                      { width: `${Math.max(14, country.salary_score)}%` },
                    ]}
                  />
                </View>

                <View style={styles.demandWrap}>
                  <DemandDots level={country.demand_level} />
                  <Text style={styles.demandText}>{formatDemand(country.demand_level)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    letterSpacing: -0.7,
    lineHeight: 28,
  },
  sectionMeta: {
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  rows: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomColor: Colors.borderLight,
    borderBottomWidth: 1,
  },
  rank: {
    color: Colors.textTertiary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
    width: 24,
  },
  rowBody: {
    flex: 1,
    gap: 10,
  },
  rowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  countryName: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  salaryEstimate: {
    color: Colors.textPrimary,
    fontFamily: "Newsreader_500Medium",
    fontSize: 17,
    lineHeight: 21,
  },
  rowBottom: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  barTrack: {
    backgroundColor: Colors.borderLight,
    borderRadius: 999,
    flex: 1,
    height: 9,
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: alpha(Colors.textPrimary, 0.62),
    borderRadius: 999,
    height: "100%",
  },
  barFillLead: {
    backgroundColor: Colors.textPrimary,
  },
  demandWrap: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 96,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: Colors.textPrimary,
  },
  dotMuted: {
    backgroundColor: alpha(Colors.textPrimary, 0.14),
  },
  demandText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
    textTransform: "capitalize",
  },
});
