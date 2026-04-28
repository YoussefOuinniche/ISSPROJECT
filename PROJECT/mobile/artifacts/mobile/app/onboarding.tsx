import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  useRecomputeUserProfileAnalysis,
  useUpsertUserProfilePut,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import {
  addUserSkill,
  getSkillCatalog,
  getUserSkills,
  updateCurrentUserAccount,
  updateUserSkill,
} from "@/lib/api/mobileApi";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { getBottomContentPadding } from "@/lib/layout";

type Proficiency = "beginner" | "intermediate" | "advanced" | "expert";
type Experience = "student" | "junior" | "mid" | "senior";

type SkillDraft = {
  skillId: string;
  name: string;
  proficiencyLevel: Proficiency;
  yearsOfExperience: string;
};

const EXPERIENCE_LEVELS: Experience[] = ["student", "junior", "mid", "senior"];
const PROFICIENCY_LEVELS: Proficiency[] = ["beginner", "intermediate", "advanced", "expert"];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentUserQuery = useGetCurrentUser();
  const profileQuery = useGetUserProfile();
  const upsertProfile = useUpsertUserProfilePut();
  const recomputeAnalysis = useRecomputeUserProfileAnalysis();

  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [title, setTitle] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<Experience>("junior");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]);
  const [searchText, setSearchText] = useState("");
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currentEnvelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};
  const currentUser =
    currentEnvelope.user && typeof currentEnvelope.user === "object"
      ? (currentEnvelope.user as Record<string, unknown>)
      : {};
  const profile =
    profileQuery.data && typeof profileQuery.data === "object" && "data" in profileQuery.data
      ? (profileQuery.data.data as Record<string, unknown>)
      : {};

  useEffect(() => {
    setFullName(String(currentUser.full_name ?? currentUser.fullName ?? ""));
    setEmail(String(currentUser.email ?? ""));
  }, [currentUser.full_name, currentUser.fullName, currentUser.email]);

  useEffect(() => {
    setDomain(String(profile.domain ?? ""));
    setTitle(String(profile.title ?? ""));
    const rawBio = String(profile.bio ?? "");
    setBio(rawBio);

    const locationMatch = rawBio.match(/Location:\s*(.+)/i);
    const targetRoleMatch = rawBio.match(/Target Role:\s*(.+)/i);
    const learningGoalsMatch = rawBio.match(/Learning Goals:\s*(.+)/i);
    const portfolioMatch = rawBio.match(/Portfolio:\s*(.+)/i);

    setLocation(locationMatch?.[1]?.trim() ?? "");
    setTargetRole(targetRoleMatch?.[1]?.trim() ?? "");
    setLearningGoals(learningGoalsMatch?.[1]?.trim() ?? "");
    setPortfolioUrl(portfolioMatch?.[1]?.trim() ?? "");
    const profileLevel = String(profile.experience_level ?? profile.experienceLevel ?? "junior").toLowerCase();
    if (EXPERIENCE_LEVELS.includes(profileLevel as Experience)) {
      setExperienceLevel(profileLevel as Experience);
    }
  }, [profile.domain, profile.title, profile.bio, profile.experience_level, profile.experienceLevel]);

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
      .catch(() => {
        if (!mounted) return;
        setCatalog([]);
      });

    getUserSkills()
      .then((rows) => {
        if (!mounted) return;
        const mapped = rows
          .map((row) => ({
            skillId: String(row.skill_id ?? row.skillId ?? row.id ?? ""),
            name: String(row.name ?? row.skill_name ?? row.skill_full_name ?? "Skill"),
            proficiencyLevel: String(row.proficiency_level ?? "beginner") as Proficiency,
            yearsOfExperience: String(row.years_of_experience ?? 0),
          }))
          .filter((skill) => skill.skillId.length > 0);
        setSkills(mapped);
      })
      .catch(() => {
        if (!mounted) return;
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return catalog
      .filter((row) => {
        const name = String(row.name ?? "").toLowerCase();
        return term.length === 0 ? true : name.includes(term);
      })
      .slice(0, 12);
  }, [catalog, searchText]);

  const completionScore = useMemo(() => {
    const profileData = {
      full_name: fullName,
      domain,
      title,
      experience_level: experienceLevel,
      bio,
    };
    const skillData = skills.map((skill) => ({
      proficiency_level: skill.proficiencyLevel,
      years_of_experience: Number(skill.yearsOfExperience) || 0,
    }));
    return computeProfileCompleteness(profileData, skillData);
  }, [fullName, domain, title, experienceLevel, bio, skills]);

  const addSkillToDraft = (row: Record<string, unknown>) => {
    const skillId = String(row.id ?? "");
    if (!skillId) return;
    if (skills.some((skill) => skill.skillId === skillId)) return;

    setSkills((prev) => [
      ...prev,
      {
        skillId,
        name: String(row.name ?? "Skill"),
        proficiencyLevel: "beginner",
        yearsOfExperience: "0",
      },
    ]);
  };

  const updateDraftSkill = (skillId: string, changes: Partial<SkillDraft>) => {
    setSkills((prev) => prev.map((skill) => (skill.skillId === skillId ? { ...skill, ...changes } : skill)));
  };

  const removeDraftSkill = (skillId: string) => {
    setSkills((prev) => prev.filter((skill) => skill.skillId !== skillId));
  };

  const saveOnboarding = async () => {
    setSaving(true);
    setError(null);

    try {
      if (!fullName.trim() || !email.trim()) {
        setError("Please complete your name and email.");
        setSaving(false);
        return;
      }

      await updateCurrentUserAccount({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });

      await upsertProfile.mutateAsync({
        data: {
          domain: domain.trim(),
          title: title.trim(),
          experienceLevel,
          bio: buildBioPayload(),
        },
      });

      for (const skill of skills) {
        const years = Number(skill.yearsOfExperience);
        try {
          await addUserSkill({
            skillId: skill.skillId,
            proficiencyLevel: skill.proficiencyLevel,
            yearsOfExperience: Number.isFinite(years) && years >= 0 ? years : 0,
          });
        } catch {
          await updateUserSkill(skill.skillId, {
            proficiencyLevel: skill.proficiencyLevel,
            yearsOfExperience: Number.isFinite(years) && years >= 0 ? years : 0,
          });
        }
      }

      await recomputeAnalysis.mutateAsync({ data: {} });
      await queryClient.invalidateQueries();
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to save your profile setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.navBar,
          {
            paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (step === 2) {
              setStep(1);
              return;
            }
            router.back();
          }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>Complete Your Profile</Text>
        <Text style={styles.progressText}>Step {step} of 2</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Profile Strength</Text>
          <Text style={styles.scoreValue}>{completionScore}%</Text>
          <Text style={styles.scoreHint}>Higher profile strength unlocks better recommendations.</Text>
        </View>

        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>About You</Text>
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.inputLabel}>Domain</Text>
              <TextInput
                style={styles.input}
                value={domain}
                onChangeText={setDomain}
                placeholder="e.g. Data Science"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.inputLabel}>Current Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Product Analyst"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.inputLabel}>Experience Level</Text>
              <View style={styles.chipRow}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <Pressable
                    key={level}
                    style={[styles.chip, experienceLevel === level && styles.chipActive]}
                    onPress={() => setExperienceLevel(level)}
                  >
                    <Text style={[styles.chipText, experienceLevel === level && styles.chipTextActive]}>
                      {level}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Share your focus, strengths, and goals."
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
                placeholder="e.g. Senior Product Analyst"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.inputLabel}>Learning Goals</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={learningGoals}
                onChangeText={setLearningGoals}
                multiline
                placeholder="What outcomes do you want in the next 3-6 months?"
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
            </View>

            <AnimatedButton containerStyle={styles.primaryBtnWrap} style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>Continue to Skills</Text>
              <Feather name="arrow-right" size={15} color={Colors.background} />
            </AnimatedButton>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Skills and Experience</Text>
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Search skills</Text>
              <TextInput
                style={styles.input}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search by skill name"
                placeholderTextColor={Colors.textTertiary}
              />

              <View style={styles.catalogList}>
                {filteredCatalog.map((row) => {
                  const id = String(row.id ?? "");
                  const name = String(row.name ?? "Skill");
                  return (
                    <Pressable key={id} style={styles.catalogItem} onPress={() => addSkillToDraft(row)}>
                      <Text style={styles.catalogName}>{name}</Text>
                      <Feather name="plus" size={16} color={Colors.primary} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {skills.map((skill) => (
              <View key={skill.skillId} style={styles.skillCard}>
                <View style={styles.skillTop}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Pressable onPress={() => removeDraftSkill(skill.skillId)}>
                    <Feather name="trash-2" size={16} color={Colors.danger} />
                  </Pressable>
                </View>

                <Text style={styles.inputLabel}>Proficiency</Text>
                <View style={styles.chipRow}>
                  {PROFICIENCY_LEVELS.map((level) => (
                    <Pressable
                      key={level}
                      style={[styles.chip, skill.proficiencyLevel === level && styles.chipActive]}
                      onPress={() => updateDraftSkill(skill.skillId, { proficiencyLevel: level })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          skill.proficiencyLevel === level && styles.chipTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Years of experience</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={skill.yearsOfExperience}
                  onChangeText={(value) => updateDraftSkill(skill.skillId, { yearsOfExperience: value })}
                />
              </View>
            ))}

            <AnimatedButton containerStyle={styles.primaryBtnWrap} style={[styles.primaryBtn, saving && styles.btnDisabled]} onPress={saveOnboarding} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={Colors.background} /> : null}
              <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Finish Setup"}</Text>
            </AnimatedButton>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  navTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  progressText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  scoreCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 16,
  },
  scoreLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  scoreValue: {
    marginTop: 4,
    color: Colors.primary,
    fontSize: 30,
    fontFamily: "Inter_700Bold",
  },
  scoreHint: {
    marginTop: 6,
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 10,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.backgroundSecondary,
  },
  chipActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary + "80",
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: Colors.primary,
  },
  catalogList: {
    gap: 8,
    marginTop: 4,
  },
  catalogItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catalogName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  skillCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 8,
  },
  skillTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skillName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnWrap: {
    minHeight: 48,
    marginTop: 6,
  },
  primaryBtnText: {
    color: Colors.background,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    marginTop: 4,
  },
});
