import React, { type ReactNode } from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const authBackgroundImage = require("../assets/images/auth/auth-background.png");

type AuthBackgroundProps = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  overlayOpacity?: number;
};

export function AuthBackground({
  children,
  contentStyle,
  overlayOpacity = 0.26,
}: AuthBackgroundProps) {
  return (
    <ImageBackground
      source={authBackgroundImage}
      resizeMode="cover"
      style={styles.background}
      imageStyle={styles.image}
    >
      <View pointerEvents="none" style={[styles.overlay, { opacity: overlayOpacity }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#E9EDF2",
  },
  image: {
    backgroundColor: "#E9EDF2",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0F1D2E",
  },
  content: {
    flex: 1,
  },
});
