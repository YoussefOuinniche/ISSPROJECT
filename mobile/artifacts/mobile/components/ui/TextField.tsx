import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

import Colors from "@/constants/colors";
import { AppRadius, AppSpacing } from "@/constants/theme";

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  error,
  hint,
  containerStyle,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        placeholderTextColor={Colors.textTertiary}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          props.style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    minHeight: 56,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: AppSpacing.lg,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  inputFocused: {
    borderColor: Colors.accentTertiary,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textTertiary,
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.danger,
    marginTop: 6,
  },
});
