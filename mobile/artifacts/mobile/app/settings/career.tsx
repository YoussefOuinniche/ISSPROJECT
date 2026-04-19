import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  useGetUserProfile,
  useRecomputeUserProfileAnalysis,
  useUpsertUserProfilePut,
} from "@workspace/api-client-react";

import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppButton } from "@/components/ui/AppButton";
import { TextField } from "@/components/ui/TextField";
import Colors from "@/constants/colors";
import {
  buildStructuredProfileBio,
  normalizeExperienceLevel,
  parseStructuredProfileFields,
} from "@/lib/profileSettings";

export default function CareerSettingsScreen() {
  const queryClient = useQueryClient();
  const profileQuery = useGetUserProfile();
  const upsertProfile = useUpsertUserProfilePut();
  const recomputeAnalysis = useRecomputeUserProfileAnalysis();

  const [domain, setDomain] = useState("");
  const [title, setTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("junior");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const profileData =
    profileQuery.data && typeof profileQuery.data === "object" && "data" in profileQuery.data
      ? (profileQuery.data.data as Record<string, unknown>)
      : {};

  useEffect(() => {
    const parsed = parseStructuredProfileFields(String(profileData.bio ?? ""));

    setDomain(String(profileData.domain ?? ""));
    setTitle(String(profileData.title ?? ""));
    setExperienceLevel(normalizeExperienceLevel(String(profileData.experience_level ?? profileData.experienceLevel ?? "junior")));
    setBio(parsed.bio);
    setLocation(parsed.location);
    setTargetRole(parsed.targetRole);
    setLearningGoals(parsed.learningGoals);
    setPortfolioUrl(parsed.portfolioUrl);
  }, [profileData.bio, profileData.domain, profileData.experience_level, profileData.experienceLevel, profileData.title]);

  const onSave = async () => {
    setStatus(null);

    try {
      await upsertProfile.mutateAsync({
        data: {
          domain: domain.trim(),
          title: title.trim(),
          experienceLevel: normalizeExperienceLevel(experienceLevel),
          bio: buildStructuredProfileBio({
            bio,
            location,
            targetRole,
            learningGoals,
            portfolioUrl,
          }),
        },
      });
      await profileQuery.refetch();
      await queryClient.invalidateQueries();
      setStatus("Career profile updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update career profile.");
    }
  };

  const onRefreshInsights = async () => {
    setStatus(null);

    try {
      await recomputeAnalysis.mutateAsync({ data: {} });
      await profileQuery.refetch();
      await queryClient.invalidateQueries();
      setStatus("AI insights refreshed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh AI insights.");
    }
  };

  return (
    <SettingsScreenShell
      eyebrow="Profile"
      title="Career profile"
      subtitle="This is the structured profile data that powers recommendations, AI context, and profile completeness."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Core career identity">
        <View style={styles.sectionBody}>
          <TextField label="Domain" value={domain} onChangeText={setDomain} placeholder="Data science" />
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Product analyst" />
          <TextField
            label="Experience level"
            value={experienceLevel}
            onChangeText={setExperienceLevel}
            autoCapitalize="none"
            placeholder="student, junior, mid, senior"
            hint="The backend accepts: student, junior, mid, or senior."
          />
          <TextField
            label="Short bio"
            value={bio}
            onChangeText={setBio}
            placeholder="A concise summary of your background and direction."
            multiline
            style={{ minHeight: 100, textAlignVertical: "top", paddingTop: 14 }}
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Goals and details">
        <View style={styles.sectionBody}>
          <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Paris, France" />
          <TextField label="Target role" value={targetRole} onChangeText={setTargetRole} placeholder="Senior data engineer" />
          <TextField
            label="Learning goals"
            value={learningGoals}
            onChangeText={setLearningGoals}
            placeholder="What you want to achieve in the next 3-6 months."
            multiline
            style={{ minHeight: 100, textAlignVertical: "top", paddingTop: 14 }}
          />
          <TextField
            label="Portfolio or LinkedIn"
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            autoCapitalize="none"
            placeholder="https://..."
          />
        </View>
      </SettingsSection>

      {status ? (
        <Text style={[styles.statusText, { color: status.includes("updated") || status.includes("refreshed") ? Colors.success : Colors.danger }]}>
          {status}
        </Text>
      ) : null}

      <AppButton
        label={upsertProfile.isPending ? "Saving..." : "Save career profile"}
        onPress={onSave}
        disabled={upsertProfile.isPending}
      />
      <AppButton
        label={recomputeAnalysis.isPending ? "Refreshing..." : "Refresh AI insights"}
        variant="secondary"
        onPress={onRefreshInsights}
        disabled={recomputeAnalysis.isPending}
      />
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
  sectionBody: {
    paddingVertical: 18,
    gap: 16,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
