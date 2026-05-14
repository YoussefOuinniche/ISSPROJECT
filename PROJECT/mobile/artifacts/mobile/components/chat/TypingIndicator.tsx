import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "@/constants/theme";

export const TypingIndicator = () => {
  const theme = useTheme();
  const opacities = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animations = opacities.map((opacity, idx) => {
      return Animated.sequence([
        Animated.delay(idx * 150),
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    });

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
      {opacities.map((opacity, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity, backgroundColor: theme.accent }]} />
      ))}
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
    alignSelf: "flex-start",
    borderRadius: 20,
    marginLeft: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});
