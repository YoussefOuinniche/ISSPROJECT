'use no memo';
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInLeft,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGetCurrentUser } from "@workspace/api-client-react";

import { getMobileAccessToken } from "@/lib/api/runtime";

const BRAND_WORD = "NexaPath";
const WORD_STEPS = ["h", "th", "ath", "Path", "aPath", "xaPath", "exaPath", BRAND_WORD];
const STEP_DURATION = 260;
const FINAL_HOLD = 900;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [hasStoredSession, setHasStoredSession] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [wordStepIndex, setWordStepIndex] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);
  const currentUserQuery = useGetCurrentUser();

  // Subtle continuous motion keeps the splash alive while auth state is checked.
  const floatY = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  // Final brand lockup animation, played once the full word is visible.
  const wordScale = useSharedValue(1);
  const wordLift = useSharedValue(0);
  const glowProgress = useSharedValue(0);
  const underlineProgress = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.28, { duration: 1800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1800 }),
        withTiming(0.5, { duration: 1800 })
      ),
      -1,
      false
    );
  }, [floatY, ringOpacity, ringScale]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Exact requested construction: h -> th -> ath -> Path -> ... -> NexaPath.
    WORD_STEPS.forEach((_, index) => {
      timers.push(
        setTimeout(() => {
          setWordStepIndex(index);
        }, index * STEP_DURATION)
      );
    });

    timers.push(
      setTimeout(() => {
        glowProgress.value = withTiming(1, {
          duration: 420,
          easing: Easing.out(Easing.cubic),
        });
        underlineProgress.value = withTiming(1, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
        });
        wordLift.value = withSequence(
          withTiming(-5, { duration: 240, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) })
        );
        wordScale.value = withSequence(
          withTiming(1.07, { duration: 240, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })
        );
      }, WORD_STEPS.length * STEP_DURATION)
    );

    timers.push(
      setTimeout(() => {
        setAnimationDone(true);
      }, WORD_STEPS.length * STEP_DURATION + FINAL_HOLD)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [glowProgress, underlineProgress, wordLift, wordScale]);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const wordAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wordLift.value }, { scale: wordScale.value }],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowProgress.value, [0, 1], [0.12, 0.75]),
    transform: [{ scale: interpolate(glowProgress.value, [0, 1], [0.94, 1.08]) }],
  }));

  const underlineAnimStyle = useAnimatedStyle(() => ({
    opacity: glowProgress.value,
    transform: [{ scaleX: underlineProgress.value }],
  }));

  useEffect(() => {
    let mounted = true;
    getMobileAccessToken()
      .then((token) => {
        if (mounted) setHasStoredSession(Boolean(token));
      })
      .finally(() => {
        if (mounted) setIsBooting(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const canAutoEnter = (() => {
    const envelope =
      currentUserQuery.data && typeof currentUserQuery.data === "object" && "data" in currentUserQuery.data
        ? (currentUserQuery.data.data as unknown as Record<string, unknown>)
        : {};
    return Boolean(envelope.user);
  })();

  const displayedWord = WORD_STEPS[wordStepIndex];
  const previousWord = wordStepIndex > 0 ? WORD_STEPS[wordStepIndex - 1] : "";
  const incomingLetter = displayedWord.slice(0, displayedWord.length - previousWord.length);
  const stableSuffix = displayedWord.slice(incomingLetter.length);

  useEffect(() => {
    // Navigation waits for the animation, then follows the existing auth destination rules.
    if (!animationDone || isBooting) return;
    if (!hasStoredSession) {
      router.replace("/login");
      return;
    }
    if (currentUserQuery.isLoading) return;
    if (canAutoEnter) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [animationDone, isBooting, hasStoredSession, canAutoEnter, currentUserQuery.isLoading, currentUserQuery.isError]);

  return (
    <LinearGradient
      colors={["#03071A", "#060D2B", "#0A1540"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.topBeam} />
      <View style={styles.bottomBeam} />

      <View style={styles.hero}>
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

        <Animated.View
          entering={FadeInUp.duration(520).delay(120)}
          style={[styles.wordLockup, wordAnimStyle]}
          accessible
          accessibilityLabel={displayedWord}
        >
          <Animated.View style={[styles.wordGlow, glowAnimStyle]} />
          <View style={styles.wordTrack}>
            {incomingLetter ? (
              <Animated.Text
                key={`${wordStepIndex}-${incomingLetter}`}
                entering={FadeInLeft.duration(240).springify().damping(18)}
                style={[styles.title, styles.incomingLetter]}
              >
                {incomingLetter}
              </Animated.Text>
            ) : null}
            <Text style={styles.title}>{stableSuffix}</Text>
          </View>
          <Animated.View style={[styles.underline, underlineAnimStyle]} />
        </Animated.View>

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
  topBeam: {
    position: "absolute",
    top: 88,
    left: -40,
    right: -40,
    height: 1,
    backgroundColor: "rgba(78, 209, 220, 0.18)",
    transform: [{ rotate: "-12deg" }],
  },
  bottomBeam: {
    position: "absolute",
    left: -80,
    right: -80,
    bottom: 116,
    height: 1,
    backgroundColor: "rgba(135, 162, 255, 0.16)",
    transform: [{ rotate: "-12deg" }],
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 138,
    height: 138,
    marginBottom: 4,
  },
  pulseRing: {
    position: "absolute",
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 2,
    borderColor: "rgba(56, 213, 224, 0.48)",
  },
  logoFrame: {
    width: 112,
    height: 112,
    borderRadius: 28,
    backgroundColor: "rgba(5, 17, 46, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(56, 213, 224, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2BE6F6",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  logo: {
    width: 94,
    height: 94,
  },
  wordLockup: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 66,
  },
  wordGlow: {
    position: "absolute",
    width: 236,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(43, 230, 246, 0.18)",
  },
  wordTrack: {
    width: 236,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  title: {
    color: "#F3FAFF",
    fontSize: 42,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
    textShadowColor: "rgba(39, 227, 244, 0.34)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  incomingLetter: {
    color: "#FFFFFF",
    textShadowColor: "rgba(94, 245, 255, 0.82)",
    textShadowRadius: 18,
  },
  underline: {
    width: 164,
    height: 2,
    borderRadius: 2,
    marginTop: 7,
    backgroundColor: "#35DDEB",
    shadowColor: "#35DDEB",
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  tagline: {
    color: "rgba(202, 226, 245, 0.72)",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0,
  },
});
