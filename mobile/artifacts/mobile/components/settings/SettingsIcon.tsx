import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing, alpha } from "@/constants/theme";

type SettingsIconProps = {
  name: React.ComponentProps<typeof Feather>["name"];
  color?: string;
};

export function SettingsIcon({ name, color = Colors.textPrimary }: SettingsIconProps) {
  return (
    <View style={[styles.wrap, { backgroundColor: alpha(color, 0.12) }]}>
      <Feather name={name} size={16} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 32,
    height: 32,
    borderRadius: AppRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    marginRight: AppSpacing.xs,
  },
});
