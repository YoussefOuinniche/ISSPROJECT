import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import { getBottomContentPadding } from "@/lib/layout";

const modules = [
  { name: "Dashboard", icon: "grid", hint: "Executive snapshot" },
  { name: "Analytics", icon: "bar-chart-2", hint: "Market and user KPIs" },
  { name: "Content", icon: "file-text", hint: "Learning content curation" },
  { name: "Users", icon: "users", hint: "Roles and access control" },
  { name: "Profile", icon: "user", hint: "Admin identity" },
  { name: "Settings", icon: "settings", hint: "Platform preferences" },
];

export default function AdminConceptScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: (Platform.OS === "web" ? insets.top + 67 : insets.top + 16),
        paddingBottom: getBottomContentPadding(insets.bottom),
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Admin Overview</Text>
        <View style={{ width: 36 }} />
      </View>

      <LinearGradient
        colors={["#0E163A", "#1F2D68"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>SkillPulse Command Center</Text>
        <Text style={styles.heroSub}>Concept map of your local admin web modules in mobile-first cards.</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <GlassCard style={styles.stat} padding={14} radius={16}>
          <Text style={styles.statLabel}>Active Users</Text>
          <Text style={styles.statValue}>1,284</Text>
        </GlassCard>
        <GlassCard style={styles.stat} padding={14} radius={16}>
          <Text style={styles.statLabel}>Skill Gaps</Text>
          <Text style={styles.statValue}>372</Text>
        </GlassCard>
        <GlassCard style={styles.stat} padding={14} radius={16}>
          <Text style={styles.statLabel}>Trend Alerts</Text>
          <Text style={styles.statValue}>12</Text>
        </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>Local Module Mapping</Text>
      <View style={styles.grid}>
        {modules.map((item) => (
          <GlassCard key={item.name} style={styles.module} padding={14} radius={16}>
            <View style={styles.moduleIcon}>
              <Feather name={item.icon as any} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.moduleName}>{item.name}</Text>
            <Text style={styles.moduleHint}>{item.hint}</Text>
          </GlassCard>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    color: Colors.textPrimary,
  },
  hero: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: {
    color: "#F5F8FF",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 6,
  },
  heroSub: {
    color: "rgba(230,236,255,0.86)",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  statValue: {
    marginTop: 4,
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    fontSize: 16,
    marginBottom: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  module: {
    width: "48%",
  },
  moduleIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    marginBottom: 8,
  },
  moduleName: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  moduleHint: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
});
