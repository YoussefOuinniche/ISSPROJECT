import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGetCurrentUser } from "@workspace/api-client-react";

import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppButton } from "@/components/ui/AppButton";
import { TextField } from "@/components/ui/TextField";
import Colors from "@/constants/colors";
import { updateCurrentUserAccount } from "@/lib/api/mobileApi";

export default function AccountSettingsScreen() {
  const queryClient = useQueryClient();
  const currentUserQuery = useGetCurrentUser();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const envelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};

  const currentUser =
    envelope.user && typeof envelope.user === "object"
      ? (envelope.user as Record<string, unknown>)
      : {};

  useEffect(() => {
    setFullName(String(currentUser.full_name ?? currentUser.fullName ?? ""));
    setEmail(String(currentUser.email ?? ""));
  }, [currentUser.full_name, currentUser.fullName, currentUser.email]);

  const onSave = async () => {
    setStatus(null);

    if (!fullName.trim()) {
      setStatus("Name is required.");
      return;
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus("Enter a valid email address.");
      return;
    }

    try {
      setSaving(true);
      await updateCurrentUserAccount({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      await currentUserQuery.refetch();
      await queryClient.invalidateQueries();
      setStatus("Personal information updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsScreenShell
      eyebrow="Profile"
      title="Personal information"
      subtitle="Keep your primary identity details accurate and up to date."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Identity">
        <View style={styles.sectionBody}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Notes">
        <View style={styles.notesBody}>
          <Text style={styles.noteText}>
            Profile summary, career data, and skills are edited in separate screens to avoid mixed responsibilities.
          </Text>
          {status ? (
            <Text style={[styles.statusText, { color: status.includes("updated") ? Colors.success : Colors.danger }]}>
              {status}
            </Text>
          ) : null}
        </View>
      </SettingsSection>

      <AppButton label={saving ? "Saving..." : "Save changes"} onPress={onSave} disabled={saving} />
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
  notesBody: {
    paddingVertical: 18,
    gap: 10,
  },
  noteText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
