import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import Colors from "@/constants/colors";
import { AppRadius, AppSpacing, alpha } from "@/constants/theme";

type ProfileSummaryCardProps = {
  fullName: string;
  title: string;
  email: string;
  summary?: string;
  chips?: string[];
};

export function ProfileSummaryCard({
  fullName,
  title,
  email,
  summary,
  chips = [],
}: ProfileSummaryCardProps) {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "NP"}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Badge key={chip} label={chip} variant="neutral" size="sm" />
          ))}
        </View>
      ) : null}

      {summary ? <Text style={styles.summary}>{summary}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xl,
    gap: AppSpacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppSpacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: alpha(Colors.accentTertiary, 0.08),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    color: Colors.accentTertiary,
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  email: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppSpacing.sm,
  },
  summary: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
});
