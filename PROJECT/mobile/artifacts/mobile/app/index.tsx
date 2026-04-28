'use no memo';
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetCurrentUser } from "@workspace/api-client-react";

import Colors from "@/constants/colors";
import { getMobileAccessToken } from "@/lib/api/runtime";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const currentUserQuery = useGetCurrentUser();

  // Floating animation for logo
  const floatY = useSharedValue(0);
  // Pulsing ring scale
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);
  // Orb movements
  const orb1X = useSharedValue(0);
  const orb1Y = useSharedValue(0);
  const orb2X = useSharedValue(0);
  const orb2Y = useSharedValue(0);

  useEffect(() => {
    // Logo float
    floatY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Pulsing ring
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(1.0,  { duration: 1800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0,   { duration: 1800 }),
        withTiming(0.5, { duration: 1800 })
      ),
      -1,
      false
    );

    // Orb 1 drifting
    orb1X.value = withRepeat(
      withSequence(
        withTiming(30,  { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(20,  { duration: 3500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 3500, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );

    // Orb 2 drifting (offset phase)
    orb2X.value = withRepeat(
      withSequence(
        withTiming(-25, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(20,  { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(30,  { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        withTiming(-20, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0,   { duration: 4500, easing: Easing.inOut(Easing.sin) })
      ),
      -1, false
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const orb1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  useEffect(() => {
    let mounted = true;
    getMobileAccessToken()
      .then((token) => { if (mounted) setHasStoredSession(Boolean(token)); })
      .finally(() => { if (mounted) setIsBooting(false); });
    return () => { mounted = false; };
  }, []);

  const canAutoEnter = (() => {
    const envelope =
      currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
        ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
        : {};
    return Boolean(envelope.user);
  })();

  // Redirect: no stored token → login immediately after boot check
  useEffect(() => {
    if (isBooting) return;
    if (!hasStoredSession) {
      router.replace("/login");
      return;
    }
    // Has a stored token — wait for the server to validate it
    if (currentUserQuery.isLoading) return;
    if (canAutoEnter) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [isBooting, hasStoredSession, canAutoEnter, currentUserQuery.isLoading, currentUserQuery.isError]);

  // Show animated splash while determining auth state
  return (
    <LinearGradient
      colors={["#03071A", "#060D2B", "#0A1540"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      {/* Floating background orbs */}
      <Animated.View style={[styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb2, orb2Style]} />

      {/* Hero section */}
      <View style={styles.hero}>
        {/* Pulsing ring behind logo */}
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.pulseRing, ringAnimStyle]} />
          <Animated.View style={[styles.logoFrame, logoAnimStyle]}>
            <Image
              source={require("@/assets/images/logo-Photoroom.png")}
              contentFit="contain"
              style={styles.logo}
            />
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInUp.duration(600).delay(200)} style={styles.title}>
          NexaPath
        </Animated.Text>

        <Animated.Text entering={FadeInUp.duration(600).delay(350)} style={styles.tagline}>
          Your AI-powered career navigator
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  // Background orbs
  orb1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(39,227,244,0.07)",
    top: -60,
    left: -80,
  },
  orb2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(80,120,255,0.08)",
    bottom: 80,
    right: -60,
  },
  // Hero
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
    marginBottom: 8,
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(39,227,244,0.6)",
  },
  logoFrame: {
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: "rgba(5,17,46,0.85)",
    borderWidth: 1,
    borderColor: "rgba(39,227,244,0.45)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2BE6F6",
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
  },
  logo: {
    width: 110,
    height: 110,
  },
  title: {
    color: "#F3FAFF",
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textShadowColor: "rgba(39,227,244,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    color: "rgba(180,220,255,0.75)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
});
