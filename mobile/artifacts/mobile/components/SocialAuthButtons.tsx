import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { SocialProvider } from "@/lib/auth/socialAuth";

type Props = {
  disabled?: boolean;
  loadingProvider?: SocialProvider | null;
  onPress: (provider: SocialProvider) => void;
};

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "github") {
    return (
      <View style={[styles.iconShell, styles.githubIconShell]}>
        <Feather name="github" size={18} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.iconShell, styles.googleIconShell]}>
      <Text style={styles.googleGlyph}>G</Text>
    </View>
  );
}

function SocialButton({
  disabled,
  provider,
  loadingProvider,
  onPress,
}: {
  disabled?: boolean;
  provider: SocialProvider;
  loadingProvider: SocialProvider | null;
  onPress: (provider: SocialProvider) => void;
}) {
  const isLoading = loadingProvider === provider;
  const label =
    provider === "google"
      ? isLoading
        ? "Connecting Google..."
        : "Continue with Google"
      : isLoading
        ? "Connecting GitHub..."
        : "Continue with GitHub";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || isLoading}
      onPress={() => onPress(provider)}
      style={({ pressed }) => [
        styles.button,
        (disabled || isLoading) && styles.buttonDisabled,
        pressed && !(disabled || isLoading) && styles.buttonPressed,
      ]}
    >
      <ProviderIcon provider={provider} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function SocialAuthButtons({ disabled, loadingProvider = null, onPress }: Props) {
  return (
    <View style={styles.group}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.stack}>
        <SocialButton
          disabled={disabled}
          provider="google"
          loadingProvider={loadingProvider}
          onPress={onPress}
        />
        <SocialButton
          disabled={disabled}
          provider="github"
          loadingProvider={loadingProvider}
          onPress={onPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
    width: "100%",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  dividerText: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  stack: {
    gap: 10,
  },
  button: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.64,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  iconShell: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  githubIconShell: {
    backgroundColor: "#111827",
  },
  googleIconShell: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.1)",
  },
  googleGlyph: {
    color: "#4285F4",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
