import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useNavigation } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLoginAuth } from "@workspace/api-client-react";

import { AuthBackground } from "@/components/AuthBackground";
import { MotionPressable } from "@/components/MotionPressable";
import Colors from "@/constants/colors";
import { storeMobileAccessToken } from "@/lib/api/runtime";

export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <AuthBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          <Feather name="arrow-left" size={18} color="#111111" />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(500)} style={styles.logoWrap}>
          <Image
            source={require("@/assets/images/logo-Photoroom.png")}
            contentFit="contain"
            style={styles.logo}
          />
         
        </Animated.View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#98A1AB"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#98A1AB"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <MotionPressable
            containerStyle={[styles.cta, loginMutation.isPending && styles.ctaDisabled]}
            onPress={submitLogin}
            disabled={loginMutation.isPending}
          >
            <Text style={styles.ctaText}>{loginMutation.isPending ? "Logging In..." : "Log In"}</Text>
          </MotionPressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.authSwitch} onPress={() => router.push("/signup")}>
            <Text style={styles.note}>New to SkillPulse? Create your account</Text>
          </Pressable>
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
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  logoWrap: {
    marginTop: 28,
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 124,
    height: 124,
  },
  heroTextCard: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.56)",
  },
  title: {
    color: "#111111",
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: -0.8,
  },
  subTitle: {
    color: "#2E3742",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 310,
  },
  formSection: {
    marginTop: 34,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.48)",
    backgroundColor: "rgba(255,255,255,0.82)",
    padding: 18,
  },
  label: {
    color: "#202124",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(180,188,197,0.9)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 14,
    color: "#111111",
    fontFamily: "Inter_500Medium",
  },
  cta: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
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
    color: "#C62828",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  note: {
    marginTop: 14,
    color: "#33404D",
    fontSize: 13,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  authSwitch: {
    marginTop: 2,
  },
});
