import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type DemandSignalChartProps = {
  hasDemand: boolean;
  demandCount: number | null | undefined;
  demandReferenceValues?: number[];
  demandValue: string | null;
  explanation: string;
};

const BASE_BAR_HEIGHTS = [18, 26, 36, 48, 58, 70];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackDemandScore(rawCount: number | null | undefined) {
  const count = Number(rawCount);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  const normalized = Math.log10(count + 1) / Math.log10(5000 + 1);
  return clamp(Math.round(normalized * 100), 1, 100);
}

function getRelativeDemandScore(rawCount: number | null | undefined, referenceValues: number[]) {
  const count = Number(rawCount);
  const values = (Array.isArray(referenceValues) ? referenceValues : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  if (values.length < 2) {
    return getFallbackDemandScore(count);
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (maxValue <= minValue) {
    return getFallbackDemandScore(count);
  }

  const normalized = (count - minValue) / (maxValue - minValue);
  return clamp(Math.round(normalized * 100), 4, 100);
}

function buildDemandBars(score: number, hasDemand: boolean) {
  if (!hasDemand || score <= 0) {
    return BASE_BAR_HEIGHTS.map((height) => ({
      height: Math.max(12, Math.round(height * 0.32)),
      active: false,
    }));
  }

  const intensity = score / 100;
  const phaseShift = (score % 9) / 100;

  return BASE_BAR_HEIGHTS.map((height, index) => {
    const wave = 0.82 + Math.sin((index + 1 + phaseShift) * 0.68) * 0.16;
    const dynamicHeight = Math.round(height * (0.35 + intensity * wave));
    const minHeight = 14;
    const maxHeight = 84;
    const clampedHeight = clamp(dynamicHeight, minHeight, maxHeight);
    const threshold = (index + 1) / BASE_BAR_HEIGHTS.length;
    const active = intensity >= threshold * 0.92;

    return {
      height: clampedHeight,
      active,
    };
  });
}

function getDemandLevelLabel(score: number) {
  if (score >= 67) {
    return "High";
  }

  if (score >= 34) {
    return "Moderate";
  }

  return "Early";
}

export function DemandSignalChart({
  hasDemand,
  demandCount,
  demandReferenceValues,
  demandValue,
  explanation,
}: DemandSignalChartProps) {
  const score = hasDemand
    ? getRelativeDemandScore(demandCount, demandReferenceValues || [])
    : 0;
  const bars = buildDemandBars(score, hasDemand);
  const levelLabel = getDemandLevelLabel(score);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Market demand</Text>
      {hasDemand && demandValue ? (
        <Text style={styles.value}>{`${demandValue} openings`}</Text>
      ) : (
        <Text style={styles.unavailable}>Demand data is not available yet for this market</Text>
      )}
      {hasDemand ? <Text style={styles.meta}>{`Demand intensity: ${levelLabel}`}</Text> : null}

      <View style={styles.chartWrap}>
        <View style={styles.barsRow}>
          {bars.map((bar, index) => {
            return (
              <View
                key={`demand-bar-${index}`}
                style={[
                  styles.bar,
                  { height: bar.height },
                  bar.active ? styles.barActive : styles.barInactive,
                ]}
              />
            );
          })}
        </View>

        <View style={styles.axisRow}>
          <Text style={styles.axisText}>Lower activity</Text>
          <Text style={styles.axisText}>Higher activity</Text>
        </View>
      </View>

      <Text style={styles.helperLabel}>Demand strength indicator</Text>
      <Text style={styles.description}>{explanation}</Text>
      <Text style={styles.disclaimer}>
        Visualization represents current demand intensity from a single market snapshot.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  kicker: {
    color: Colors.textTertiary,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    fontFamily: "Inter_700Bold",
  },
  unavailable: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_500Medium",
  },
  meta: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold",
  },
  chartWrap: {
    marginTop: 6,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  barsRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
  },
  barActive: {
    backgroundColor: Colors.accentTertiary,
  },
  barInactive: {
    backgroundColor: "#DCE6F7",
  },
  axisRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  axisText: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  helperLabel: {
    marginTop: 4,
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
  },
  disclaimer: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Newsreader_400Regular",
  },
});
