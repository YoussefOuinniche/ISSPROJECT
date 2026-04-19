import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";

type AuthBackgroundProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  overlayOpacity?: number;
};

export function AuthBackground({
  children,
  contentStyle,
}: AuthBackgroundProps) {
  return (
    <View style={styles.background}>
      <LinearGradient
        colors={["#F8FAFC", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View pointerEvents="none" style={styles.overlay} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlay: {
    position: "absolute",
    top: -120,
    left: -30,
    right: -30,
    height: 260,
    backgroundColor: "rgba(30, 58, 138, 0.06)",
    borderBottomLeftRadius: 220,
    borderBottomRightRadius: 220,
  },
  content: {
    flex: 1,
  },
});
