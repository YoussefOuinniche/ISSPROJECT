import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppButton } from "@/components/ui/AppButton";
import { ListRow } from "@/components/ui/ListRow";
import Colors from "@/constants/colors";
import { AppType } from "@/constants/theme";

export default function SettingsScreen() {
  return (
    <SettingsScreenShell
      eyebrow="Settings"
      title="Manage your account"
      subtitle="Everything that affects security, preferences, support, and how NexaPath works for you."
    >
      <SettingsSection
        title="Profile management"
        subtitle="Profile details live in focused screens so editing stays clean and predictable."
      >
        <ListRow
          title="Personal information"
          subtitle="Update name and primary email."
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
          subtitle="Manage tracked skills and experience levels."
          leading={<SettingsIcon name="layers" color={Colors.success} />}
          onPress={() => router.push("/settings/skills")}
          divider={false}
        />
      </SettingsSection>

      <SettingsSection title="Account and security">
        <ListRow
          title="Security"
          subtitle="Change password and manage this device session."
          leading={<SettingsIcon name="shield" color={Colors.textPrimary} />}
          onPress={() => router.push("/settings/security")}
        />
        <ListRow
          title="Preferences"
          subtitle="Adjust reminders, alerts, and app behavior."
          leading={<SettingsIcon name="sliders" color={Colors.warning} />}
          onPress={() => router.push("/settings/preferences")}
          divider={false}
        />
      </SettingsSection>

      <SettingsSection title="Support and about">
        <ListRow
          title="Help and app information"
          subtitle="Support, legal information, sync status, and version."
          leading={<SettingsIcon name="help-circle" color={Colors.textSecondary} />}
          onPress={() => router.push("/settings/support")}
          divider={false}
        />
      </SettingsSection>

      <View>
        <Text style={[AppType.caption, { color: Colors.textTertiary }]}>
          Structural split
        </Text>
        <Text style={[AppType.body, { color: Colors.textSecondary, marginTop: 8 }]}>
          Profile screens now own identity and career editing. Settings owns controls and system-level actions.
        </Text>
      </View>

      <AppButton
        label="Back to profile"
        variant="secondary"
        leading={<Feather name="user" size={16} color={Colors.textPrimary} />}
        onPress={() => router.push("/(tabs)/profile")}
      />
    </SettingsScreenShell>
  );
}
