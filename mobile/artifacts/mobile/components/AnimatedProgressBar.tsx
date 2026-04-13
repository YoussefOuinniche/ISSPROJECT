import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

type AnimatedProgressBarProps = {
  value: number;
  delay?: number;
  duration?: number;
  height?: number;
  trackColor: string;
  fillColor: string;
  style?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
};

export function AnimatedProgressBar({
  value,
  delay = 0,
  duration = 420,
  height = 8,
  trackColor,
  fillColor,
  style,
  fillStyle,
}: AnimatedProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(Math.max(0, Math.min(100, value)), {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [delay, duration, progress, value]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: trackWidth * (progress.value / 100),
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: fillColor,
          },
          fillStyle,
          animatedFillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
  },
});
