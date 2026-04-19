import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetCurrentUser,
  useGetUserDashboard,
  useLogoutAuth,
} from "@workspace/api-client-react";

import { MotionPressable } from "@/components/MotionPressable";
import { ProfileSummaryCard } from "@/components/profile/ProfileSummaryCard";
import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ListRow } from "@/components/ui/ListRow";
import { Badge } from "@/components/ui/Badge";
import Colors from "@/constants/colors";
import { AppType } from "@/constants/theme";
import { useAIProfile } from "@/hooks/useAIProfile";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { getExperienceLabel, parseStructuredProfileFields } from "@/lib/profileSettings";

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 18,
        backgroundColor: Colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: Colors.border,
      }}
    >
      <Text style={[AppType.caption, { color: Colors.textTertiary }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();
  const [signingOut, setSigningOut] = useState(false);
  const { data: currentUserResponse } = useGetCurrentUser();
  const { data: dashboardResponse } = useGetUserDashboard();
  const { profile: aiProfile, summary: aiSummary } = useAIProfile();

  const currentUserEnvelope =
    currentUserResponse && typeof currentUserResponse === "object" && "data" in currentUserResponse
      ? (currentUserResponse.data as unknown as Record<string, unknown>)
      : {};

  const currentUser =
    currentUserEnvelope.user && typeof currentUserEnvelope.user === "object"
      ? (currentUserEnvelope.user as Record<string, unknown>)
      : {};

  const dashboard =
    dashboardResponse && typeof dashboardResponse === "object" && "data" in dashboardResponse
      ? (dashboardResponse.data as Record<string, unknown>)
      : {};

  const profile =
    dashboard.profile && typeof dashboard.profile === "object"
      ? (dashboard.profile as Record<string, unknown>)
      : {};

  const parsedBio = parseStructuredProfileFields(String(profile.bio ?? ""));
  const fullName = String(profile.full_name ?? currentUser.full_name ?? currentUser.email ?? "NexaPath User");
  const title = String(profile.title ?? "Career Builder");
  const email = String(currentUser.email ?? "No email available");
  const domain = String(profile.domain ?? "No domain selected");
  const targetRole =
    aiSummary?.top_goal ||
    parsedBio.targetRole ||
    (Array.isArray(aiProfile?.goals) && aiProfile.goals[0] ? String(aiProfile.goals[0]) : "Set your target role");

  const skills = Array.isArray(dashboard.skills)
    ? dashboard.skills
        .map((item) => (typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {}))
        .map((skill, index) => ({
          id: String(skill.id ?? `skill-${index}`),
          name: String(skill.name ?? skill.full_name ?? `Skill ${index + 1}`),
          level:
            typeof skill.proficiency_level === "number"
              ? skill.proficiency_level
              : typeof skill.level === "number"
                ? skill.level
                : 0,
        }))
    : [];

  const topSkills = skills.slice(0, 3).map((skill) => skill.name);
  const profileScore = computeProfileCompleteness(profile, skills);

  const onSignOut = async () => {
    try {
      setSigningOut(true);
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // Remote logout should not block clearing the local session.
      }

      await clearMobileAccessToken();
      queryClient.clear();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SettingsScreenShell
      title="Profile"
      showBackButton={false}
      hasTabBar
      contentStyle={{ paddingTop: insets.top + 12 }}
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <ProfileSummaryCard
        fullName={fullName}
        title={title}
        email={email}
        summary={parsedBio.bio || "Add a short summary to give your profile a stronger first impression."}
        chips={[domain, `${skills.length} skills tracked`, getExperienceLabel(String(profile.experience_level ?? profile.experienceLevel ?? "junior"))]}
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatBlock label="Profile completeness" value={`${profileScore}%`} />
        <StatBlock label="Target role" value={targetRole} />
      </View>

      <View style={styles.actionRow}>
        <MotionPressable
          containerStyle={[styles.primaryButton, { overflow: "hidden" }]}
          onPress={() => router.push("/recommendations")}
        >
          <LinearGradient
            colors={Colors.gradientAccentTertiary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.primaryButtonText, { zIndex: 1 }]}>View Recommendations</Text>
        </MotionPressable>

        <MotionPressable
          containerStyle={styles.secondaryButton}
          onPress={() => router.push("/settings")}
        >
          <Text style={styles.secondaryButtonText}>Manage Settings</Text>
        </MotionPressable>
      </View>

      <SettingsSection title="Profile details">
        <ListRow
          title="Personal information"
          subtitle="Name and primary email."
          leading={<SettingsIcon name="user" color={Colors.accentTertiary} />}
          onPress={() => router.push("/settings/account")}
        />
        <ListRow
          title="Career profile"
          subtitle="Role, domain, bio, location, and goals."
          leading={<SettingsIcon name="briefcase" color={Colors.accent} />}
          onPress={() => router.push("/settings/career")}
        />
        <ListRow
          title="Skills"
          subtitle="Track skills that shape recommendations and analysis."
          leading={<SettingsIcon name="layers" color={Colors.success} />}
          onPress={() => router.push("/settings/skills")}
          divider={false}
        />
      </SettingsSection>

      <SettingsSection title="Career snapshot">
        <View style={{ paddingVertical: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {topSkills.length > 0 ? (
              topSkills.map((skill) => <Badge key={skill} label={skill} variant="neutral" size="sm" />)
            ) : (
              <Text style={[AppType.body, { color: Colors.textSecondary }]}>
                No top skills yet. Add some from the skills screen.
              </Text>
            )}
          </View>
          <Text style={[AppType.body, { color: Colors.textSecondary }]}>
            {parsedBio.learningGoals
              ? `Current learning goals: ${parsedBio.learningGoals}`
              : "Set learning goals to make your profile and AI recommendations more specific."}
          </Text>
        </View>
      </SettingsSection>

      <MotionPressable
        containerStyle={styles.signOutButton}
        onPress={onSignOut}
        disabled={signingOut}
      >
        <Text style={styles.signOutButtonText}>
          {signingOut ? "Signing out..." : "Sign Out"}
        </Text>
      </MotionPressable>
    </SettingsScreenShell>
  );
}

const styles = StyleSheet.create({
  headerEyebrow: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.1,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
  statValue: {
    color: Colors.textPrimary,
    marginTop: 8,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  actionRow: {
    gap: 14,
  },
  primaryButton: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryButton: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  signOutButton: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger + "08",
  },
  signOutButtonText: {
    color: Colors.danger,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
