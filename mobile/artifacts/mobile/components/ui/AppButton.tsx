import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing } from "@/constants/theme";

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
    backgroundColor: Colors.accentTertiary,
    borderColor: Colors.accentTertiary,
    textColor: Colors.background,
  },
  accent: {
    backgroundColor: Colors.accentTertiary,
    borderColor: Colors.accentTertiary,
    textColor: Colors.background,
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
  const isGradient = variant === "primary" || variant === "accent";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        !isGradient && {
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
        },
        isGradient && {
          borderColor: "transparent",
          backgroundColor: "transparent",
        },
        { opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        variant === "ghost" && styles.ghost,
        style,
        { overflow: "hidden" }
      ]}
    >
      {isGradient && (
        <LinearGradient
          colors={Colors.gradientAccentTertiary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {leading ? <View style={styles.iconWrap}>{leading}</View> : null}
      <Text style={[styles.label, { color: variantStyle.textColor, zIndex: 1 }]}>{label}</Text>
      {trailing ? <View style={styles.iconWrap}>{trailing}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: AppRadius.lg,
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
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
