import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInLeft, FadeInRight } from "react-native-reanimated";
import Markdown from "react-native-markdown-display";
import { LinearGradient } from "expo-linear-gradient";

import Colors from "@/constants/colors";
import { AppRadius, AppType, AppTheme } from "@/constants/theme";

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
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble, isUser && { overflow: "hidden" }]}>
        {isUser && (
          <LinearGradient
            colors={Colors.gradientAccentTertiary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Text style={[styles.label, isUser ? styles.userLabel : styles.aiLabel, { zIndex: 1 }]}>
          {isUser ? "You" : "SkillPulse AI"}
        </Text>
        
        {isUser ? (
          <Text style={[styles.userText, { zIndex: 1 }]}>{text}</Text>
        ) : (
          <Markdown style={markdownStyles}>
            {text}
          </Markdown>
        )}
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
    maxWidth: "88%",
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
  userText: {
    ...AppType.body,
    color: Colors.background,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    ...AppType.body,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  heading1: {
    fontFamily: AppTheme.fonts.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontFamily: AppTheme.fonts.bold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontFamily: AppTheme.fonts.semiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  strong: {
    fontFamily: AppTheme.fonts.bold,
    color: Colors.textPrimary,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: Colors.accentPrimary,
    textDecorationLine: 'underline',
  },
  bullet_list: {
    marginTop: 4,
    marginBottom: 10,
  },
  ordered_list: {
    marginTop: 4,
    marginBottom: 10,
  },
  list_item: {
    marginVertical: 3,
  },
  bullet_list_icon: {
    marginLeft: 4,
    marginRight: 6,
    color: Colors.textSecondary,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accentSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderRadius: AppRadius.sm,
  },
  code_inline: {
    fontFamily: AppTheme.fonts.mono,
    backgroundColor: Colors.backgroundSecondary,
    color: Colors.accentTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  code_block: {
    fontFamily: AppTheme.fonts.mono,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: AppRadius.md,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
  },
  fence: {
    fontFamily: AppTheme.fonts.mono,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    padding: 12,
    borderRadius: AppRadius.md,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
  },
});
