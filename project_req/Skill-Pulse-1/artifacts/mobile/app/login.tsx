import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentUser, useLoginAuth } from "@workspace/api-client-react";

import Colors from "@/constants/colors";
import { getUserSkills } from "@/lib/api/mobileApi";
import { computeProfileCompleteness } from "@/lib/profileScore";
import { storeMobileAccessToken } from "@/lib/api/runtime";

export default function LoginScreen() {
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

      const me = await getCurrentUser();
      const envelope =
        me && typeof me === "object" && "data" in me
          ? (me.data as unknown as Record<string, unknown>)
          : {};
      const profile =
        envelope.profile && typeof envelope.profile === "object"
          ? (envelope.profile as Record<string, unknown>)
          : {};
      const userSkills = await getUserSkills().catch(() => []);
      const completeness = computeProfileCompleteness(profile, userSkills);

      if (completeness < 45) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/(tabs)");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign in failed";
      setError(message);
    }
  };

  return (
    <LinearGradient
      colors={["#050D2A", "#0B1947"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#CCE7FF" />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(500)} style={styles.logoWrap}>
          <View style={styles.logoBadge}>
            <Image
              source={require("@/assets/images/logo-Photoroom.png")}
              contentFit="contain"
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subTitle}>Sign in to continue your SkillPulse journey.</Text>
        </Animated.View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#8CA5C5"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#8CA5C5"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.cta, loginMutation.isPending && styles.ctaDisabled]}
            onPress={submitLogin}
            disabled={loginMutation.isPending}
          >
            <Text style={styles.ctaText}>{loginMutation.isPending ? "Signing In..." : "Continue"}</Text>
            <Feather name="arrow-right" size={16} color="#01141A" />
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.authSwitch} onPress={() => router.push("/signup")}>
            <Text style={styles.note}>New to SkillPulse? Create your account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollView: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,182,236,0.4)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoWrap: {
    marginTop: 24,
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 98,
    height: 98,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(39,227,244,0.42)",
    backgroundColor: "rgba(8,24,61,0.72)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
  },
  logo: {
    width: 82,
    height: 82,
  },
  title: {
    color: "#F4FAFF",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
  },
  subTitle: {
    color: "rgba(214,231,253,0.9)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  formCard: {
    marginTop: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(93,126,177,0.58)",
    backgroundColor: "rgba(9,24,62,0.68)",
    padding: 18,
  },
  label: {
    color: "#C8DEF9",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(114,150,202,0.55)",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 12,
    color: "#ECF6FF",
    fontFamily: "Inter_500Medium",
  },
  cta: {
    marginTop: 20,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaDisabled: {
    opacity: 0.65,
  },
  ctaText: {
    color: "#01141A",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    color: "#FFD2D2",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
  },
  note: {
    marginTop: 12,
    color: "#A8C2E4",
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  authSwitch: {
    marginTop: 2,
  },
});
