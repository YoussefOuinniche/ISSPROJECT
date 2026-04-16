import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  ROLE_ROADMAP_INDEX,
  getRoleRoadmapById,
  getRoleRoadmapByTitle,
} from "@/constants/roleRoadmaps";
import { getBottomContentPadding } from "@/lib/layout";

export default function LearnDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, role } = useLocalSearchParams<{ id?: string; role?: string }>();

  const roadmap = useMemo(() => {
    return (
      getRoleRoadmapById(String(id || "")) ||
      getRoleRoadmapByTitle(String(role || "")) ||
      ROLE_ROADMAP_INDEX[0]
    );
  }, [id, role]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0B1220", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroGradient}
      >
        <View
          style={[
            styles.heroContent,
            {
              paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
            },
          ]}
        >
          <View style={styles.heroNav}>
            <Pressable style={styles.heroButton} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color={Colors.background} />
            </Pressable>
          </View>

          <View style={styles.heroBadge}>
            <Feather name="map" size={14} color={Colors.background} />
            <Text style={styles.heroBadgeText}>Detailed Roadmap</Text>
          </View>

          <Text style={styles.heroTitle}>{roadmap.role}</Text>
          <Text style={styles.heroDescription}>{roadmap.definition}</Text>

          <View style={styles.heroMeta}>
            <Badge label={`${roadmap.stages.length} stages`} variant="neutral" size="sm" />
            <Badge label={roadmap.totalDuration} variant="neutral" size="sm" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.marketCard} padding={18} radius={18}>
          <Text style={styles.marketKicker}>Market Note</Text>
          <Text style={styles.marketText}>{roadmap.marketNote}</Text>
        </GlassCard>

        <Text style={styles.sectionTitle}>Roadmap Stages</Text>
        {roadmap.stages.map((stage, index) => (
          <GlassCard key={stage.id} style={styles.stageCard} padding={18} radius={18}>
            <View style={styles.stageHeader}>
              <View style={styles.stageIndex}>
                <Text style={styles.stageIndexText}>{index + 1}</Text>
              </View>
              <View style={styles.stageCopy}>
                <Text style={styles.stageTitle}>{stage.title}</Text>
                <Text style={styles.stageDuration}>{stage.duration}</Text>
              </View>
            </View>

            <Text style={styles.stageObjective}>{stage.objective}</Text>

            <Text style={styles.blockTitle}>Focus Skills</Text>
            <View style={styles.badgeRow}>
              {stage.skills.map((skill) => (
                <Badge key={`${stage.id}-${skill}`} label={skill} variant="primary" size="sm" />
              ))}
            </View>

            <Text style={styles.blockTitle}>Expected Outcomes</Text>
            <View style={styles.listWrap}>
              {stage.outcomes.map((outcome, outcomeIndex) => (
                <View key={`${stage.id}-outcome-${outcomeIndex}`} style={styles.listRow}>
                  <Feather name="check-circle" size={14} color={Colors.accentTertiary} />
                  <Text style={styles.listText}>{outcome}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.blockTitle}>Stage Deliverable</Text>
            <Text style={styles.deliverable}>{stage.deliverable}</Text>
          </GlassCard>
        ))}

        <Text style={styles.sectionTitle}>Tools & Technologies</Text>
        <View style={styles.toolWrap}>
          {roadmap.tools.map((tool) => (
            <View key={tool} style={styles.toolChip}>
              <Text style={styles.toolText}>{tool}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Portfolio Project Plan</Text>
        {roadmap.portfolioProjects.map((project, index) => (
          <GlassCard key={`${project}-${index}`} style={styles.projectCard} padding={16} radius={16}>
            <View style={styles.projectHeader}>
              <View style={styles.projectIcon}>
                <Feather name="briefcase" size={14} color={Colors.accentTertiary} />
              </View>
              <Text style={styles.projectTitle}>Project {index + 1}</Text>
            </View>
            <Text style={styles.projectText}>{project}</Text>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroGradient: {
    paddingBottom: 18,
  },
  heroContent: {
    paddingHorizontal: 20,
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.background,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
    letterSpacing: -1,
  },
  heroDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Newsreader_400Regular",
    color: "rgba(255,255,255,0.9)",
  },
  heroMeta: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  marketCard: {
    marginBottom: 14,
  },
  marketKicker: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accentTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  marketText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  stageCard: {
    marginBottom: 12,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  stageIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stageIndexText: {
    color: Colors.background,
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stageCopy: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  stageDuration: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  stageObjective: {
    marginBottom: 10,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  blockTitle: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listWrap: {
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  listText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  deliverable: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  toolWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  toolChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  toolText: {
    fontSize: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  projectCard: {
    marginBottom: 10,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  projectIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentTertiary + "18",
  },
  projectTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
  },
  projectText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_400Regular",
  },
});
