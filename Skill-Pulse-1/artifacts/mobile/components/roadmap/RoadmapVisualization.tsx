import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import Colors from "@/constants/colors";

export type VisualizationType = "roadmap" | "bar_chart" | "radar";

export type VisualizationDatum = {
  label: string;
  value?: number | null;
  items: string[];
  color?: string | null;
};

export type VisualizationStage = {
  title: string;
  items: string[];
};

export type VisualizationPayload = {
  type: VisualizationType;
  title: string;
  data: VisualizationDatum[];
  stages: VisualizationStage[];
};

type RoadmapVisualizationProps = {
  visualization: VisualizationPayload;
};

const DEFAULT_SERIES_COLORS = ["#2BE6F6", "#3E8CFF", "#8D7CFF", "#10B981", "#F59E0B"];

function getSeriesColor(index: number, color?: string | null) {
  return color || DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];
}

function formatValue(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

function RoadmapTimeline({ visualization }: RoadmapVisualizationProps) {
  const stages =
    visualization.stages.length > 0
      ? visualization.stages
      : visualization.data.map((item) => ({
          title: item.label,
          items: item.items,
        }));

  if (stages.length === 0) {
    return <Text style={styles.emptyStateText}>No roadmap stages are available yet.</Text>;
  }

  return (
    <View style={styles.timeline}>
      {stages.map((stage, index) => (
        <View key={`${stage.title}-${index}`} style={styles.timelineRow}>
          <View style={styles.timelineRail}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: getSeriesColor(index, visualization.data[index]?.color) },
              ]}
            />
            {index < stages.length - 1 ? <View style={styles.timelineLine} /> : null}
          </View>

          <View style={styles.timelineBody}>
            <View style={styles.timelineStagePill}>
              <Text style={styles.timelineStagePillText}>{stage.title}</Text>
            </View>
            <View style={styles.timelineItems}>
              {stage.items.slice(0, 4).map((item, itemIndex) => (
                <View key={`${stage.title}-${itemIndex}`} style={styles.timelineItemChip}>
                  <Text style={styles.timelineItemChipText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function BarChart({ visualization }: RoadmapVisualizationProps) {
  const numericData = visualization.data
    .map((item, index) => ({
      ...item,
      value: Number(item.value),
      color: getSeriesColor(index, item.color),
    }))
    .filter((item) => Number.isFinite(item.value));

  if (numericData.length === 0) {
    return <Text style={styles.emptyStateText}>No chart data is available yet.</Text>;
  }

  const maxValue = Math.max(...numericData.map((item) => item.value), 1);

  return (
    <View style={styles.chartList}>
      {numericData.map((item) => {
        const widthPercent = Math.max(10, (item.value / maxValue) * 100);
        return (
          <View key={item.label} style={styles.chartRow}>
            <View style={styles.chartRowHeader}>
              <Text style={styles.chartLabel}>{item.label}</Text>
              <Text style={styles.chartValue}>{formatValue(item.value)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${widthPercent}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RadarChart({ visualization }: RoadmapVisualizationProps) {
  const numericData = visualization.data
    .map((item, index) => ({
      ...item,
      value: Number(item.value),
      color: getSeriesColor(index, item.color),
    }))
    .filter((item) => Number.isFinite(item.value))
    .slice(0, 6);

  if (numericData.length < 3) {
    return <Text style={styles.emptyStateText}>Radar data needs at least three dimensions.</Text>;
  }

  const size = 240;
  const center = size / 2;
  const radius = 84;
  const maxValue = Math.max(...numericData.map((item) => item.value), 1);
  const levels = 4;

  const pointFor = (itemIndex: number, value: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * itemIndex) / numericData.length;
    const scaledRadius = radius * (value / maxValue);
    return {
      x: center + Math.cos(angle) * scaledRadius,
      y: center + Math.sin(angle) * scaledRadius,
    };
  };

  const polygonPoints = numericData.map((item, index) => pointFor(index, item.value));
  const polygonString = polygonPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <View style={styles.radarWrap}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: levels }).map((_, levelIndex) => {
          const levelRatio = (levelIndex + 1) / levels;
          const points = numericData
            .map((_, pointIndex) => pointFor(pointIndex, maxValue * levelRatio))
            .map((point) => `${point.x},${point.y}`)
            .join(" ");

          return (
            <Polygon
              key={`grid-${levelIndex}`}
              points={points}
              fill="none"
              stroke={Colors.border}
              strokeWidth={1}
            />
          );
        })}

        {numericData.map((item, index) => {
          const edgePoint = pointFor(index, maxValue);
          return (
            <Line
              key={`axis-${item.label}`}
              x1={center}
              y1={center}
              x2={edgePoint.x}
              y2={edgePoint.y}
              stroke={Colors.border}
              strokeWidth={1}
            />
          );
        })}

        <Polygon
          points={polygonString}
          fill="rgba(43, 230, 246, 0.20)"
          stroke={Colors.primary}
          strokeWidth={3}
        />

        {polygonPoints.map((point, index) => (
          <Circle
            key={`point-${numericData[index]?.label || index}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={numericData[index]?.color || Colors.primary}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </Svg>

      <View style={styles.radarLegend}>
        {numericData.map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>
              {item.label} · {formatValue(item.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function RoadmapVisualization({ visualization }: RoadmapVisualizationProps) {
  if (visualization.type === "bar_chart") {
    return <BarChart visualization={visualization} />;
  }

  if (visualization.type === "radar") {
    return <RadarChart visualization={visualization} />;
  }

  return <RoadmapTimeline visualization={visualization} />;
}

const styles = StyleSheet.create({
  timeline: {
    gap: 8,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  timelineRail: {
    width: 28,
    alignItems: "center",
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.92)",
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  timelineLine: {
    marginTop: 6,
    width: 3,
    flex: 1,
    borderRadius: 999,
    backgroundColor: Colors.border,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 18,
  },
  timelineStagePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  timelineStagePillText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.primaryDark,
  },
  timelineItems: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timelineItemChip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: "100%",
  },
  timelineItemChipText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  chartList: {
    gap: 14,
  },
  chartRow: {
    gap: 8,
  },
  chartRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  chartLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textPrimary,
  },
  chartValue: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  barTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: Colors.backgroundSecondary,
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  radarWrap: {
    alignItems: "center",
  },
  radarLegend: {
    width: "100%",
    marginTop: 12,
    gap: 8,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendLabel: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
});
