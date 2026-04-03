import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetCurrentUser } from "@workspace/api-client-react";

import Colors from "@/constants/colors";
import { getMobileAccessToken } from "@/lib/api/runtime";

const features = [
  "Measure your profile strength in real time",
  "Close skill gaps with AI-guided next steps",
  "Track market trends that match your career path",
  "Build a focused roadmap and keep progressing",
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [isBooting, setIsBooting] = useState(true);

  const currentUserQuery = useGetCurrentUser();

  useEffect(() => {
    let mounted = true;

    getMobileAccessToken()
      .then((token) => {
        if (!mounted) return;
        setHasStoredSession(Boolean(token));
      })
      .finally(() => {
        if (!mounted) return;
        setIsBooting(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const canAutoEnter = useMemo(() => {
    const envelope =
      currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
        ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
        : {};
    return Boolean(envelope.user);
  }, [currentUserQuery.data]);

  useEffect(() => {
    if (isBooting) return;
    if (!hasStoredSession) return;
    if (currentUserQuery.isLoading) return;
    if (!canAutoEnter) return;

    router.replace("/(tabs)");
  }, [isBooting, hasStoredSession, canAutoEnter, currentUserQuery.isLoading]);

  return (
    <LinearGradient
      colors={["#070E2A", "#0C1D56", "#0A1133"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 22,
          paddingHorizontal: 22,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Feather name="zap" size={14} color={Colors.primary} />
            <Text style={styles.badgeText}>AI Career Companion</Text>
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Animated.View entering={FadeInUp.duration(550)} style={styles.logoFrame}>
            <Image
              source={require("@/assets/images/logo-Photoroom.png")}
              contentFit="contain"
              style={styles.logo}
            />
          </Animated.View>
          <Text style={styles.title}>SkillPulse</Text>
          <Text style={styles.subtitle}>
            Build your next career move with personalized insights, practical learning paths, and real-time market intelligence.
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(550).delay(120)} style={styles.card}>
          {features.map((item) => (
            <View key={item} style={styles.featureRow}>
              <View style={styles.dot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </Animated.View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/login")}>
            <Text style={styles.primaryBtnText}>Log In</Text>
            <Feather name="arrow-right" size={16} color="#021B24" />
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={() => router.push("/signup")}>
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </Pressable>

          {hasStoredSession && !currentUserQuery.isLoading ? (
            <Pressable style={styles.inlineLink} onPress={() => router.replace("/(tabs)")}>
              <Text style={styles.inlineLinkText}>Continue with saved session</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topRow: {
    alignItems: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(39,227,244,0.35)",
    backgroundColor: "rgba(5,19,51,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    color: "#AEE8F4",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  heroBlock: {
    alignItems: "center",
    marginTop: 34,
    gap: 14,
  },
  logoFrame: {
    width: 136,
    height: 136,
    borderRadius: 28,
    backgroundColor: "rgba(5,17,46,0.72)",
    borderWidth: 1,
    borderColor: "rgba(39,227,244,0.4)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2BE6F6",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  logo: {
    width: 116,
    height: 116,
  },
  title: {
    color: "#F3FAFF",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  subtitle: {
    color: "rgba(223,241,255,0.88)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
    fontFamily: "Inter_400Regular",
  },
  card: {
    marginTop: 34,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(58,88,145,0.6)",
    backgroundColor: "rgba(11,26,70,0.55)",
    padding: 18,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
  featureText: {
    color: "#DDEEFF",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  actions: {
    marginTop: "auto",
    gap: 12,
    paddingTop: 30,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryBtnText: {
    color: "#021B24",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(147,173,212,0.45)",
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  secondaryBtnText: {
    color: "#CDE0FF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inlineLink: {
    alignItems: "center",
    paddingTop: 4,
  },
  inlineLinkText: {
    color: "#A8CCFF",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
