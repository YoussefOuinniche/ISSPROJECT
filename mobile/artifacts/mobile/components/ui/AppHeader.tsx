import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";
import { AppSpacing, AppType } from "@/constants/theme";

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  eyebrowStyle?: StyleProp<TextStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

export function AppHeader({
  eyebrow,
  title,
  subtitle,
  action,
  style,
  eyebrowStyle,
  titleStyle,
  subtitleStyle,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.copy}>
        {eyebrow ? <Text style={[styles.eyebrow, eyebrowStyle]}>{eyebrow}</Text> : null}
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
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
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  action: {
    paddingTop: 4,
  },
});
