import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
}

export const ChatBubble = ({ text, isUser }: ChatBubbleProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 120, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  if (isUser) {
    return (
      <Animated.View style={[styles.row, styles.rowUser, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.userBubble}>
          <View style={styles.userBubbleAccent} />
          <Text style={styles.userText}>{text}</Text>
        </View>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>U</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.row, styles.rowAI, { opacity, transform: [{ translateY }] }]}>
      {/* AI square avatar */}
      <View style={styles.aiAvatarWrap}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarIcon}>AI</Text>
        </View>
        <View style={styles.aiOnlineDot} />
      </View>

      <View style={styles.aiContent}>
        <Text style={styles.aiLabel}>NEXAPATH_AI</Text>
        <View style={styles.aiBubble}>
          <View style={styles.aiBubbleAccent} />
          <Text style={styles.aiPrompt}>{'> '}</Text>
          <Text style={styles.aiText}>{text}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },

  // ── User bubble ──────────────────────────────────────────────────────────────
  userBubble: {
    maxWidth: "75%",
    backgroundColor: Colors.primary + "22",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + "55",
    borderBottomRightRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  userBubbleAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: Colors.primary,
  },
  userText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: MONO,
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
  userAvatarText: {
    fontFamily: MONO,
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // ── AI bubble ────────────────────────────────────────────────────────────────
  aiAvatarWrap: {
    marginRight: 8,
    marginBottom: 2,
    position: "relative",
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent + "50",
    alignItems: "center",
    justifyContent: "center",
  },
  aiAvatarIcon: {
    fontFamily: MONO,
    color: Colors.accent,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  aiOnlineDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: Colors.success,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  aiContent: { flex: 1, maxWidth: "82%" },
  aiLabel: {
    fontFamily: MONO,
    color: Colors.accent,
    fontSize: 8,
    letterSpacing: 1.5,
    marginBottom: 4,
    marginLeft: 2,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  aiBubbleAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.accent + "40",
  },
  aiPrompt: {
    fontFamily: MONO,
    color: Colors.accent,
    fontSize: 13,
    lineHeight: 21,
  },
  aiText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: MONO,
  },
});
