import React from "react";
import LottieView, { type AnimationObject } from "lottie-react-native";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type LottieAccentProps = {
  source: string | AnimationObject | { uri: string };
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  speed?: number;
  style?: StyleProp<ViewStyle>;
};

export function LottieAccent({
  source,
  size = 88,
  loop = true,
  autoPlay = true,
  speed = 1,
  style,
}: LottieAccentProps) {
  return (
    <View pointerEvents="none" style={[styles.container, { width: size, height: size }, style]}>
      <LottieView
        autoPlay={autoPlay}
        loop={loop}
        speed={speed}
        source={source}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  animation: {
    width: "100%",
    height: "100%",
  },
});
