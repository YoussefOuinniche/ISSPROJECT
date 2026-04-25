import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoginAuth } from "@workspace/api-client-react";

import { AuthBackground } from "@/components/AuthBackground";
import { MotionPressable } from "@/components/MotionPressable";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import Colors from "@/constants/colors";
import { beginSocialAuth, type SocialProvider } from "@/lib/auth/socialAuth";
import { storeMobileAccessToken } from "@/lib/api/runtime";
import { LinearGradient } from "expo-linear-gradient";

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<SocialProvider | null>(null);

  const loginMutation = useLoginAuth();

  const submitLogin = async () => {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      const response = await loginMutation.mutateAsync({
        data: {
          email: email.trim().toLowerCase(),
          password,
        },
      });

      const token = response?.data?.token;
      if (!token) {
        setError("We could not complete sign in. Please try again.");
        return;
      }

      await storeMobileAccessToken(token);

      router.replace("/(tabs)");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign in failed";
      setError(message);
    }
  };

  const handleSocialAuth = async (provider: SocialProvider) => {
    setError(null);
    setSocialLoadingProvider(provider);

    try {
      const outcome = await beginSocialAuth(provider);
      if (outcome.status === "success") {
        router.replace("/(tabs)");
        return;
      }

      setError(outcome.message);
    } finally {
      setSocialLoadingProvider(null);
    }
  };

  return (
    <AuthBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.shell}>
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/");
            }}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={18} color={Colors.textPrimary} />
          </Pressable>

          <View style={styles.heroBlock}>
            <Image
              source={require("@/assets/images/nexapath.png")}
              contentFit="contain"
              contentPosition="center"
              style={styles.logo}
            />
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Log in to NexaPath</Text>
            </View>
          </View>

          <View style={styles.formSection}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textTertiary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View style={styles.socialWrap}>
              <SocialAuthButtons
                disabled={loginMutation.isPending || Boolean(socialLoadingProvider)}
                loadingProvider={socialLoadingProvider}
                onPress={handleSocialAuth}
              />
            </View>

            <MotionPressable
              containerStyle={[
                styles.cta,
                (loginMutation.isPending || Boolean(socialLoadingProvider)) && styles.ctaDisabled,
                { overflow: "hidden" },
              ]}
              onPress={submitLogin}
              disabled={loginMutation.isPending || Boolean(socialLoadingProvider)}
            >
              <LinearGradient
                colors={Colors.gradientAccentTertiary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.ctaText, { zIndex: 1 }]}>
                {loginMutation.isPending ? "Logging In..." : "Log In"}
              </Text>
            </MotionPressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.authSwitch} onPress={() => router.push("/signup")}>
              <Text style={styles.note}>New to NexaPath? Create your account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  shell: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: 28,
  },
  heroBlock: {
    marginBottom: 30,
    gap: 18,
    alignItems: "center",
  },
  logo: {
    width: 260,
    height: 108,
    alignSelf: "center",
  },
  heroCopy: {
    gap: 8,
    alignItems: "center",
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: "Inter_700Bold",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1.2,
    textAlign: "center",
  },
  formSection: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  input: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  cta: {
    marginTop: 8,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.accentTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: {
    opacity: 0.65,
  },
  ctaText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    color: Colors.danger,
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  note: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  authSwitch: {
    marginTop: 2,
  },
  socialWrap: {
    marginTop: 8,
  },
});

