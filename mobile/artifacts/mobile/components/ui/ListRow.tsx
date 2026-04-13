import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { AppTheme, AppSpacing, AppType } from "@/constants/theme";

type ListRowProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
  accent?: "default" | "danger" | "success";
};

const ACCENT_COLORS = {
  default: Colors.textPrimary,
  danger: Colors.danger,
  success: Colors.success,
} as const;

export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  divider = true,
  accent = "default",
}: ListRowProps) {
  const content = (
    <View style={[styles.row, divider && styles.rowDivider]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: ACCENT_COLORS[accent] }]}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.trailing}>
        {trailing || (onPress ? <Feather name="chevron-right" size={16} color={Colors.textTertiary} /> : null)}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable style={({ pressed }) => [pressed && styles.pressed]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: AppSpacing.md,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: AppTheme.hairline,
    borderBottomColor: Colors.border,
  },
  leading: {
    width: 34,
    paddingTop: 2,
    alignItems: "center",
  },
  copy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: AppSpacing.sm,
  },
  title: {
    ...AppType.label,
    flex: 1,
  },
  meta: {
    ...AppType.caption,
    color: Colors.textTertiary,
  },
  subtitle: {
    ...AppType.body,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  trailing: {
    minWidth: 16,
    alignItems: "flex-end",
    paddingTop: 4,
  },
  pressed: {
    opacity: 0.85,
  },
});
