import React, { useState } from "react";
import { Platform, Pressable, Text, View, TextInput, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{">"}</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="ask nexapath_ai_"
        placeholderTextColor={Colors.textTertiary}
        multiline
        maxLength={500}
        editable={!disabled}
      />
      <Pressable
        style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <LinearGradient
          colors={text.trim() && !disabled ? [Colors.primary, Colors.primaryDark] : [Colors.borderSubtle, Colors.borderSubtle]}
          style={styles.sendGrad}
        >
          <Feather name="send" size={14} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: 8,
  },
  prompt: {
    fontFamily: MONO,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.background2,
    borderRadius: 5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: MONO,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 5,
    overflow: "hidden",
  },
  sendButtonDisabled: { opacity: 0.35 },
  sendGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
