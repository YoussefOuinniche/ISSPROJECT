import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import Colors from "@/constants/colors";

type MarketStatTileProps = {
  label: string;
  value: string;
  meta?: string | null;
  tone?: "salary" | "demand" | "neutral";
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const TONES = {
  salary: {
    backgroundColor: "#0F1D3A",
    borderColor: "#1E3A8A",
    labelColor: "rgba(255,255,255,0.68)",
    valueColor: Colors.background,
    metaColor: "rgba(255,255,255,0.82)",
  },
  demand: {
    backgroundColor: "#F8FAFC",
    borderColor: "#D7E2F2",
    labelColor: Colors.textTertiary,
    valueColor: Colors.textPrimary,
    metaColor: Colors.textSecondary,
  },
  neutral: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
    labelColor: Colors.textTertiary,
    valueColor: Colors.textPrimary,
    metaColor: Colors.textSecondary,
  },
} as const;

export function MarketStatTile({
  label,
  value,
  meta,
  tone = "neutral",
  style,
  compact = false,
}: MarketStatTileProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[
        styles.card,
        compact ? styles.compactCard : styles.defaultCard,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.labelColor }]}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={[styles.value, compact && styles.compactValue, { color: palette.valueColor }]}
      >
        {value}
      </Text>
      {meta ? <Text style={[styles.meta, { color: palette.metaColor }]}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
  },
  defaultCard: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 5,
  },
  compactCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },
  value: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    fontFamily: "Inter_700Bold",
  },
  compactValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Newsreader_500Medium",
  },
});
