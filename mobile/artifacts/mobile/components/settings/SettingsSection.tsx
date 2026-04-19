import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing } from "@/constants/theme";

type SettingsSectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SettingsSection({ title, subtitle, children, style }: SettingsSectionProps) {
  return (
    <View style={style}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.1,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginBottom: AppSpacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: AppSpacing.lg,
  },
});
