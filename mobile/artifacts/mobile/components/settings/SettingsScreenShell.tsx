import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/ui/AppHeader";
import Colors from "@/constants/colors";
import { AppRadius, AppSpacing } from "@/constants/theme";
import { getBottomContentPadding } from "@/lib/layout";

type SettingsScreenShellProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  hasTabBar?: boolean;
  showBackButton?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  headerTitleStyle?: StyleProp<TextStyle>;
  headerSubtitleStyle?: StyleProp<TextStyle>;
  headerEyebrowStyle?: StyleProp<TextStyle>;
};

export function SettingsScreenShell({
  title,
  subtitle,
  eyebrow,
  action,
  children,
  hasTabBar = false,
  showBackButton = true,
  contentStyle,
  headerTitleStyle,
  headerSubtitleStyle,
  headerEyebrowStyle,
}: SettingsScreenShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === "web" ? insets.top + 56 : insets.top + 18,
            paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar }),
          },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidth}>
          <View style={styles.headerRow}>
            {showBackButton ? (
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Feather name="arrow-left" size={18} color={Colors.textPrimary} />
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <AppHeader
              eyebrow={eyebrow}
              title={title}
              subtitle={subtitle}
              action={action}
              style={styles.header}
              titleStyle={headerTitleStyle}
              subtitleStyle={headerSubtitleStyle}
              eyebrowStyle={headerEyebrowStyle}
            />
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: AppSpacing.page,
  },
  maxWidth: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: AppSpacing.md,
  },
  header: {
    flex: 1,
  },
  body: {
    marginTop: AppSpacing.section,
    gap: AppSpacing.section,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
  },
  backSpacer: {
    width: 0,
  },
});
