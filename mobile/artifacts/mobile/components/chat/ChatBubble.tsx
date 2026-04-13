import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { AppRadius, AppType } from "@/constants/theme";

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
}

export const ChatBubble = ({ text, isUser }: ChatBubbleProps) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.label, isUser ? styles.userLabel : styles.aiLabel]}>
          {isUser ? "You" : "SkillPulse AI"}
        </Text>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>{text}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 6,
    flexDirection: "row",
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  aiContainer: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: AppRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.textPrimary,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 6,
  },
  label: {
    ...AppType.caption,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  userLabel: {
    color: "rgba(255,255,255,0.72)",
  },
  aiLabel: {
    color: Colors.textTertiary,
  },
  text: {
    ...AppType.body,
  },
  userText: {
    color: Colors.textInverse,
  },
  aiText: {
    color: Colors.textPrimary,
  },
});
