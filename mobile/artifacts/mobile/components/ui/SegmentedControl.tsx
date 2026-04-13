import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing, AppType } from "@/constants/theme";

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              isActive && styles.segmentActive,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.backgroundSecondary,
    padding: 4,
    borderRadius: AppRadius.lg,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: AppRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: AppSpacing.md,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentPressed: {
    opacity: 0.84,
  },
  segmentText: {
    ...AppType.label,
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.textPrimary,
  },
});
