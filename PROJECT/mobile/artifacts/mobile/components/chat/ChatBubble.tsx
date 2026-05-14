import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { SANS_MED, SANS_REG, useTheme } from "@/constants/theme";

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
}

export const ChatBubble = ({ text, isUser }: ChatBubbleProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 120, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  if (isUser) {
    return (
      <Animated.View style={[styles.row, styles.rowUser, { opacity, transform: [{ translateY }] }]}>
        <View style={[styles.userBubble, { backgroundColor: theme.accent, shadowColor: theme.accent }]}>
          <Text style={[styles.userText, { color: theme.textOnAccent }]}>{text}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.row, styles.rowAI, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.aiAvatar, { backgroundColor: theme.accent + "14", borderColor: theme.accent + "35" }]}>
        <Text style={[styles.aiAvatarText, { color: theme.accent }]}>AI</Text>
      </View>
      <View style={styles.aiContent}>
        <Text style={[styles.aiLabel, { color: theme.textTertiary }]}>NexaPath Assistant</Text>
        <View style={[styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
          <Text style={[styles.aiText, { color: theme.textSecondary }]}>{text}</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 5,
    paddingHorizontal: 14,
  },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 18,
    borderBottomRightRadius: 6,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  userText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: SANS_MED,
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    marginBottom: 3,
  },
  aiAvatarText: {
    fontFamily: SANS_MED,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  aiContent: { flex: 1, maxWidth: "84%" },
  aiLabel: {
    fontFamily: SANS_MED,
    fontSize: 11,
    marginBottom: 5,
  },
  aiBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  aiText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: SANS_REG,
  },
});
