import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { alpha } from "@/constants/theme";
import type { AiRoleSnapshot } from "@/services/aiRoleSnapshot";

type ProjectStripProps = {
  projects: AiRoleSnapshot["projects"];
};

export function ProjectStrip({ projects }: ProjectStripProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Projects To Build</Text>
        <Text style={styles.sectionMeta}>{projects.length} generated directions</Text>
      </View>

      <View style={styles.list}>
        {projects.length > 0 ? (
          projects.map((project, index) => (
            <View
              key={project.title}
              style={[styles.row, index < projects.length - 1 && styles.rowBorder]}
            >
              <View style={styles.markerColumn}>
                <View style={styles.marker} />
                <Text style={styles.index}>{String(index + 1).padStart(2, "0")}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.title}>{project.title}</Text>
                <Text style={styles.description}>{project.description}</Text>
                <View style={styles.tagWrap}>
                  {project.tags.map((tag) => (
                    <View key={`${project.title}-${tag}`} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            Project patterns will appear after the next successful generation.
          </Text>
        )}
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
  list: {
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 15,
  },
  rowBorder: {
    borderBottomColor: Colors.borderLight,
    borderBottomWidth: 1,
  },
  markerColumn: {
    alignItems: "center",
    gap: 8,
    paddingTop: 5,
    width: 28,
  },
  marker: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 999,
    height: 8,
    opacity: 0.82,
    width: 8,
  },
  index: {
    color: alpha(Colors.textPrimary, 0.26),
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 14,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: "Newsreader_500Medium",
    fontSize: 19,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  description: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: alpha(Colors.textPrimary, 0.06),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 14,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    paddingTop: 14,
  },
});
