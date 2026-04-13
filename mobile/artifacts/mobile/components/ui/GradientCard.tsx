import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";

type GradientCardProps = {
  children: React.ReactNode;
  gradient?: [string, string];
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
};

export function GradientCard({
  children,
  gradient = Colors.gradientPrimary,
  style,
  padding = 20,
  radius = 20,
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: radius, padding }, style]}
    >
      {children}
    </LinearGradient>
  );
}

export function GlassCard({
  children,
  style,
  padding = 20,
  radius = 20,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
}) {
  return (
    <View
      style={[
        styles.glassCard,
        { borderRadius: radius, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
  },
  glassCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
});
