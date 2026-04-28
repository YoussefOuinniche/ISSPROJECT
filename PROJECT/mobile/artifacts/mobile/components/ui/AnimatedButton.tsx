import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native";

type AnimatedButtonProps = PressableProps & {
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export function AnimatedButton({
  containerStyle,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn: PressableProps["onPressIn"] = (event) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 35,
      bounciness: 0,
    }).start();
    onPressIn?.(event);
  };

  const handlePressOut: PressableProps["onPressOut"] = (event) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
    onPressOut?.(event);
  };

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}> 
      <Pressable {...props} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
