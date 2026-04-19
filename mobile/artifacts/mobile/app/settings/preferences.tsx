import React, { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { SettingsScreenShell } from "@/components/settings/SettingsScreenShell";
import { SettingsSection } from "@/components/settings/SettingsSection";
import Colors from "@/constants/colors";
import { AppSpacing } from "@/constants/theme";
import {
  AppPreferences,
  loadAppPreferences,
  saveAppPreferences,
} from "@/lib/preferences";

type PreferenceRowProps = {
  label: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
  divider?: boolean;
};

function PreferenceRow({ label, subtitle, value, onChange, divider = true }: PreferenceRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: AppSpacing.md,
        paddingVertical: 14,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: Colors.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.border, true: Colors.accentTertiary }}
        thumbColor={Colors.background}
      />
    </View>
  );
}

export default function PreferencesSettingsScreen() {
  const [preferences, setPreferences] = useState<AppPreferences | null>(null);

  useEffect(() => {
    let mounted = true;

    loadAppPreferences().then((stored) => {
      if (mounted) {
        setPreferences(stored);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreference = async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    const next = {
      ...(preferences ?? {
        weeklyReviewReminders: true,
        marketTrendAlerts: true,
        openRecommendationsAfterRefresh: false,
        reduceMotion: false,
      }),
      [key]: value,
    };
    setPreferences(next);
    await saveAppPreferences(next);
  };

  if (!preferences) {
    return (
      <SettingsScreenShell
        eyebrow="Preferences"
        title="App preferences"
        subtitle="Loading your device-level preferences."
        headerEyebrowStyle={styles.headerEyebrow}
        headerTitleStyle={styles.headerTitle}
        headerSubtitleStyle={styles.headerSubtitle}
      >
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </SettingsScreenShell>
    );
  }

  return (
    <SettingsScreenShell
      eyebrow="Preferences"
      title="App preferences"
      subtitle="These controls are stored on this device and shape how NexaPath behaves in daily use."
      headerEyebrowStyle={styles.headerEyebrow}
      headerTitleStyle={styles.headerTitle}
      headerSubtitleStyle={styles.headerSubtitle}
    >
      <SettingsSection title="Notifications and behavior">
        <PreferenceRow
          label="Weekly review reminders"
          subtitle="Keep periodic nudges enabled for profile and career upkeep."
          value={preferences.weeklyReviewReminders}
          onChange={(value) => updatePreference("weeklyReviewReminders", value)}
        />
        <PreferenceRow
          label="Market trend alerts"
          subtitle="Show reminder surfaces when new role or skill demand data is available."
          value={preferences.marketTrendAlerts}
          onChange={(value) => updatePreference("marketTrendAlerts", value)}
        />
        <PreferenceRow
          label="Open recommendations after refresh"
          subtitle="Jump into recommendations after a profile or AI refresh action completes."
          value={preferences.openRecommendationsAfterRefresh}
          onChange={(value) => updatePreference("openRecommendationsAfterRefresh", value)}
        />
        <PreferenceRow
          label="Reduce motion"
          subtitle="Prefer calmer transitions and less interface animation."
          value={preferences.reduceMotion}
          onChange={(value) => updatePreference("reduceMotion", value)}
          divider={false}
        />
      </SettingsSection>
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
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
  },
  rowSubtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Newsreader_400Regular",
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_400Regular",
  },
});
