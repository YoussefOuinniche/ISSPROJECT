import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { VisualRoadmapNode as VisualRoadmapNodeShape } from "@/lib/roadmap/roadmapTypes";
import {
  getVisualRoadmapNodeSize,
} from "@/lib/roadmap/roadmapValidation";

const ROADMAP_BORDER = "#101010";
const SECTION_BACKGROUND = Colors.accentYellow;
const SKILL_BACKGROUND = Colors.accentYellowSoft;

export function getRoadmapNodeSize(type: VisualRoadmapNodeShape["type"]) {
  return getVisualRoadmapNodeSize(type);
}

type VisualRoadmapNodeProps = {
  node: VisualRoadmapNodeShape;
  onPress?: (node: VisualRoadmapNodeShape) => void;
};

function VisualRoadmapNodeComponent({ node, onPress }: VisualRoadmapNodeProps) {
  const size = getRoadmapNodeSize(node.type);
  const left = node.x - size.width / 2;
  const top = node.y - size.height / 2;
  const isSection = node.type === "section";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={node.title}
      onPress={() => onPress?.(node)}
      style={({ pressed }) => [
        styles.base,
        {
          left,
          top,
          width: size.width,
          minHeight: size.height,
          backgroundColor: isSection ? SECTION_BACKGROUND : SKILL_BACKGROUND,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.typePill}>
        <Text style={styles.typePillText}>{isSection ? "Section" : "Skill"}</Text>
      </View>
      <Text style={[styles.title, isSection ? styles.sectionTitle : styles.skillTitle]} numberOfLines={3}>
        {node.title}
      </Text>
      {isSection && node.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {node.description}
        </Text>
      ) : null}
      {!isSection && node.estimatedTime ? (
        <Text style={styles.metaText} numberOfLines={1}>
          {node.estimatedTime}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const VisualRoadmapNode = memo(VisualRoadmapNodeComponent);

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    borderWidth: 2,
    borderColor: ROADMAP_BORDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "space-between",
    shadowColor: "rgba(16,16,16,0.10)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  typePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,16,16,0.24)",
    backgroundColor: Colors.accentYellowMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  typePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#101010",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  title: {
    color: "#101010",
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Inter_700Bold",
  },
  skillTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Inter_600SemiBold",
  },
  description: {
    marginTop: 8,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "Newsreader_500Medium",
    color: "rgba(16,16,16,0.76)",
  },
  metaText: {
    marginTop: 8,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(16,16,16,0.66)",
  },
});
