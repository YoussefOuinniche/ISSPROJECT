import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type SalaryMarketIndicatorProps = {
  hasSalary: boolean;
  salaryValue: string | null;
  averageSalary: number | null | undefined;
  salaryReferenceValues?: number[];
  currencyCode?: string | null;
  countryLabel: string;
  explanation: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackSignalPercent(rawSalary: number | null | undefined) {
  const salary = Number(rawSalary);
  if (!Number.isFinite(salary) || salary <= 0) {
    return 0;
  }

  // Fallback normalization when peer market values are unavailable.
  const normalized = Math.log10(salary + 1) / Math.log10(400000 + 1);
  return clamp(Math.round(normalized * 100), 12, 88);
}

function getRelativeSignalPercent(rawSalary: number | null | undefined, referenceValues: number[]) {
  const salary = Number(rawSalary);
  const values = (Array.isArray(referenceValues) ? referenceValues : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(salary) || salary <= 0) {
    return 0;
  }

  if (values.length < 2) {
    return getFallbackSignalPercent(salary);
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (maxValue <= minValue) {
    return getFallbackSignalPercent(salary);
  }

  const normalized = (salary - minValue) / (maxValue - minValue);
  return clamp(Math.round(normalized * 100), 8, 92);
}

function getSalaryLevelLabel(percent: number) {
  if (percent >= 67) {
    return "Higher market level";
  }

  if (percent >= 34) {
    return "Mid market level";
  }

  return "Entry market level";
}

export function SalaryMarketIndicator({
  hasSalary,
  salaryValue,
  averageSalary,
  salaryReferenceValues,
  currencyCode,
  countryLabel,
  explanation,
}: SalaryMarketIndicatorProps) {
  const signalPercent = hasSalary
    ? getRelativeSignalPercent(averageSalary, salaryReferenceValues || [])
    : 0;
  const salaryLevelLabel = getSalaryLevelLabel(signalPercent);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>Average market salary</Text>
      <Text style={styles.country}>{countryLabel}</Text>

      {hasSalary && salaryValue ? (
        <Text style={styles.value}>{salaryValue}</Text>
      ) : (
        <Text style={styles.unavailable}>Salary data is not available yet for this market</Text>
      )}

      <Text style={styles.meta}>
        {currencyCode ? `Currency: ${currencyCode}` : "Currency: Not available yet"}
      </Text>
      {hasSalary ? <Text style={styles.meta}>{`Market salary level: ${salaryLevelLabel}`}</Text> : null}

      <View style={styles.scaleWrap}>
        <View style={styles.scaleTrack}>
          <View style={[styles.segment, styles.segmentEntry]} />
          <View style={[styles.segment, styles.segmentMid]} />
          <View style={[styles.segment, styles.segmentSenior]} />
          {hasSalary ? <View style={[styles.marker, { left: `${signalPercent}%` }]} /> : null}
        </View>

        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>Entry</Text>
          <Text style={styles.scaleLabel}>Mid</Text>
          <Text style={styles.scaleLabel}>Senior</Text>
        </View>
      </View>

      <Text style={styles.helperLabel}>Market salary indicator</Text>
      <Text style={styles.description}>{explanation}</Text>
      <Text style={styles.disclaimer}>
        Visualized relative to a general career progression scale.
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
  country: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: "Inter_600SemiBold",
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.9,
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
  scaleWrap: {
    gap: 8,
    marginTop: 4,
  },
  scaleTrack: {
    height: 14,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    position: "relative",
  },
  segment: {
    flex: 1,
  },
  segmentEntry: {
    backgroundColor: "#DCE8FF",
  },
  segmentMid: {
    backgroundColor: "#9FB8F0",
  },
  segmentSenior: {
    backgroundColor: "#4E71C8",
  },
  marker: {
    position: "absolute",
    top: -3,
    marginLeft: -7,
    width: 14,
    height: 20,
    borderRadius: 8,
    backgroundColor: Colors.accentTertiary,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  scaleLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scaleLabel: {
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
