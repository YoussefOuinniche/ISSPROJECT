import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import Colors from "@/constants/colors";
import type { VisualRoadmapNode } from "@/lib/roadmap/roadmapTypes";

type VisualRoadmapDetailsModalProps = {
  visible: boolean;
  node: VisualRoadmapNode | null;
  onClose: () => void;
};

type DetailRowProps = {
  label: string;
  value?: string | null;
};

function DetailRow({ label, value }: DetailRowProps) {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function VisualRoadmapDetailsModal({
  visible,
  node,
  onClose,
}: VisualRoadmapDetailsModalProps) {
  const isSection = node?.type === "section";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheetWrap}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sheetHeader}>
              <Badge
                label={isSection ? "Section" : "Skill"}
                variant={isSection ? "accentYellow" : "neutral"}
                size="sm"
              />
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Feather name="x" size={18} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={styles.title}>{node?.title || "Roadmap item"}</Text>

            {isSection ? (
              <>
                <DetailRow label="Description" value={node?.description} />
                <DetailRow label="Notes" value={node?.explanation} />
                <DetailRow label="Estimated Time" value={node?.estimatedTime} />
              </>
            ) : (
              <>
                <DetailRow label="Explanation" value={node?.explanation} />
                <DetailRow label="Why It Matters" value={node?.whyItMatters} />
                <DetailRow label="Project Idea" value={node?.projectIdea} />
                <DetailRow label="Estimated Time" value={node?.estimatedTime} />
                <DetailRow label="Parent Section" value={node?.parent} />
              </>
            )}

            <AppButton label="Close" variant="secondary" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.42)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  sheet: {
    maxHeight: "78%",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sheetContent: {
    padding: 20,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: -0.7,
  },
  detailRow: {
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
});
