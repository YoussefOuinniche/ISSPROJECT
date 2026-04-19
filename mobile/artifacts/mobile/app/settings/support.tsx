import Constants from "expo-constants";
import * as Linking from "expo-linking";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGetUserProfile } from "@workspace/api-client-react";

import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ListRow } from "@/components/ui/ListRow";
import Colors from "@/constants/colors";
import { useAIProfile } from "@/hooks/useAIProfile";

export default function SupportSettingsScreen() {
  const profileQuery = useGetUserProfile();
  const { error: aiProfileError } = useAIProfile();

  const version =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    "1.0.0";

  return (
    <SettingsScreenShell
      eyebrow="Support"
      title="Help and app information"
      subtitle="Operational status, legal references, and support entry points live here."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Support">
        <ListRow
          title="Contact support"
          subtitle="support@nexapath.app"
          leading={<SettingsIcon name="mail" color={Colors.accent} />}
          onPress={() => Linking.openURL("mailto:support@nexapath.app")}
        />
        <ListRow
          title="Privacy and terms"
          subtitle="Legal documents and product policies."
          leading={<SettingsIcon name="file-text" color={Colors.textSecondary} />}
          divider={false}
        />
      </SettingsSection>

      <SettingsSection title="System status">
        <ListRow
          title="Profile sync"
          subtitle={profileQuery.isRefetching ? "Updating profile data." : "Profile data is live."}
          leading={<SettingsIcon name="activity" color={profileQuery.isRefetching ? Colors.warning : Colors.success} />}
        />
        <ListRow
          title="AI profile"
          subtitle={aiProfileError ? "AI profile needs attention." : "AI profile available."}
          leading={<SettingsIcon name="cpu" color={aiProfileError ? Colors.danger : Colors.success} />}
        />
        <ListRow
          title="App version"
          subtitle={`Version ${version}`}
          leading={<SettingsIcon name="info" color={Colors.textPrimary} />}
          divider={false}
        />
      </SettingsSection>

      <View>
        <Text style={styles.flowLabel}>About this flow</Text>
        <Text style={styles.flowText}>
          Support and system details are separated from profile editing so operational information does not compete with identity management.
        </Text>
      </View>
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
  flowLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  flowText: {
    color: Colors.textSecondary,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
});
