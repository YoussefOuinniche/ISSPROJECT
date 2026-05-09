'use no memo';
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Appearance,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetCurrentUser,
  useGetUserProfile,
  useLogoutAuth,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, SANS, SANS_MED, SANS_REG, type AppTheme } from "@/constants/theme";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import { getBottomContentPadding } from "@/lib/layout";

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();

  const currentUserQuery = useGetCurrentUser();
  const profileQuery = useGetUserProfile();

  const currentEnvelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};
  const currentUser =
    currentEnvelope.user && typeof currentEnvelope.user === "object"
      ? (currentEnvelope.user as Record<string, unknown>)
      : {};

  const fullName = String(currentUser.full_name ?? currentUser.fullName ?? "—");
  const email = String(currentUser.email ?? "—");

  const onSignOut = async () => {
    try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
    await clearMobileAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  const s = makeStyles(theme);

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.nav, { paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
        <Text style={s.navTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <Animated.View entering={FadeIn.duration(280)} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: getBottomContentPadding(insets.bottom) }]}
          showsVerticalScrollIndicator={false}
        >

          {/* Appearance */}
          <Text style={s.groupLabel}>Appearance</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.accent + '18' }]}>
                <Feather name={theme.isDark ? "moon" : "sun"} size={17} color={theme.accent} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Dark Mode</Text>
                <Text style={s.rowSub}>{theme.isDark ? 'Dark focus theme' : 'Light focus theme'}</Text>
              </View>
              <Switch
                value={theme.isDark}
                onValueChange={(v) => Appearance.setColorScheme(v ? 'dark' : 'light')}
                trackColor={{ false: theme.borderSubtle, true: theme.accent + '60' }}
                thumbColor={theme.isDark ? theme.accent : theme.textTertiary}
              />
            </View>
          </View>

          {/* Account */}
          <Text style={s.groupLabel}>Account</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.primary + '18' }]}>
                <Feather name="user" size={17} color={theme.primary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>{fullName}</Text>
                <Text style={s.rowSub}>Full name</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.primary + '18' }]}>
                <Feather name="mail" size={17} color={theme.primary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>{email}</Text>
                <Text style={s.rowSub}>Email address</Text>
              </View>
            </View>
            <View style={s.divider} />
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
              onPress={() => router.push('/profile-completion')}
            >
              <View style={[s.rowIcon, { backgroundColor: theme.primary + '18' }]}>
                <Feather name="edit-3" size={17} color={theme.primary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Edit Profile</Text>
                <Text style={s.rowSub}>Update skills and details</Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textTertiary} />
            </Pressable>
          </View>

          {/* About */}
          <Text style={s.groupLabel}>About</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.textTertiary + '14' }]}>
                <Feather name="info" size={17} color={theme.textSecondary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Version</Text>
              </View>
              <Text style={s.rowValue}>1.0.0</Text>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.textTertiary + '14' }]}>
                <Feather name="activity" size={17} color={theme.textSecondary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Sync Status</Text>
              </View>
              <View style={[s.statusPill, { backgroundColor: theme.accent + '18', borderColor: theme.accent + '40' }]}>
                <View style={[s.statusDot, { backgroundColor: theme.accent }]} />
                <Text style={[s.statusText, { color: theme.accent }]}>
                  {profileQuery.isRefetching ? 'Syncing' : 'Live'}
                </Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.textTertiary + '14' }]}>
                <Feather name="database" size={17} color={theme.textSecondary} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Data</Text>
              </View>
              <Text style={s.rowValue}>Live profile</Text>
            </View>
          </View>

          {/* Sign Out */}
          <View style={[s.card, s.cardDanger]}>
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.72 }]}
              onPress={onSignOut}
            >
              <View style={[s.rowIcon, { backgroundColor: theme.warm + '18' }]}>
                <Feather name="log-out" size={17} color={theme.warm} />
              </View>
              <View style={s.rowLabel}>
                <Text style={[s.rowText, { color: theme.warm }]}>Sign Out</Text>
                <Text style={s.rowSub}>Sign out of your account on this device</Text>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textTertiary} />
            </Pressable>
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    nav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 16,
      backgroundColor: theme.bg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
      fontFamily: SANS_MED,
      color: theme.text,
      letterSpacing: 0.2,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    groupLabel: {
      fontSize: 11,
      fontFamily: SANS_MED,
      color: theme.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 1.1,
      marginBottom: 8,
      marginLeft: 2,
      marginTop: 20,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      overflow: "hidden",
    },
    cardDanger: {
      borderColor: theme.warm + '30',
      marginTop: 12,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      flex: 1,
    },
    rowText: {
      fontSize: 14,
      fontFamily: SANS_MED,
      color: theme.text,
    },
    rowSub: {
      fontSize: 11,
      fontFamily: SANS_REG,
      color: theme.textTertiary,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 12,
      fontFamily: SANS_MED,
      color: theme.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.borderSubtle,
      marginHorizontal: 16,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontFamily: SANS_MED,
    },
  });
}
