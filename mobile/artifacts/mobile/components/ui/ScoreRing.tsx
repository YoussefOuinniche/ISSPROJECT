import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreRingProps = {
  score: number;
  size?: number;
  strokeWidth?: number;
  primaryColor?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
};

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  primaryColor = Colors.primary,
  trackColor = Colors.backgroundSecondary,
  label,
  sublabel,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * progress.value) / 100,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          animatedProps={animatedProps}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      <View style={styles.content}>
        <AnimatedCounter style={[styles.scoreText, { color: Colors.textPrimary }]} value={score} />
        {label && <Text style={styles.label}>{label}</Text>}
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
  },
  label: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sublabel: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
});
