import React from "react";
import { DimensionValue, StyleSheet, Text, View, ViewStyle } from "react-native";
import Colors from "@/constants/colors";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { AnimatedProgressBar } from "@/components/AnimatedProgressBar";

type SkillBarProps = {
  label?: string;
  current: number;
  target?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  showPercentage?: boolean;
  style?: ViewStyle;
  animate?: boolean;
};

export function SkillBar({
  label,
  current,
  target,
  color = Colors.primary,
  height = 8,
  showLabel = true,
  showPercentage = true,
  style,
  animate = true,
}: SkillBarProps) {
  return (
    <View style={[styles.container, style]}>
      {(showLabel || showPercentage) && (
        <View style={styles.header}>
          {showLabel && label && (
            <Text style={styles.label} numberOfLines={1}>{label}</Text>
          )}
          {showPercentage && (
            <AnimatedCounter style={[styles.percentage, { color }]} value={current} suffix="%" />
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        {target !== undefined && (
          <AnimatedProgressBar
            value={target}
            height={height}
            delay={animate ? 120 : 0}
            duration={animate ? 440 : 0}
            trackColor="transparent"
            fillColor={color + "30"}
            style={styles.absoluteFill}
          />
        )}
        <AnimatedProgressBar
          value={current}
          height={height}
          delay={animate ? 40 : 0}
          duration={animate ? 480 : 0}
          trackColor="transparent"
          fillColor={color}
          style={styles.absoluteFill}
        />
      </View>
    </View>
  );
}

type TrendBarProps = {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
  muted?: boolean;
  style?: ViewStyle;
};

export function TrendBar({
  label,
  value,
  maxValue,
  color = Colors.textPrimary,
  muted = false,
  style,
}: TrendBarProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const safeMax = Number.isFinite(maxValue) ? Math.max(1, maxValue) : 1;
  const widthPercent: DimensionValue = `${Math.max(10, Math.round((safeValue / safeMax) * 100))}%`;

  return (
    <View style={[styles.trendContainer, style]}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.trendValue}>{safeValue}</Text>
      </View>

      <View style={styles.trendTrack}>
        <View
          style={[
            styles.trendFill,
            {
              width: widthPercent,
              backgroundColor: muted ? Colors.textTertiary : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  track: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 100,
    overflow: "hidden",
    position: "relative",
  },
  absoluteFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  trendContainer: {
    width: "100%",
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  trendLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textPrimary,
    fontFamily: "Inter_500Medium",
  },
  trendValue: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
    fontFamily: "Inter_700Bold",
  },
  trendTrack: {
    height: 8,
    borderRadius: 100,
    backgroundColor: Colors.borderLight,
    overflow: "hidden",
  },
  trendFill: {
    height: "100%",
    borderRadius: 100,
  },
});
