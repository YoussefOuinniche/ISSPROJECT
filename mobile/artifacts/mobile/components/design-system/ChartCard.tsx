import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ChartCard({ title, subtitle, children, style }: ChartCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.chartContainer}>{children}</View>
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
  header: {
    marginBottom: AppTheme.spacing.lg,
    gap: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...AppTheme.type.caption,
    color: Colors.textSecondary,
  },
  chartContainer: {
    width: "100%",
    alignItems: "stretch",
  },
});
