import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetCurrentUser,
  useGetUserProfile,
  useLogoutAuth,
  useRecomputeUserProfileAnalysis,
  useUpsertUserProfilePut,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import {
  addUserSkill,
  changePassword,
  deleteUserSkill,
  getSkillCatalog,
  getUserSkills,
  updateCurrentUserAccount,
  updateUserSkill,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
type ExperienceLevel = "student" | "junior" | "mid" | "senior";

function SettingLink({
  label,
  sublabel,
  icon,
  color = Colors.textSecondary,
  value,
}: {
  label: string;
  sublabel?: string;
  icon: string;
  color?: string;
  value?: string;
}) {
  return (
    <Pressable style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: color + "15" }]}>
        <Feather name={icon as any} size={17} color={color} />
      </View>
      <View style={styles.settingLabel}>
        <Text style={styles.settingText}>{label}</Text>
        {sublabel && <Text style={styles.settingSub}>{sublabel}</Text>}
      </View>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [title, setTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("junior");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, unknown>[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState<Proficiency>("beginner");
  const [selectedYears, setSelectedYears] = useState("0");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const currentUserQuery = useGetCurrentUser();
  const profileQuery = useGetUserProfile();
  const upsertProfile = useUpsertUserProfilePut();
  const recomputeAnalysis = useRecomputeUserProfileAnalysis();
  const logoutMutation = useLogoutAuth();

  const currentEnvelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};

  const currentUser =
    currentEnvelope.user && typeof currentEnvelope.user === "object"
      ? (currentEnvelope.user as Record<string, unknown>)
      : {};

  useEffect(() => {
    setFullName(String(currentUser.full_name ?? currentUser.fullName ?? ""));
    setEmail(String(currentUser.email ?? ""));
  }, [currentUser.full_name, currentUser.fullName, currentUser.email]);

  const profileData =
    profileQuery.data && typeof profileQuery.data === "object" && "data" in profileQuery.data
      ? (profileQuery.data.data as Record<string, unknown>)
      : {};

  useEffect(() => {
    setDomain(String(profileData.domain ?? ""));
    setTitle(String(profileData.title ?? ""));
    const normalizedExperience = String(
      profileData.experience_level ?? profileData.experienceLevel ?? "junior"
    ).toLowerCase();
    if (["student", "junior", "mid", "senior"].includes(normalizedExperience)) {
      setExperienceLevel(normalizedExperience as ExperienceLevel);
    }
    const rawBio = String(profileData.bio ?? "");
    setBio(rawBio);

    const locationMatch = rawBio.match(/Location:\s*(.+)/i);
    const targetRoleMatch = rawBio.match(/Target Role:\s*(.+)/i);
    const learningGoalsMatch = rawBio.match(/Learning Goals:\s*(.+)/i);
    const portfolioMatch = rawBio.match(/Portfolio:\s*(.+)/i);

    setLocation(locationMatch?.[1]?.trim() ?? "");
    setTargetRole(targetRoleMatch?.[1]?.trim() ?? "");
    setLearningGoals(learningGoalsMatch?.[1]?.trim() ?? "");
    setPortfolioUrl(portfolioMatch?.[1]?.trim() ?? "");
  }, [profileData.domain, profileData.title, profileData.experience_level, profileData.experienceLevel, profileData.bio]);

  const buildBioPayload = () => {
    const lines: string[] = [];

    if (bio.trim()) lines.push(bio.trim());
    if (location.trim()) lines.push(`Location: ${location.trim()}`);
    if (targetRole.trim()) lines.push(`Target Role: ${targetRole.trim()}`);
    if (learningGoals.trim()) lines.push(`Learning Goals: ${learningGoals.trim()}`);
    if (portfolioUrl.trim()) lines.push(`Portfolio: ${portfolioUrl.trim()}`);

    return lines.join("\n");
  };

  useEffect(() => {
    let mounted = true;
    getSkillCatalog()
      .then((rows) => {
        if (!mounted) return;
        setCatalog(rows);
      })
      .catch(() => undefined);

    getUserSkills()
      .then((rows) => {
        if (!mounted) return;
        setUserSkills(rows);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const onSaveProfile = async () => {
    setSaveStatus(null);
    try {
      if (!fullName.trim()) {
        setSaveStatus("Name is required.");
        return;
      }

      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        setSaveStatus("Please provide a valid email address.");
        return;
      }

      await updateCurrentUserAccount({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });

      await upsertProfile.mutateAsync({
        data: {
          domain,
          title,
          experienceLevel,
          bio: buildBioPayload(),
        },
      });
      await queryClient.invalidateQueries();
      await currentUserQuery.refetch();
      await profileQuery.refetch();
      setSaveStatus("Your account and profile have been updated.");
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Failed to save profile");
    }
  };

  const onRecompute = async () => {
    setSaveStatus(null);
    try {
      await recomputeAnalysis.mutateAsync({ data: {} });
      await profileQuery.refetch();
      await queryClient.invalidateQueries();
      setSaveStatus("Your AI insights have been refreshed.");
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Failed to run analysis");
    }
  };

  const onAddSkill = async () => {
    if (!selectedSkillId) {
      setSaveStatus("Select a skill to add.");
      return;
    }

    try {
      await addUserSkill({
        skillId: selectedSkillId,
        proficiencyLevel: selectedProficiency,
        yearsOfExperience: Math.max(0, Number(selectedYears) || 0),
      });
      setSaveStatus("Skill added to your profile.");
      setUserSkills(await getUserSkills());
      await queryClient.invalidateQueries();
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Unable to add skill");
    }
  };

  const onUpdateSkill = async (skill: Record<string, unknown>) => {
    const skillId = String(skill.skill_id ?? skill.skillId ?? "");
    if (!skillId) return;
    try {
      await updateUserSkill(skillId, {
        proficiencyLevel: String(skill.proficiency_level ?? "beginner") as Proficiency,
        yearsOfExperience: Number(skill.years_of_experience ?? 0),
      });
      setSaveStatus("Skill saved.");
      setUserSkills(await getUserSkills());
      await queryClient.invalidateQueries();
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Unable to update skill");
    }
  };

  const onRemoveSkill = async (skill: Record<string, unknown>) => {
    const skillId = String(skill.skill_id ?? skill.skillId ?? "");
    if (!skillId) return;
    try {
      await deleteUserSkill(skillId);
      setUserSkills(await getUserSkills());
      setSaveStatus("Skill removed.");
      await queryClient.invalidateQueries();
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Unable to remove skill");
    }
  };

  const onChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      setSaveStatus("Please fill in current and new password.");
      return;
    }
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setSaveStatus("Password changed successfully.");
      await queryClient.invalidateQueries();
    } catch (e: unknown) {
      setSaveStatus(e instanceof Error ? e.message : "Unable to change password");
    }
  };

  const onSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Clear session locally regardless of API response.
    }
    await clearMobileAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  return (
    <View style={[styles.container]}>
      {/* Header */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop:
              Platform.OS === "web"
                ? insets.top + 67
                : insets.top + 16,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeIn.duration(280)} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={styles.groupLabel}>Account</Text>
        <GlassCard style={styles.group} padding={16} radius={20}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={Colors.textTertiary}
          />
        </GlassCard>

        <Text style={styles.groupLabel}>Profile</Text>
        <GlassCard style={styles.group} padding={16} radius={20}>
          <Text style={styles.inputLabel}>Domain</Text>
          <TextInput
            style={styles.input}
            value={domain}
            onChangeText={setDomain}
            placeholder="e.g. Data Science"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Product Analyst"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Experience Level</Text>
          <TextInput
            style={styles.input}
            value={experienceLevel}
            onChangeText={(value) => {
              const normalized = value.toLowerCase();
              if (["student", "junior", "mid", "senior"].includes(normalized)) {
                setExperienceLevel(normalized as ExperienceLevel);
              }
            }}
            placeholder="e.g. mid"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.input, { minHeight: 82, textAlignVertical: "top", paddingTop: 10 }]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Share your focus, strengths, and goals"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Tunis, Tunisia"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Target Role</Text>
          <TextInput
            style={styles.input}
            value={targetRole}
            onChangeText={setTargetRole}
            placeholder="e.g. Senior Data Engineer"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Learning Goals</Text>
          <TextInput
            style={[styles.input, { minHeight: 82, textAlignVertical: "top", paddingTop: 10 }]}
            value={learningGoals}
            onChangeText={setLearningGoals}
            multiline
            placeholder="What do you want to achieve in the next 3-6 months?"
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.inputLabel}>Portfolio / LinkedIn URL</Text>
          <TextInput
            style={styles.input}
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            autoCapitalize="none"
            placeholder="https://..."
            placeholderTextColor={Colors.textTertiary}
          />

          <View style={styles.profileActionRow}>
            <AnimatedButton containerStyle={styles.profileActionBtnWrap} style={styles.primaryBtn} onPress={onSaveProfile}>
              <Feather name="save" size={15} color={Colors.background} />
              <Text style={styles.primaryBtnText}>Save Profile</Text>
            </AnimatedButton>
            <AnimatedButton containerStyle={styles.profileActionBtnWrap} style={styles.secondaryBtn} onPress={onRecompute}>
              <Feather name="refresh-cw" size={15} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Refresh AI Insights</Text>
            </AnimatedButton>
          </View>
        </GlassCard>

        <Text style={[styles.groupLabel, styles.skillsGroupLabel]}>Skills</Text>
        <GlassCard style={styles.group} padding={16} radius={20}>
          <Text style={styles.inputLabel}>Add a skill</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {catalog.slice(0, 40).map((row) => {
              const id = String(row.id ?? "");
              const isSelected = selectedSkillId === id;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.chip,
                    isSelected && { borderColor: Colors.primary, backgroundColor: Colors.primary + "15" },
                  ]}
                  onPress={() => setSelectedSkillId(id)}
                >
                  <Text style={[styles.chipText, isSelected && { color: Colors.primary }]}>{String(row.name ?? "Skill")}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.chip, selectedProficiency === "beginner" && styles.chipPrimary]}
              onPress={() => setSelectedProficiency("beginner")}
            >
              <Text style={[styles.chipText, selectedProficiency === "beginner" && styles.chipTextPrimary]}>Beginner</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, selectedProficiency === "intermediate" && styles.chipPrimary]}
              onPress={() => setSelectedProficiency("intermediate")}
            >
              <Text style={[styles.chipText, selectedProficiency === "intermediate" && styles.chipTextPrimary]}>Intermediate</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, selectedProficiency === "advanced" && styles.chipPrimary]}
              onPress={() => setSelectedProficiency("advanced")}
            >
              <Text style={[styles.chipText, selectedProficiency === "advanced" && styles.chipTextPrimary]}>Advanced</Text>
            </Pressable>
            <Pressable
              style={[styles.chip, selectedProficiency === "expert" && styles.chipPrimary]}
              onPress={() => setSelectedProficiency("expert")}
            >
              <Text style={[styles.chipText, selectedProficiency === "expert" && styles.chipTextPrimary]}>Expert</Text>
            </Pressable>
          </View>

          <Text style={styles.inputLabel}>Years of experience</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={selectedYears}
            onChangeText={setSelectedYears}
          />

          <AnimatedButton containerStyle={styles.actionBtnWrap} style={styles.primaryBtn} onPress={onAddSkill}>
            <Feather name="plus" size={15} color={Colors.background} />
            <Text style={styles.primaryBtnText}>Add Skill</Text>
          </AnimatedButton>

          {userSkills.map((skill, index) => (
            <View key={String(skill.id ?? `${index}`)} style={styles.skillRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingText}>{String(skill.name ?? skill.skill_name ?? skill.skill_full_name ?? "Skill")}</Text>
                <Text style={styles.settingSub}>
                  {String(skill.proficiency_level ?? "beginner")} · {String(skill.years_of_experience ?? 0)} years
                </Text>
              </View>
              <Pressable style={styles.iconBtn} onPress={() => onUpdateSkill(skill)}>
                <Feather name="save" size={15} color={Colors.primary} />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => onRemoveSkill(skill)}>
                <Feather name="trash-2" size={15} color={Colors.danger} />
              </Pressable>
            </View>
          ))}
        </GlassCard>

        <Text style={styles.groupLabel}>Security</Text>
        <GlassCard style={styles.group} padding={16} radius={20}>
          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <AnimatedButton containerStyle={styles.actionBtnWrap} style={styles.secondaryBtn} onPress={onChangePassword}>
            <Feather name="lock" size={15} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Update Password</Text>
          </AnimatedButton>
        </GlassCard>

        {/* About */}
        <Text style={styles.groupLabel}>About</Text>
        <GlassCard style={styles.group} padding={4} radius={20}>
          <SettingLink label="Version" icon="info" color={Colors.textSecondary} value="1.0.0" />
          <View style={styles.divider} />
          <SettingLink label="Data" icon="database" color={Colors.textSecondary} value="Live profile data" />
          <View style={styles.divider} />
          <SettingLink label="Sync Status" icon="activity" color={Colors.textSecondary} value={profileQuery.isRefetching ? "Updating" : "Live"} />
          <View style={styles.divider} />
          <AnimatedButton style={styles.settingRow} onPress={onSignOut}>
            <View style={[styles.settingIcon, { backgroundColor: Colors.danger + "15" }]}>
              <Feather name="log-out" size={17} color={Colors.danger} />
            </View>
            <View style={styles.settingLabel}>
              <Text style={styles.settingText}>Sign Out</Text>
              <Text style={styles.settingSub}>Sign out of your account on this device</Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.textTertiary} />
          </AnimatedButton>
        </GlassCard>

        {saveStatus ? <Text style={styles.statusText}>{saveStatus}</Text> : null}
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  groupLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
  },
  settingText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  settingSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 1,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginRight: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  profileActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  profileActionBtnWrap: {
    minHeight: 40,
  },
  actionBtnWrap: {
    minHeight: 40,
    alignSelf: "flex-start",
  },
  skillsGroupLabel: {
    marginTop: 6,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
  },
  primaryBtnText: {
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 40,
  },
  secondaryBtnText: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: Colors.backgroundSecondary,
  },
  chipPrimary: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chipTextPrimary: {
    color: Colors.primary,
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.backgroundSecondary,
  },
});
