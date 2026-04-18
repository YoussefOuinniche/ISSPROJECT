import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";

type SectionContainerProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function SectionContainer({ title, subtitle, children, style }: SectionContainerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: AppTheme.spacing.xl,
  },
  header: {
    marginBottom: AppTheme.spacing.md,
    gap: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...AppTheme.type.body,
    color: Colors.textSecondary,
    fontFamily: AppTheme.fonts.medium,
  },
  content: {
    gap: AppTheme.spacing.md,
  },
});
