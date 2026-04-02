import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRegisterAuth } from "@workspace/api-client-react";

import Colors from "@/constants/colors";
import { storeMobileAccessToken } from "@/lib/api/runtime";

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useRegisterAuth();

  const submitSignup = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await registerMutation.mutateAsync({
        data: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        },
      });

      const token = response?.data?.token;
      if (!token) {
        setError("Your account was created, but sign in could not be completed.");
        return;
      }

      await storeMobileAccessToken(token);
      router.replace("/onboarding");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to create account";
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
          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subTitle}>Start your personalized AI-powered career growth journey.</Text>
        </Animated.View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#8CA5C5"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
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
            placeholder="Minimum 6 characters"
            placeholderTextColor="#8CA5C5"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor="#8CA5C5"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Pressable
            style={[styles.cta, registerMutation.isPending && styles.ctaDisabled]}
            onPress={submitSignup}
            disabled={registerMutation.isPending}
          >
            <Text style={styles.ctaText}>{registerMutation.isPending ? "Creating Account..." : "Continue"}</Text>
            <Feather name="arrow-right" size={16} color="#01141A" />
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.authSwitch} onPress={() => router.push("/login")}>
            <Text style={styles.note}>Already have an account? Sign in</Text>
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
    width: 84,
    height: 84,
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
    marginTop: 30,
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
