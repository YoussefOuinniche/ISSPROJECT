import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

interface ChatBubbleProps {
  text: string;
  isUser: boolean;
}

export const ChatBubble = ({ text, isUser }: ChatBubbleProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 120,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 90,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <LinearGradient
        colors={isUser ? [Colors.primary, Colors.accent] : ["#FFFFFF", "#ECF7FF", "#E2F0FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}
      >
        <View style={styles.labelRow}>
          <View
            style={[
              styles.labelDot,
              { backgroundColor: isUser ? "rgba(255,255,255,0.92)" : Colors.primary },
            ]}
          />
          <Text style={[styles.label, isUser ? styles.userLabel : styles.aiLabel]}>
            {isUser ? "You" : "SkillPulse AI"}
          </Text>
        </View>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
          {text}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 10,
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
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    shadowColor: Colors.accent,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(43, 230, 246, 0.24)",
    shadowColor: Colors.primaryDark,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  userLabel: {
    color: "rgba(255,255,255,0.92)",
  },
  aiLabel: {
    color: Colors.primaryDark,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.textInverse,
  },
  aiText: {
    color: Colors.textPrimary,
  },
});
