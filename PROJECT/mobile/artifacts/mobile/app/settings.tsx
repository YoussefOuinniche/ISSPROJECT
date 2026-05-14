'use no memo';
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetCurrentUser,
  useLogoutAuth,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme, useThemePreference, SANS, SANS_MED, SANS_REG, type AppTheme } from "@/constants/theme";
import { clearMobileAccessToken } from "@/lib/api/runtime";
import { getBottomContentPadding } from "@/lib/layout";
import { updateCurrentUserAccount } from "@/lib/api/mobileApi";

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference, effective } = useThemePreference();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const logoutMutation = useLogoutAuth();

  const currentUserQuery = useGetCurrentUser();

  const currentEnvelope =
    currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
      ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
      : {};
  const currentUser =
    currentEnvelope.user && typeof currentEnvelope.user === "object"
      ? (currentEnvelope.user as Record<string, unknown>)
      : {};
  const currentProfile =
    currentEnvelope.profile && typeof currentEnvelope.profile === "object"
      ? (currentEnvelope.profile as Record<string, unknown>)
      : {};

  const currentFullName = String(
    currentProfile.full_name ?? currentUser.full_name ?? currentUser.fullName ?? "",
  );
  const email = String(currentUser.email ?? "—");

  const [nameDraft, setNameDraft] = useState(currentFullName);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingName) setNameDraft(currentFullName);
  }, [currentFullName, editingName]);

  const onSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentFullName) {
      setEditingName(false);
      setNameDraft(currentFullName);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateCurrentUserAccount({ full_name: trimmed });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      await currentUserQuery.refetch();
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save name');
    } finally {
      setSavingName(false);
    }
  };

  const onSignOut = async () => {
    try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
    await clearMobileAccessToken();
    queryClient.clear();
    router.replace("/login");
  };

  const isDark = effective === 'dark';
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
                <Feather name={isDark ? "moon" : "sun"} size={17} color={theme.accent} />
              </View>
              <View style={s.rowLabel}>
                <Text style={s.rowText}>Dark Mode</Text>
                <Text style={s.rowSub}>
                  {preference === 'system'
                    ? `System (${isDark ? 'Dark' : 'Light'})`
                    : isDark ? 'Dark focus theme' : 'Light focus theme'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
                trackColor={{ false: theme.borderSubtle, true: theme.accent + '60' }}
                thumbColor={isDark ? theme.accent : theme.textTertiary}
              />
            </View>
            {preference !== 'system' ? (
              <>
                <View style={s.divider} />
                <Pressable
                  style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                  onPress={() => setPreference('system')}
                >
                  <View style={[s.rowIcon, { backgroundColor: theme.textTertiary + '18' }]}>
                    <Feather name="smartphone" size={17} color={theme.textSecondary} />
                  </View>
                  <View style={s.rowLabel}>
                    <Text style={s.rowText}>Match system</Text>
                    <Text style={s.rowSub}>Follow your device appearance</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme.textTertiary} />
                </Pressable>
              </>
            ) : null}
          </View>

          {/* Account */}
          <Text style={s.groupLabel}>Account</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: theme.primary + '18' }]}>
                <Feather name="user" size={17} color={theme.primary} />
              </View>
              <View style={s.rowLabel}>
                {editingName ? (
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Your full name"
                    placeholderTextColor={theme.textTertiary}
                    autoFocus
                    autoCorrect={false}
                    style={s.nameInput}
                    onSubmitEditing={onSaveName}
                    returnKeyType="done"
                  />
                ) : (
                  <Text style={s.rowText} numberOfLines={1}>
                    {currentFullName || email || '—'}
                  </Text>
                )}
                <Text style={s.rowSub}>
                  {nameError ?? (currentFullName ? 'Full name' : 'Tap the pencil to set your name')}
                </Text>
              </View>
              {editingName ? (
                <View style={s.nameActions}>
                  {savingName ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <>
                      <Pressable
                        onPress={() => { setEditingName(false); setNameDraft(currentFullName); setNameError(null); }}
                        hitSlop={8}
                        style={s.nameBtn}
                      >
                        <Feather name="x" size={18} color={theme.textTertiary} />
                      </Pressable>
                      <Pressable
                        onPress={onSaveName}
                        hitSlop={8}
                        style={[s.nameBtn, { backgroundColor: theme.accent }]}
                      >
                        <Feather name="check" size={18} color={theme.textOnAccent} />
                      </Pressable>
                    </>
                  )}
                </View>
              ) : (
                <Pressable
                  onPress={() => { setEditingName(true); setNameError(null); }}
                  hitSlop={8}
                  style={s.nameBtn}
                >
                  <Feather name="edit-2" size={16} color={theme.textSecondary} />
                </Pressable>
              )}
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
    nameInput: {
      fontSize: 14,
      fontFamily: SANS_MED,
      color: theme.text,
      paddingVertical: 2,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.accent + '60',
    },
    nameActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    nameBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.bg2,
    },
  });
}
