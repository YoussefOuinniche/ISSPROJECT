import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";
import { AppSpacing, AppType } from "@/constants/theme";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({ eyebrow, title, subtitle, action, style }: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: AppSpacing.lg,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    ...AppType.caption,
    color: Colors.primary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: {
    ...AppType.screenTitle,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...AppType.body,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  action: {
    paddingTop: 4,
  },
});
