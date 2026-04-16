import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { AppRadius, AppType } from "@/constants/theme";

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
  index?: number;
}

export const ChatBubble = ({ text, isUser, index = 0 }: ChatBubbleProps) => {
  const enterDelay = isUser ? 0 : Math.min(index, 8) * 28;
  const enteringAnimation = (isUser ? FadeInRight : FadeInLeft)
    .springify()
    .damping(16)
    .stiffness(180)
    .delay(enterDelay);

  return (
    <Animated.View
      entering={enteringAnimation}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.label, isUser ? styles.userLabel : styles.aiLabel]}>
          {isUser ? "You" : "NexaPath AI"}
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
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: Colors.accentTertiary,
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
    color: Colors.background,
  },
  aiLabel: {
    color: Colors.textTertiary,
  },
  text: {
    ...AppType.body,
  },
  userText: {
    color: Colors.background,
  },
  aiText: {
    color: Colors.textPrimary,
  },
});
