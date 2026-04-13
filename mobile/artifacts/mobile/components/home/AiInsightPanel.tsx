import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";

type AiInsightPanelProps = {
  insight: string;
  model: string | null;
  generatedAt: string | null;
};

function formatGeneratedAt(value: string | null) {
  if (!value) return "Updated just now";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Updated just now";

  return `Updated ${parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function AiInsightPanel({ insight, model, generatedAt }: AiInsightPanelProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Strategic AI insight</Text>
      <Text style={styles.insight}>{insight}</Text>
      <View style={styles.footer}>
        <Text style={styles.metaText}>{model || "Local model"}</Text>
        <View style={styles.footerDot} />
        <Text style={styles.metaText}>{formatGeneratedAt(generatedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 24,
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  kicker: {
    color: alpha(Colors.background, 0.64),
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  insight: {
    color: Colors.background,
    fontFamily: "Newsreader_500Medium",
    fontSize: 22,
    letterSpacing: -0.35,
    lineHeight: 27,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  footerDot: {
    backgroundColor: alpha(Colors.background, 0.28),
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  metaText: {
    color: alpha(Colors.background, 0.58),
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
  },
});
