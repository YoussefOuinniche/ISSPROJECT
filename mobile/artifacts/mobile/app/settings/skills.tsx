import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppButton } from "@/components/ui/AppButton";
import { TextField } from "@/components/ui/TextField";
import Colors from "@/constants/colors";
import { AppRadius, AppSpacing, AppType, alpha } from "@/constants/theme";
import {
  addUserSkill,
  deleteUserSkill,
  getSkillCatalog,
  getUserSkills,
} from "@/lib/api/mobileApi";
import { Proficiency } from "@/lib/profileSettings";

const PROFICIENCY_OPTIONS: Proficiency[] = ["beginner", "intermediate", "advanced", "expert"];

export default function SkillsSettingsScreen() {
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, unknown>[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [selectedProficiency, setSelectedProficiency] = useState<Proficiency>("beginner");
  const [selectedYears, setSelectedYears] = useState("0");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([getSkillCatalog(), getUserSkills()])
      .then(([catalogRows, skillRows]) => {
        if (!mounted) return;
        setCatalog(catalogRows);
        setUserSkills(skillRows);
      })
      .catch((error) => {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load skills.");
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const refreshSkills = async () => {
    const rows = await getUserSkills();
    setUserSkills(rows);
    await queryClient.invalidateQueries();
  };

  const onAddSkill = async () => {
    setStatus(null);

    if (!selectedSkillId) {
      setStatus("Select a skill to add.");
      return;
    }

    try {
      setSubmitting(true);
      await addUserSkill({
        skillId: selectedSkillId,
        proficiencyLevel: selectedProficiency,
        yearsOfExperience: Math.max(0, Number(selectedYears) || 0),
      });
      await refreshSkills();
      setSelectedYears("0");
      setStatus("Skill added.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add skill.");
    } finally {
      setSubmitting(false);
    }
  };

  const onRemoveSkill = async (skillId: string) => {
    setStatus(null);

    try {
      await deleteUserSkill(skillId);
      await refreshSkills();
      setStatus("Skill removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to remove skill.");
    }
  };

  return (
    <SettingsScreenShell
      eyebrow="Profile"
      title="Skills"
      subtitle="Keep your tracked skills current so recommendations and market insights stay relevant."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Add a skill" subtitle="Choose a skill, set your proficiency, and save it to your profile.">
        <View style={styles.sectionBody}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {catalog.slice(0, 40).map((row) => {
              const id = String(row.id ?? "");
              const isSelected = selectedSkillId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setSelectedSkillId(id)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {String(row.name ?? "Skill")}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.chipsWrap}>
            {PROFICIENCY_OPTIONS.map((option) => {
              const isSelected = selectedProficiency === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSelectedProficiency(option)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Years of experience"
            value={selectedYears}
            onChangeText={setSelectedYears}
            keyboardType="decimal-pad"
          />
        </View>
      </SettingsSection>

      <SettingsSection title={`Current skills (${userSkills.length})`}>
        <View style={{ paddingVertical: 4 }}>
          {loading ? (
            <Text style={[AppType.body, styles.emptyText]}>Loading your skills...</Text>
          ) : userSkills.length === 0 ? (
            <Text style={[AppType.body, styles.emptyText]}>
              No skills tracked yet. Add a few to improve recommendations.
            </Text>
          ) : (
            userSkills.map((skill, index) => {
              const skillId = String(skill.skill_id ?? skill.skillId ?? skill.id ?? "");
              const title = String(skill.name ?? skill.skill_name ?? skill.skill_full_name ?? `Skill ${index + 1}`);
              const subtitle = `${String(skill.proficiency_level ?? "beginner")} · ${String(skill.years_of_experience ?? 0)} years`;

              return (
                <View key={`${skillId}-${index}`} style={[styles.skillRow, index < userSkills.length - 1 && styles.skillRowDivider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skillTitle}>{title}</Text>
                    <Text style={styles.skillSubtitle}>{subtitle}</Text>
                  </View>
                  <Pressable style={styles.deleteButton} onPress={() => onRemoveSkill(skillId)}>
                    <Feather name="trash-2" size={15} color={Colors.danger} />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </SettingsSection>

      {status ? (
        <Text style={[styles.statusText, { color: status.includes("added") || status.includes("removed") ? Colors.success : Colors.danger }]}>
          {status}
        </Text>
      ) : null}

      <AppButton label={submitting ? "Adding..." : "Add skill"} onPress={onAddSkill} disabled={submitting} />
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
  chipsRow: {
    gap: AppSpacing.sm,
    paddingRight: AppSpacing.lg,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AppSpacing.sm,
  },
  chip: {
    minHeight: 38,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: Colors.accentTertiary,
    backgroundColor: alpha(Colors.accentTertiary, 0.1),
  },
  chipText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.accentTertiary,
  },
  emptyText: {
    color: Colors.textSecondary,
    paddingVertical: 14,
    fontFamily: "Newsreader_400Regular",
  },
  skillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppSpacing.md,
    paddingVertical: 14,
  },
  skillRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  skillTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  skillSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(Colors.danger, 0.08),
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
