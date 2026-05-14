import React, { useState } from "react";
import { Pressable, TextInput, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { SANS_REG, useTheme } from "@/constants/theme";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const theme = useTheme();
  const [text, setText] = useState("");
  const canSend = Boolean(text.trim() && !disabled);

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderTopColor: theme.borderSubtle }]}>
      <View style={[styles.inputWrap, { backgroundColor: theme.bg2, borderColor: theme.borderSubtle }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={text}
          onChangeText={setText}
          placeholder="Ask about your roadmap, skills, or next role..."
          placeholderTextColor={theme.textTertiary}
          multiline
          maxLength={500}
          editable={!disabled}
        />
      </View>
      <Pressable
        style={[
          styles.sendButton,
          { backgroundColor: canSend ? theme.accent : theme.borderSubtle },
          !canSend && styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Feather name="send" size={17} color={theme.textOnAccent} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    maxHeight: 126,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  input: {
    minHeight: 42,
    maxHeight: 112,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: SANS_REG,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.45 },
});
