import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";
import { MetricCard } from "@/components/design-system/MetricCard";
import { formatCurrencyValue } from "@/lib/marketFormat";

type SalaryMarketIndicatorProps = {
  hasSalary: boolean;
  salaryValue: string | null;
  averageSalary: number | null | undefined;
  salaryReferenceValues?: number[];
  currencyCode?: string | null;
  countryLabel: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFallbackSignalPercent(rawSalary: number | null | undefined) {
  const salary = Number(rawSalary);
  if (!Number.isFinite(salary) || salary <= 0) return 0;
  const normalized = Math.log10(salary + 1) / Math.log10(400000 + 1);
  return clamp(Math.round(normalized * 100), 12, 88);
}

function getRelativeSignalPercent(rawSalary: number | null | undefined, referenceValues: number[]) {
  const salary = Number(rawSalary);
  const values = (Array.isArray(referenceValues) ? referenceValues : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!Number.isFinite(salary) || salary <= 0) return 0;
  if (values.length < 2) return getFallbackSignalPercent(salary);

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  if (maxValue <= minValue) return getFallbackSignalPercent(salary);

  const normalized = (salary - minValue) / (maxValue - minValue);
  return clamp(Math.round(normalized * 100), 8, 92);
}

export function SalaryMarketIndicator({
  hasSalary,
  salaryValue,
  averageSalary,
  salaryReferenceValues,
  currencyCode,
  countryLabel,
}: SalaryMarketIndicatorProps) {
  const signalPercent = hasSalary ? getRelativeSignalPercent(averageSalary, salaryReferenceValues || []) : 0;
  const monthlySalary = hasSalary && Number.isFinite(Number(averageSalary)) && Number(averageSalary) > 0
    ? formatCurrencyValue(Number(averageSalary) / 12, currencyCode)
    : null;

  return (
    <MetricCard
      label={`Average salary per year in ${countryLabel}`}
      value={hasSalary && salaryValue ? salaryValue : "Data not available"}
      contextText={currencyCode ? `Currency: ${currencyCode}` : "Currency: Not available"}
    >
      <View style={styles.scaleWrap}>
        <View style={styles.scaleTrack}>
          <View style={styles.segmentActive} />
          {hasSalary ? <View style={[styles.marker, { left: `${signalPercent}%` }]} /> : null}
        </View>
      </View>
      {monthlySalary && (
        <View style={styles.monthlyRow}>
          <Text style={styles.monthlyLabel}>Est. monthly</Text>
          <Text style={styles.monthlyValue}>~{monthlySalary}/mo</Text>
        </View>
      )}
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  scaleWrap: {
    gap: AppTheme.spacing.xs,
    marginTop: AppTheme.spacing.md,
  },
  scaleTrack: {
    height: 12,
    borderRadius: AppTheme.radius.pill,
    overflow: "hidden",
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    position: "relative",
  },
  segmentActive: { 
    flex: 1,
    backgroundColor: Colors.border,
  },
  marker: {
    position: "absolute",
    top: -4,
    marginLeft: -4,
    width: 8,
    height: 20,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: Colors.textPrimary,
  },
  monthlyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: AppTheme.spacing.sm,
    paddingTop: AppTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  monthlyLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthlyValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
});
