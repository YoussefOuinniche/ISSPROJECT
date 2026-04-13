import React, { type ReactNode } from "react";
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
} from "react-native-reanimated";
import { type StyleProp, type ViewStyle } from "react-native";

type AnimatedSectionProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  variant?: "up" | "down" | "left" | "right";
};

function getEnteringAnimation(
  variant: AnimatedSectionProps["variant"],
  delay: number,
  duration: number
) {
  const animation =
    variant === "up"
      ? FadeInUp
      : variant === "left"
        ? FadeInLeft
        : variant === "right"
          ? FadeInRight
          : FadeInDown;

  return animation.duration(duration).delay(delay);
}

export function AnimatedSection({
  children,
  delay = 0,
  duration = 320,
  style,
  variant = "down",
}: AnimatedSectionProps) {
  return (
    <Animated.View entering={getEnteringAnimation(variant, delay, duration)} style={style}>
      {children}
    </Animated.View>
  );
}
