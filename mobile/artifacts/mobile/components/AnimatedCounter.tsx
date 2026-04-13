import React, { useEffect, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { Easing, runOnJS, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";

type AnimatedCounterProps = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  formatter?: (value: number) => string;
};

export function AnimatedCounter({
  value,
  duration = 420,
  prefix = "",
  suffix = "",
  style,
  formatter,
}: AnimatedCounterProps) {
  const progress = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [duration, progress, value]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setDisplayValue)(current);
      }
    }
  );

  const output = formatter ? formatter(displayValue) : String(displayValue);

  return (
    <Text style={style}>
      {prefix}
      {output}
      {suffix}
    </Text>
  );
}
