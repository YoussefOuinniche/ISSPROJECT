import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing, AppType } from "@/constants/theme";

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "accent" | "secondary" | "ghost";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_STYLES = {
  primary: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
    textColor: Colors.textInverse,
  },
  accent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    textColor: Colors.textInverse,
  },
  secondary: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    textColor: Colors.textPrimary,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    textColor: Colors.textPrimary,
  },
} as const;

export function AppButton({
  label,
  onPress,
  disabled,
  variant = "primary",
  leading,
  trailing,
  style,
}: AppButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
        variant === "ghost" && styles.ghost,
        style,
      ]}
    >
      {leading ? <View style={styles.iconWrap}>{leading}</View> : null}
      <Text style={[styles.label, { color: variantStyle.textColor }]}>{label}</Text>
      {trailing ? <View style={styles.iconWrap}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: AppSpacing.sm,
  },
  ghost: {
    minHeight: 44,
    paddingHorizontal: 0,
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  label: {
    ...AppType.label,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
