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
import { AppRadius, AppSpacing, AppType } from "@/constants/theme";

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
    ...AppType.label,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: AppSpacing.md,
    color: Colors.textPrimary,
    fontFamily: AppType.body.fontFamily,
    fontSize: AppType.body.fontSize,
  },
  inputFocused: {
    borderColor: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  hint: {
    ...AppType.caption,
    color: Colors.textTertiary,
    marginTop: 6,
  },
  error: {
    ...AppType.caption,
    color: Colors.danger,
    marginTop: 6,
  },
});
