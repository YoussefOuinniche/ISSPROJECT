import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "accent" | "accentTertiary";

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
};

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: Colors.primaryLight, text: Colors.primaryDark, border: Colors.primary + "40" },
  success: { bg: Colors.successLight, text: Colors.success, border: Colors.success + "40" },
  warning: { bg: Colors.warningLight, text: "#B45309", border: Colors.warning + "40" },
  danger: { bg: Colors.dangerLight, text: Colors.danger, border: Colors.danger + "40" },
  neutral: { bg: Colors.backgroundSecondary, text: Colors.textSecondary, border: Colors.border },
  accent: { bg: Colors.accentLight, text: Colors.accent, border: Colors.accent + "40" },
  accentTertiary: { bg: Colors.accentTertiaryLight, text: Colors.accentTertiary, border: Colors.accentTertiary + "40" },
};

export function Badge({ label, variant = "neutral", size = "sm", style }: BadgeProps) {
  const v = VARIANT_STYLES[variant];
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: v.text,
            fontSize: isSmall ? 11 : 13,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
