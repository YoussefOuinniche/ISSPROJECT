import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLogoutAuth } from "@workspace/api-client-react";

import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppButton } from "@/components/ui/AppButton";
import { TextField } from "@/components/ui/TextField";
import Colors from "@/constants/colors";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import { changePassword } from "@/lib/api/mobileApi";

export default function SecuritySettingsScreen() {
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const onChangePassword = async () => {
    setStatus(null);

    if (!currentPassword.trim() || !newPassword.trim()) {
      setStatus("Fill in both password fields.");
      return;
    }

    try {
      setUpdating(true);
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      await queryClient.invalidateQueries();
      setStatus("Password updated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setUpdating(false);
    }
  };

  const onSignOut = async () => {
    setStatus(null);

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
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SettingsScreenShell
      eyebrow="Security"
      title="Security and session"
      subtitle="Sensitive actions stay isolated here so they are easy to find and harder to trigger accidentally."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Password">
        <View style={styles.sectionBody}>
          <TextField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
        </View>
      </SettingsSection>

      <SettingsSection title="Device session">
        <View style={styles.notesBody}>
          <Text style={styles.noteText}>
            Sign out clears the local mobile session and returns you to the authentication flow.
          </Text>
          {status ? (
            <Text style={[styles.statusText, { color: status.includes("updated") ? Colors.success : Colors.danger }]}>
              {status}
            </Text>
          ) : null}
        </View>
      </SettingsSection>

      <AppButton
        label={updating ? "Updating..." : "Update password"}
        onPress={onChangePassword}
        disabled={updating}
      />
      <AppButton
        label={signingOut ? "Signing out..." : "Sign out"}
        variant="secondary"
        onPress={onSignOut}
        disabled={signingOut}
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
