import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

function TypingDot({ delay = 0 }: { delay?: number }) {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
          withTiming(0.3, { duration: 280, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        false
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-2, { duration: 280, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 280, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export const TypingIndicator = () => {
  return (
    <View style={styles.container}>
      <TypingDot delay={0} />
      <TypingDot delay={120} />
      <TypingDot delay={240} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 24,
    backgroundColor: Colors.surface,
    alignSelf: "flex-start",
    borderRadius: 20,
    marginLeft: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginHorizontal: 3,
  },
});
