import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedButton } from "@/components/ui/AnimatedButton";
import Colors from "@/constants/colors";
import { IT_TARGET_ROLES, PROFILE_SKILL_LEVELS } from "@/constants/profileOptions";
import { fetchAIProfile } from "@/lib/api/profileApi";
import {
  getSkillCatalog,
  updateExplicitUserProfile,
  type ExplicitProfileSkillPayload,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";
import { refreshProfile } from "@/hooks/useAIProfile";

type ExplicitSkillDraft = {
  name: string;
  level: (typeof PROFILE_SKILL_LEVELS)[number];
};

function normalizeSkillName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function ProfileCompletionScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [customSkillName, setCustomSkillName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<ExplicitSkillDraft[]>([]);
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]);
  const [targetRole, setTargetRole] = useState("");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [domainPreference, setDomainPreference] = useState("");
  const [stackPreference, setStackPreference] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [profileEnvelope, skillCatalog] = await Promise.all([
          fetchAIProfile(),
          getSkillCatalog(),
        ]);

        if (!mounted) return;

        setCatalog(skillCatalog);
        const explicitProfile = profileEnvelope.explicit_profile;
        setSelectedSkills(
          explicitProfile.skills.map((skill) => ({
            name: skill.name,
            level:
              skill.level === "beginner" ||
              skill.level === "intermediate" ||
              skill.level === "advanced"
                ? skill.level
                : "intermediate",
          }))
        );
        setTargetRole(
          explicitProfile.target_role ||
            (typeof profileEnvelope.ai_summary.top_goal === "string"
              ? profileEnvelope.ai_summary.top_goal
              : "") ||
            ""
        );
        setEducation(explicitProfile.education || "");
        setExperience(explicitProfile.experience || "");
        setDomainPreference(
          explicitProfile.preferences.domain ||
            (typeof profileEnvelope.profile?.domain === "string"
              ? profileEnvelope.profile.domain
              : "") ||
            ""
        );
        setStackPreference(explicitProfile.preferences.stack || "");
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load profile form.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const term = normalizeSkillName(skillSearch).toLowerCase();
    return catalog
      .filter((row) => {
        const name = String(row.name || "").toLowerCase();
        return term.length === 0 ? true : name.includes(term);
      })
      .filter((row) => {
        const candidate = normalizeSkillName(String(row.name || "")).toLowerCase();
        return !selectedSkills.some((skill) => skill.name.toLowerCase() === candidate);
      })
      .slice(0, 10);
  }, [catalog, skillSearch, selectedSkills]);

  const addSkill = (name: string) => {
    const normalized = normalizeSkillName(name);
    if (!normalized) return;

    setSelectedSkills((current) => {
      if (current.some((skill) => skill.name.toLowerCase() === normalized.toLowerCase())) {
        return current;
      }

      return [
        ...current,
        {
          name: normalized,
          level: "intermediate",
        },
      ];
    });
    setSkillSearch("");
    setCustomSkillName("");
  };

  const updateSkillLevel = (skillName: string, level: ExplicitSkillDraft["level"]) => {
    setSelectedSkills((current) =>
      current.map((skill) => (skill.name === skillName ? { ...skill, level } : skill))
    );
  };

  const removeSkill = (skillName: string) => {
    setSelectedSkills((current) => current.filter((skill) => skill.name !== skillName));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        skills: selectedSkills.map<ExplicitProfileSkillPayload>((skill) => ({
          name: skill.name,
          level: skill.level,
        })),
        target_role: targetRole.trim(),
        education: education.trim(),
        experience: experience.trim(),
        preferences: {
          domain: domainPreference.trim(),
          stack: stackPreference.trim(),
        },
      };

      await updateExplicitUserProfile(payload);
      await Promise.allSettled([
        refreshProfile(),
        queryClient.invalidateQueries(),
      ]);
      setSuccessMessage("Profile context saved. The AI will use it in future conversations.");
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile context.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={20} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>Give the AI structured context that overrides guesses.</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getBottomContentPadding(insets.bottom) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Structured AI Context</Text>
          <Text style={styles.heroTitle}>Explicit profile data has priority over AI inference.</Text>
          <Text style={styles.heroBody}>
            Add your real skills, target role, education, and preferences so recommendations stop relying only on chat history.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading profile form...</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Current Skills</Text>
              <Text style={styles.sectionHint}>Pick from your catalog or add your own custom skill.</Text>

              <TextInput
                style={styles.input}
                value={skillSearch}
                onChangeText={setSkillSearch}
                placeholder="Search skill catalog"
                placeholderTextColor={Colors.textTertiary}
              />

              {filteredCatalog.length > 0 ? (
                <View style={styles.catalogList}>
                  {filteredCatalog.map((item) => (
                    <Pressable
                      key={String(item.id ?? item.name)}
                      style={styles.catalogItem}
                      onPress={() => addSkill(String(item.name || ""))}
                    >
                      <Text style={styles.catalogName}>{String(item.name || "Skill")}</Text>
                      <Feather name="plus" size={16} color={Colors.primary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <View style={styles.customSkillRow}>
                <TextInput
                  style={[styles.input, styles.customSkillInput]}
                  value={customSkillName}
                  onChangeText={setCustomSkillName}
                  placeholder="Add custom skill"
                  placeholderTextColor={Colors.textTertiary}
                />
                <Pressable style={styles.addButton} onPress={() => addSkill(customSkillName)}>
                  <Feather name="plus" size={16} color={Colors.background} />
                </Pressable>
              </View>

              {selectedSkills.length > 0 ? (
                <View style={styles.selectedSkillsList}>
                  {selectedSkills.map((skill) => (
                    <View key={skill.name} style={styles.skillCard}>
                      <View style={styles.skillHeader}>
                        <Text style={styles.skillName}>{skill.name}</Text>
                        <Pressable onPress={() => removeSkill(skill.name)} style={styles.removeChip}>
                          <Feather name="x" size={14} color={Colors.textSecondary} />
                        </Pressable>
                      </View>
                      <View style={styles.levelRow}>
                        {PROFILE_SKILL_LEVELS.map((level) => (
                          <Pressable
                            key={level}
                            style={[
                              styles.levelChip,
                              skill.level === level && styles.levelChipActive,
                            ]}
                            onPress={() => updateSkillLevel(skill.name, level)}
                          >
                            <Text
                              style={[
                                styles.levelChipText,
                                skill.level === level && styles.levelChipTextActive,
                              ]}
                            >
                              {level}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyHint}>No explicit skills added yet.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Career Direction</Text>
              <Text style={styles.inputLabel}>Target Role</Text>
              <Pressable
                style={styles.dropdownButton}
                onPress={() => setRoleMenuOpen((open) => !open)}
              >
                <Text style={[styles.dropdownText, !targetRole && styles.placeholderText]}>
                  {targetRole || "Select your target IT role"}
                </Text>
                <Feather
                  name={roleMenuOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>

              {roleMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {IT_TARGET_ROLES.map((role) => (
                    <Pressable
                      key={role}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setTargetRole(role);
                        setRoleMenuOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{role}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Education</Text>
              <TextInput
                style={styles.input}
                value={education}
                onChangeText={setEducation}
                placeholder="e.g. B.Sc. in Software Engineering"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.inputLabel}>Experience</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={experience}
                onChangeText={setExperience}
                multiline
                placeholder="Summarize your projects, years, and scope of work"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Optional Preferences</Text>
              <Text style={styles.inputLabel}>Preferred Domain</Text>
              <TextInput
                style={styles.input}
                value={domainPreference}
                onChangeText={setDomainPreference}
                placeholder="e.g. AI/ML, Cloud, Security"
                placeholderTextColor={Colors.textTertiary}
              />

              <Text style={styles.inputLabel}>Preferred Stack</Text>
              <TextInput
                style={styles.input}
                value={stackPreference}
                onChangeText={setStackPreference}
                placeholder="e.g. React, Python, AWS"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

            <AnimatedButton
              containerStyle={styles.saveButtonWrap}
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color={Colors.background} /> : null}
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Explicit Profile"}</Text>
            </AnimatedButton>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroEyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  heroBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  loadingCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  inputLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  textArea: {
    minHeight: 92,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  catalogList: {
    gap: 8,
    marginTop: 12,
  },
  catalogItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
  },
  catalogName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  customSkillRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  customSkillInput: {
    flex: 1,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  selectedSkillsList: {
    gap: 10,
    marginTop: 14,
  },
  skillCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  skillName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  removeChip: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  levelChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  levelChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "18",
  },
  levelChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  levelChipTextActive: {
    color: Colors.primary,
  },
  emptyHint: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  dropdownButton: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textPrimary,
  },
  placeholderText: {
    color: Colors.textTertiary,
  },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  dropdownItemText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  successText: {
    color: Colors.success,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  saveButtonWrap: {
    minHeight: 48,
    marginTop: 4,
  },
  saveButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.72,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
