import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";
import type { AiRoleSnapshot } from "@/services/aiRoleSnapshot";

type SkillsClusterProps = {
  skills: AiRoleSnapshot["skills"];
};

const GROUPS = [
  {
    key: "core",
    label: "Core",
    variant: "solid" as const,
  },
  {
    key: "frequent",
    label: "Frequent",
    variant: "outline" as const,
  },
  {
    key: "bonus",
    label: "Bonus",
    variant: "soft" as const,
  },
] satisfies Array<{
  key: keyof AiRoleSnapshot["skills"];
  label: string;
  variant: "solid" | "outline" | "soft";
}>;

function SkillChip({ label, variant }: { label: string; variant: "solid" | "outline" | "soft" }) {
  return (
    <View
      style={[
        styles.chip,
        variant === "solid" && styles.chipSolid,
        variant === "outline" && styles.chipOutline,
        variant === "soft" && styles.chipSoft,
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          variant === "solid" && styles.chipLabelSolid,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function SkillsCluster({ skills }: SkillsClusterProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Skills intelligence</Text>
        <Text style={styles.sectionMeta}>Grouped signal, not a flat list</Text>
      </View>

      <View style={styles.groups}>
        {GROUPS.map((group, index) => {
          const items = skills[group.key] ?? [];
          return (
            <View key={group.key} style={styles.groupRow}>
              <View style={styles.markerColumn}>
                <View style={styles.markerDot} />
                {index < GROUPS.length - 1 ? <View style={styles.markerLine} /> : null}
              </View>
              <View style={styles.groupContent}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <Text style={styles.groupCount}>{items.length}</Text>
                </View>
                <View style={styles.chipWrap}>
                  {items.length > 0 ? (
                    items.map((item) => (
                      <SkillChip key={`${group.key}-${item}`} label={item} variant={group.variant} />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No signal returned for this cluster.</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    letterSpacing: -0.7,
    lineHeight: 28,
  },
  sectionMeta: {
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  groups: {
    gap: 12,
  },
  groupRow: {
    flexDirection: "row",
    gap: 14,
  },
  markerColumn: {
    alignItems: "center",
    width: 16,
  },
  markerDot: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 5,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  markerLine: {
    backgroundColor: Colors.border,
    flex: 1,
    marginTop: 6,
    width: 1,
  },
  groupContent: {
    borderBottomColor: Colors.borderLight,
    borderBottomWidth: 1,
    flex: 1,
    gap: 12,
    paddingBottom: 16,
  },
  groupHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  groupLabel: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  groupCount: {
    color: Colors.textTertiary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSolid: {
    backgroundColor: Colors.textPrimary,
  },
  chipOutline: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  chipSoft: {
    backgroundColor: alpha(Colors.textPrimary, 0.06),
  },
  chipLabel: {
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 16,
  },
  chipLabelSolid: {
    color: Colors.background,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
});
