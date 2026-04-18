import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { AnimatedSection } from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import { ROLE_ROADMAP_INDEX } from "@/constants/roleRoadmaps";
import { getBottomContentPadding } from "@/lib/layout";

function normalizeText(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoles = useMemo(() => {
    const query = normalizeText(searchQuery);

    return ROLE_ROADMAP_INDEX.filter((role) => {
      if (!query) return true;

      const haystack = normalizeText(
        `${role.role} ${role.definition} ${role.marketNote} ${role.tools.join(" ")}`
      );

      return haystack.includes(query);
    });
  }, [searchQuery]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedSection delay={20} style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={require("@/assets/images/logo-nexapath.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.screenTitle}>Roadmap Directory</Text>
            <Text style={styles.screenSub}>Search a role and open a structured roadmap.</Text>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection delay={40}>
        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by role, skill, or market note"
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.searchMeta}>{filteredRoles.length} roles found</Text>
        </View>
      </AnimatedSection>

      {filteredRoles.length === 0 ? (
        <AnimatedSection delay={60}>
          <GlassCard style={styles.emptyCard} padding={18} radius={18}>
            <Text style={styles.emptyTitle}>No matching role</Text>
            <Text style={styles.emptyText}>Try another keyword to find a roadmap role.</Text>
          </GlassCard>
        </AnimatedSection>
      ) : null}

      {filteredRoles.map((role, index) => (
        <AnimatedSection key={role.id} delay={70 + index * 22}>
          <GlassCard style={styles.roleCard} padding={18} radius={20}>
            <View style={styles.roleTop}>
              <View style={styles.roleIconWrap}>
                <Feather name="map" size={18} color={Colors.accentTertiary} />
              </View>
              <View style={styles.roleMain}>
                <Text style={styles.roleTitle}>{role.role}</Text>
                <Text style={styles.roleText}>{role.definition}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <Badge label={`${role.stages.length} stages`} variant="primary" size="sm" />
              <Badge label={role.totalDuration} variant="accentTertiary" size="sm" />
              <Badge label="Detailed roadmap" variant="success" size="sm" />
            </View>

            <View style={styles.skillRow}>
              {role.tools.slice(0, 4).map((skill) => (
                <Badge key={`${role.id}-${skill}`} label={skill} variant="neutral" size="sm" />
              ))}
            </View>

            <View style={styles.roleFooter}>
              <Text style={styles.marketNote}>{role.marketNote}</Text>
              <Pressable
                style={[styles.openButton, { overflow: "hidden" }]}
                onPress={() =>
                  router.push({
                    pathname: "/learn/[id]",
                    params: {
                      id: role.id,
                      role: role.role,
                    },
                  })
                }
              >
                <LinearGradient
                  colors={Colors.gradientAccentTertiary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.openButtonText, { zIndex: 1 }]}>Open Roadmap</Text>
                <Feather name="arrow-right" size={14} color={Colors.background} style={{ zIndex: 1 }} />
              </Pressable>
            </View>
          </GlassCard>
        </AnimatedSection>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 14,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  screenSub: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  searchCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    paddingVertical: 2,
  },
  searchMeta: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_400Regular",
  },
  roleCard: {
    marginBottom: 12,
  },
  roleTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  roleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 24,
    backgroundColor: Colors.accentTertiary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  roleMain: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  roleText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  badgeRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skillRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  roleFooter: {
    marginTop: 14,
    gap: 10,
  },
  marketNote: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  openButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 24,
    backgroundColor: Colors.accentTertiary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  openButtonText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.background,
  },
  emptyCard: {
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
});
