import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";
import { AppTheme } from "@/constants/theme";

type LabelVariant = "default" | "success" | "warning" | "danger" | "accent";

type LabelProps = {
  text: string;
  variant?: LabelVariant;
  style?: ViewStyle;
};

export function Label({ text, variant = "default", style }: LabelProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return { bg: Colors.successLight, text: Colors.success };
      case "warning":
        return { bg: Colors.warningLight, text: Colors.warning };
      case "danger":
        return { bg: Colors.dangerLight, text: Colors.danger };
      case "accent":
        return { bg: Colors.accentLight, text: Colors.accent };
      default:
        return { bg: Colors.backgroundSecondary, text: Colors.textSecondary };
    }
  };

  const { bg, text: textColor } = getVariantStyles();

  return (
    <View style={[styles.container, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.xs,
    borderRadius: AppTheme.radius.pill,
    alignSelf: "flex-start",
  },
  text: {
    ...AppTheme.type.caption,
    fontFamily: AppTheme.fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
