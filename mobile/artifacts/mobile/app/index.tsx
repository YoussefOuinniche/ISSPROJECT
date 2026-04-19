import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetCurrentUser } from "@workspace/api-client-react";

import { AuthBackground } from "@/components/AuthBackground";
import { MotionPressable } from "@/components/MotionPressable";
import Colors from "@/constants/colors";
import { getMobileAccessToken } from "@/lib/api/runtime";
import { LinearGradient } from "expo-linear-gradient";

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
    <AuthBackground>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 20,
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shell}>
          <Animated.View entering={FadeInUp.duration(450)} style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/logo-nexapath.png")}
              contentFit="contain"
              style={styles.logo}
            />
          </Animated.View>

          <View style={styles.heroBlock}>
            <Text style={styles.eyebrow}>Welcome to Nexapath</Text>
            <Text style={styles.title}>Build your path with clarity.</Text>
          </View>

          <View style={styles.actions}>
            <MotionPressable
              containerStyle={[styles.primaryBtn, { overflow: "hidden" }]}
              onPress={() => router.push("/login")}
            >
              <LinearGradient
                colors={Colors.gradientAccentTertiary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={[styles.primaryBtnText, { zIndex: 1 }]}>Log In</Text>
            </MotionPressable>

            <MotionPressable
              containerStyle={styles.secondaryBtn}
              onPress={() => router.push("/signup")}
            >
              <Text style={styles.secondaryBtnText}>Create Account</Text>
            </MotionPressable>

            {hasStoredSession && !currentUserQuery.isLoading ? (
              <MotionPressable
                containerStyle={styles.inlineLink}
                onPress={() => router.replace("/(tabs)")}
              >
                <Text style={styles.inlineLinkText}>Continue with saved session</Text>
              </MotionPressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  shell: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  heroBlock: {
    marginTop: 8,
    marginBottom: 32,
    gap: 8,
    alignItems: "center",
  },
  logoWrap: {
    marginBottom: 24,
    alignItems: "center",
  },
  logo: {
    width: 112,
    height: 112,
  },
  eyebrow: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 36,
    lineHeight: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    textAlign: "center",
  },
  actions: {
    gap: 14,
    width: "100%",
  },
  primaryBtn: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 18,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  secondaryBtnText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inlineLink: {
    alignItems: "center",
    paddingTop: 6,
  },
  inlineLinkText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
