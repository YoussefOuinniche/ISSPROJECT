import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";
import { MetricCard } from "@/components/design-system/MetricCard";

type DemandSignalChartProps = {
  hasDemand: boolean;
  demandCount: number | null | undefined;
  demandReferenceValues?: number[];
  demandValue: string | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackDemandScore(rawCount: number | null | undefined) {
  const count = Number(rawCount);
  if (!Number.isFinite(count) || count <= 0) return 0;
  const normalized = Math.log10(count + 1) / Math.log10(5000 + 1);
  return clamp(Math.round(normalized * 100), 1, 100);
}

function getRelativeDemandScore(rawCount: number | null | undefined, referenceValues: number[]) {
  const count = Number(rawCount);
  const values = (Array.isArray(referenceValues) ? referenceValues : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(count) || count <= 0) return 0;
  if (values.length < 2) return getFallbackDemandScore(count);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (maxValue <= minValue) return getFallbackDemandScore(count);

  const normalized = (count - minValue) / (maxValue - minValue);
  return clamp(Math.round(normalized * 100), 4, 100);
}

function getDemandExplanation(score: number): string {
  if (score >= 67) {
    return "Market demand appears very strong, indicating a high volume of active opportunities.";
  }
  if (score >= 34) {
    return "Market demand is present and steady, showing moderate hiring activity.";
  }
  return "Market demand is currently limited, with fewer active opportunities detected.";
}

export function DemandSignalChart({
  hasDemand,
  demandCount,
  demandReferenceValues,
  demandValue,
}: DemandSignalChartProps) {
  const score = hasDemand ? getRelativeDemandScore(demandCount, demandReferenceValues || []) : 0;
  const explanation = hasDemand ? getDemandExplanation(score) : "Demand data is not available yet for this market.";

  return (
    <MetricCard 
      label="Market Demand" 
      value={hasDemand && demandValue ? `${demandValue} openings` : "Not available"}
    >
      <Text style={styles.description}>{explanation}</Text>
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  description: {
    ...AppTheme.type.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
