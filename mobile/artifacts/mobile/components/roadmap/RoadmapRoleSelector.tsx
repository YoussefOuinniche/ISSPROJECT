import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { VisualRoadmap } from "@/lib/roadmap/roadmapTypes";

type RoadmapRoleSelectorProps = {
  roadmaps: VisualRoadmap[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RoadmapRoleSelector({
  roadmaps,
  selectedId,
  onSelect,
}: RoadmapRoleSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {roadmaps.map((roadmap) => {
        const isSelected = roadmap.id === selectedId;

        return (
          <Pressable
            key={roadmap.id}
            onPress={() => onSelect(roadmap.id)}
            style={({ pressed }) => [
              styles.rolePill,
              isSelected ? styles.rolePillSelected : styles.rolePillDefault,
              pressed && styles.rolePillPressed,
            ]}
          >
            <Text
              style={[
                styles.roleText,
                isSelected ? styles.roleTextSelected : styles.roleTextDefault,
              ]}
            >
              {roadmap.role}
            </Text>
            <View
              style={[
                styles.roleDot,
                { backgroundColor: isSelected ? "#101010" : Colors.accent },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 2,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rolePillDefault: {
    backgroundColor: Colors.backgroundSecondary,
    borderColor: Colors.border,
  },
  rolePillSelected: {
    backgroundColor: Colors.accentYellowSoft,
    borderColor: Colors.accentYellow,
  },
  rolePillPressed: {
    transform: [{ scale: 0.99 }],
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  roleTextDefault: {
    color: Colors.textPrimary,
  },
  roleTextSelected: {
    color: "#101010",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
