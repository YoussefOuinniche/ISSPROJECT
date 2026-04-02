import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

type BrandMarkProps = {
  size?: number;
  glow?: boolean;
  style?: ViewStyle;
};

export function BrandMark({ size = 96, glow = true, style }: BrandMarkProps) {
  const stroke = Math.max(2, Math.round(size * 0.04));

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          shadowOpacity: glow ? 0.4 : 0,
          shadowRadius: glow ? size * 0.22 : 0,
          shadowOffset: { width: 0, height: size * 0.08 },
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 128 128">
        <Rect
          x="8"
          y="8"
          width="112"
          height="112"
          rx="26"
          fill="#0B1A4A"
          stroke="#27E3F4"
          strokeWidth={stroke}
        />
        <Path
          d="M20 66 H40 L47 57 L59 73 L72 55 L81 66 H108"
          fill="none"
          stroke="#27E3F4"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M71 28 L51 72 H67 L58 102 L85 57 H70 Z"
          fill="#27E3F4"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: "#27E3F4",
    overflow: "visible",
  },
});
