import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";

type MetricCardProps = {
  label: string;
  value: string | React.ReactNode;
  contextText?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function MetricCard({ label, value, contextText, children, style }: MetricCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        {typeof value === "string" ? <Text style={styles.value}>{value}</Text> : value}
      </View>
      {contextText ? <Text style={styles.context}>{contextText}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: AppTheme.radius.lg,
    padding: AppTheme.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...AppTheme.shadow.subtle,
  },
  label: {
    ...AppTheme.type.caption,
    color: Colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: AppTheme.spacing.xs,
  },
  valueContainer: {
    marginBottom: AppTheme.spacing.xs,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  context: {
    ...AppTheme.type.caption,
    color: Colors.textSecondary,
    marginBottom: AppTheme.spacing.sm,
  },
  content: {
    marginTop: AppTheme.spacing.sm,
  },
});
