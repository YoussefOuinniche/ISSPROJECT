import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
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
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 24,
          flexGrow: 1,
          justifyContent: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <Animated.View entering={FadeInUp.duration(450)} style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/logo-Photoroom.png")}
              contentFit="contain"
              style={styles.logo}
            />
          </Animated.View>
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
      </ScrollView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  heroBlock: {
    alignItems: "center",
    marginTop: 0,
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 188,
    height: 188,
  },
  actions: {
    marginTop: 36,
    gap: 14,
    width: "100%",
    alignSelf: "center",
  },
  primaryBtn: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  secondaryBtnText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  inlineLink: {
    alignItems: "center",
    paddingTop: 6,
  },
  inlineLinkText: {
    color: "#38414B",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
