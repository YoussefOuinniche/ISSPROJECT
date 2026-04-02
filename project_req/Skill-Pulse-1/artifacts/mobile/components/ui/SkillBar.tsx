import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";

type SkillBarProps = {
  label?: string;
  current: number;
  target?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  style?: ViewStyle;
  animate?: boolean;
};

export function SkillBar({
  label,
  current,
  target,
  color = Colors.primary,
  height = 8,
  showLabel = true,
  showPercentage = true,
  style,
  animate = true,
}: SkillBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedTargetWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animate) {
      Animated.spring(animatedWidth, {
        toValue: current,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
        delay: 100,
      }).start();
      if (target !== undefined) {
        Animated.spring(animatedTargetWidth, {
          toValue: target,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
          delay: 150,
        }).start();
      }
    } else {
      animatedWidth.setValue(current);
      if (target !== undefined) animatedTargetWidth.setValue(target);
    }
  }, [current, target, animate]);

  const currentWidth = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const targetWidth = animatedTargetWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, style]}>
      {(showLabel || showPercentage) && (
        <View style={styles.header}>
          {showLabel && label && (
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
          )}
          {showPercentage && (
            <Text style={[styles.percentage, { color }]}>{current}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        {target !== undefined && (
          <Animated.View
            style={[
              styles.targetBar,
              {
                width: targetWidth,
                height,
                backgroundColor: color + "30",
                borderRadius: height / 2,
              },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.bar,
            {
              width: currentWidth,
              height,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  track: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 100,
    overflow: "hidden",
    position: "relative",
  },
  targetBar: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
