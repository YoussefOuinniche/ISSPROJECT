import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";

import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";
import type { AiRoleSnapshot } from "@/services/aiRoleSnapshot";

type RoleHeroProps = {
  snapshot: AiRoleSnapshot;
};

function RoleSignalGlyph({ snapshot }: RoleHeroProps) {
  const rankedCountries = useMemo(
    () =>
      [...snapshot.countries]
        .sort((left, right) => right.salary_score - left.salary_score)
        .slice(0, 4),
    [snapshot.countries]
  );

  return (
    <Svg height={118} viewBox="0 0 118 118" width={118}>
      <Circle cx={59} cy={59} fill="none" r={49} stroke={alpha(Colors.background, 0.18)} strokeWidth={1.25} />
      <Circle cx={59} cy={59} fill="none" r={35} stroke={alpha(Colors.background, 0.12)} strokeWidth={1} />
      <Line stroke={alpha(Colors.background, 0.16)} strokeWidth={1} x1={59} x2={59} y1={18} y2={100} />
      <Line stroke={alpha(Colors.background, 0.16)} strokeWidth={1} x1={18} x2={100} y1={59} y2={59} />
      {rankedCountries.map((country, index) => {
        const width = 12;
        const gap = 8;
        const left = 27 + index * (width + gap);
        const height = 18 + country.salary_score * 0.48;
        const top = 92 - height;
        return (
          <Rect
            fill={index === 0 ? Colors.background : alpha(Colors.background, 0.36)}
            height={height}
            key={country.name}
            rx={6}
            width={width}
            x={left}
            y={top}
          />
        );
      })}
      <Circle cx={59} cy={59} fill={Colors.background} opacity={0.14} r={11} />
      <Circle cx={59} cy={59} fill={Colors.background} r={3.5} />
    </Svg>
  );
}

function findLeadMarket(snapshot: AiRoleSnapshot) {
  return [...snapshot.countries].sort((left, right) => right.salary_score - left.salary_score)[0]?.name ?? "None";
}

function getHighDemandCount(snapshot: AiRoleSnapshot) {
  return snapshot.countries.filter((country) => ["very-high", "high", "medium-high"].includes(country.demand_level)).length;
}

export function RoleHero({ snapshot }: RoleHeroProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.copyColumn}>
          <Text style={styles.kicker}>AI role briefing</Text>
          <Text style={styles.role}>{snapshot.role}</Text>
          <Text style={styles.definition}>{snapshot.definition}</Text>
          <Text style={styles.summary}>{snapshot.summary}</Text>
        </View>
        <RoleSignalGlyph snapshot={snapshot} />
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Markets</Text>
          <Text style={styles.metricValue}>{snapshot.countries.length}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Top pay</Text>
          <Text numberOfLines={1} style={styles.metricValue}>
            {findLeadMarket(snapshot)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Strong demand</Text>
          <Text style={styles.metricValue}>{getHighDemandCount(snapshot)}</Text>
        </View>
      </View>

      {snapshot.meta.degraded ? (
        <Text style={styles.footnote}>Partial model output recovered. Pull to refresh for a cleaner pass.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  copyColumn: {
    flex: 1,
    gap: 8,
  },
  kicker: {
    color: alpha(Colors.background, 0.68),
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  role: {
    color: Colors.background,
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    letterSpacing: -1.3,
    lineHeight: 36,
  },
  definition: {
    color: alpha(Colors.background, 0.72),
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 19,
    maxWidth: 260,
  },
  summary: {
    color: alpha(Colors.background, 0.86),
    fontFamily: "Newsreader_400Regular",
    fontSize: 18,
    letterSpacing: -0.25,
    lineHeight: 24,
    maxWidth: 252,
  },
  metricRow: {
    alignItems: "stretch",
    borderTopColor: alpha(Colors.background, 0.12),
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
  },
  metricItem: {
    flex: 1,
    gap: 6,
  },
  metricLabel: {
    color: alpha(Colors.background, 0.58),
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  metricValue: {
    color: Colors.background,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 19,
  },
  metricDivider: {
    backgroundColor: alpha(Colors.background, 0.12),
    marginHorizontal: 14,
    width: 1,
  },
  footnote: {
    color: alpha(Colors.background, 0.54),
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 16,
  },
});
