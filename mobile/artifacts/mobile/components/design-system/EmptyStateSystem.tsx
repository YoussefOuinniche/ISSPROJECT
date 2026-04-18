import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";

type EmptyStateSystemProps = {
  title: string;
  description: string;
  icon?: keyof typeof Feather.glyphMap;
  style?: ViewStyle;
};

export function EmptyStateSystem({ title, description, icon = "inbox", style }: EmptyStateSystemProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Feather name={icon} size={24} color={Colors.textTertiary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: AppTheme.spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AppTheme.spacing.md,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: AppTheme.spacing.xs,
    textAlign: "center",
  },
  description: {
    ...AppTheme.type.body,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: "80%",
  },
});
