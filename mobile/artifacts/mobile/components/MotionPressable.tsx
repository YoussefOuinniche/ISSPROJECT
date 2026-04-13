import React, { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type MotionPressableProps = PressableProps & {
  children: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export function MotionPressable({
  children,
  containerStyle,
  onPressIn,
  onPressOut,
  ...pressableProps
}: MotionPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...pressableProps}
      onPressIn={(event) => {
        scale.value = withTiming(0.98, { duration: 120 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: 180 });
        onPressOut?.(event);
      }}
    >
      <Animated.View style={[containerStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
