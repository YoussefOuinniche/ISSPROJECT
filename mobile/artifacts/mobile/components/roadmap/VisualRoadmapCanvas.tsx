import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Line } from "react-native-svg";

import { VisualRoadmapNode, getRoadmapNodeSize } from "@/components/roadmap/VisualRoadmapNode";
import Colors from "@/constants/colors";
import type {
  VisualRoadmap,
  VisualRoadmapConnection,
  VisualRoadmapNode as VisualRoadmapNodeShape,
} from "@/lib/roadmap/roadmapTypes";

const CONNECTOR_COLOR = Colors.accent;
const VIEWPORT_MIN_HEIGHT = 420;
const VIEWPORT_MAX_HEIGHT = 640;
const BOARD_PADDING = 80;
const RELATED_BOX_WIDTH = 216;
const RELATED_BOX_GAP = 28;
const BOARD_MIN_WIDTH = 860;
const BOARD_MIN_HEIGHT = 720;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.2;

type VisualRoadmapCanvasProps = {
  roadmap: VisualRoadmap;
  relatedRoadmaps?: VisualRoadmap[];
  onNodePress?: (node: VisualRoadmapNodeShape) => void;
};

type RoadmapCanvasMetrics = {
  boardWidth: number;
  boardHeight: number;
  nodes: VisualRoadmapNodeShape[];
  relatedBoxLeft: number;
  relatedBoxTop: number;
  showRelatedBox: boolean;
};

function prettifyRoadmapName(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getConnectionPoints(
  fromNode: VisualRoadmapNodeShape,
  toNode: VisualRoadmapNodeShape,
  connection: VisualRoadmapConnection
) {
  const fromSize = getRoadmapNodeSize(fromNode.type);
  const toSize = getRoadmapNodeSize(toNode.type);

  if (connection.type === "solid") {
    return {
      x1: fromNode.x,
      y1: fromNode.y + fromSize.height / 2,
      x2: toNode.x,
      y2: toNode.y - toSize.height / 2,
    };
  }

  const movingLeft = toNode.x < fromNode.x;

  return {
    x1: fromNode.x + (movingLeft ? -fromSize.width / 2 : fromSize.width / 2),
    y1: fromNode.y,
    x2: toNode.x + (movingLeft ? toSize.width / 2 : -toSize.width / 2),
    y2: toNode.y,
  };
}

function computeCanvasMetrics(
  nodes: VisualRoadmapNodeShape[],
  showRelatedBox: boolean
): RoadmapCanvasMetrics {
  if (nodes.length === 0) {
    const boardWidth = BOARD_MIN_WIDTH;
    const boardHeight = BOARD_MIN_HEIGHT;
    return {
      boardWidth,
      boardHeight,
      nodes: [],
      relatedBoxLeft: boardWidth - BOARD_PADDING - RELATED_BOX_WIDTH,
      relatedBoxTop: BOARD_PADDING,
      showRelatedBox,
    };
  }

  let minLeft = Number.POSITIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let maxBottom = Number.NEGATIVE_INFINITY;

  nodes.forEach((node) => {
    const size = getRoadmapNodeSize(node.type);
    minLeft = Math.min(minLeft, node.x - size.width / 2);
    minTop = Math.min(minTop, node.y - size.height / 2);
    maxRight = Math.max(maxRight, node.x + size.width / 2);
    maxBottom = Math.max(maxBottom, node.y + size.height / 2);
  });

  const translateX = BOARD_PADDING - minLeft;
  const translateY = BOARD_PADDING - minTop;
  const translatedNodes = nodes.map((node) => ({
    ...node,
    x: node.x + translateX,
    y: node.y + translateY,
  }));

  const translatedMaxRight = maxRight + translateX;
  const translatedMaxBottom = maxBottom + translateY;
  const relatedExtra = showRelatedBox ? RELATED_BOX_WIDTH + RELATED_BOX_GAP : 0;
  const boardWidth = Math.max(
    translatedMaxRight + BOARD_PADDING + relatedExtra,
    BOARD_MIN_WIDTH
  );
  const boardHeight = Math.max(translatedMaxBottom + BOARD_PADDING, BOARD_MIN_HEIGHT);

  return {
    boardWidth,
    boardHeight,
    nodes: translatedNodes,
    relatedBoxLeft: boardWidth - BOARD_PADDING - RELATED_BOX_WIDTH,
    relatedBoxTop: BOARD_PADDING,
    showRelatedBox,
  };
}

function getZoomPercent(scale: number) {
  const percent = ((scale - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

export function VisualRoadmapCanvas({
  roadmap,
  relatedRoadmaps = [],
  onNodePress,
}: VisualRoadmapCanvasProps) {
  const { height: windowHeight } = useWindowDimensions();
  const canvasHeight = useMemo(
    () =>
      Math.max(
        VIEWPORT_MIN_HEIGHT,
        Math.min(VIEWPORT_MAX_HEIGHT, Math.round(windowHeight * 0.58))
      ),
    [windowHeight]
  );

  const showRelatedBox = roadmap.relatedRoadmaps.length > 0;
  const metrics = useMemo(
    () => computeCanvasMetrics(roadmap.nodes, showRelatedBox),
    [roadmap.nodes, showRelatedBox]
  );
  const translatedNodeMap = useMemo(
    () => new Map(metrics.nodes.map((node) => [node.id, node])),
    [metrics.nodes]
  );

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const savedPanX = useSharedValue(0);
  const savedPanY = useSharedValue(0);
  const [displayScale, setDisplayScale] = useState(1);

  const fitScale = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) return 1;
    const raw = Math.min(
      (viewportSize.width - 24) / metrics.boardWidth,
      (viewportSize.height - 24) / metrics.boardHeight
    );
    return Math.max(MIN_ZOOM, Math.min(1, raw));
  }, [
    viewportSize.width,
    viewportSize.height,
    metrics.boardWidth,
    metrics.boardHeight,
  ]);

  useEffect(() => {
    if (!viewportSize.width || !viewportSize.height) return;
    scale.value = fitScale;
    savedScale.value = fitScale;
    panX.value = 0;
    panY.value = 0;
    savedPanX.value = 0;
    savedPanY.value = 0;
    setDisplayScale(fitScale);
    // Intentionally resetting pan/zoom only when the roadmap identity or viewport changes.
  }, [fitScale, roadmap.id, viewportSize.width, viewportSize.height]);

  const composedGesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart(() => {
        "worklet";
        savedScale.value = scale.value;
      })
      .onUpdate((event) => {
        "worklet";
        const next = savedScale.value * event.scale;
        scale.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
      })
      .onEnd(() => {
        "worklet";
        savedScale.value = scale.value;
        runOnJS(setDisplayScale)(scale.value);
      });

    const pan = Gesture.Pan()
      .minPointers(2)
      .maxPointers(2)
      .onStart(() => {
        "worklet";
        savedPanX.value = panX.value;
        savedPanY.value = panY.value;
      })
      .onUpdate((event) => {
        "worklet";
        panX.value = savedPanX.value + event.translationX;
        panY.value = savedPanY.value + event.translationY;
      })
      .onEnd(() => {
        "worklet";
        savedPanX.value = panX.value;
        savedPanY.value = panY.value;
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [scale, savedScale, panX, panY, savedPanX, savedPanY]);

  const boardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value },
      { translateY: panY.value },
      { scale: scale.value },
    ],
  }));

  const applyZoom = (next: number) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    scale.value = withTiming(clamped, { duration: 160 });
    savedScale.value = clamped;
    setDisplayScale(clamped);
  };

  const zoomIn = () => applyZoom(displayScale + ZOOM_STEP);
  const zoomOut = () => applyZoom(displayScale - ZOOM_STEP);
  const resetFit = () => {
    if (!viewportSize.width || !viewportSize.height) return;
    scale.value = withTiming(fitScale, { duration: 200 });
    panX.value = withTiming(0, { duration: 200 });
    panY.value = withTiming(0, { duration: 200 });
    savedScale.value = fitScale;
    savedPanX.value = 0;
    savedPanY.value = 0;
    setDisplayScale(fitScale);
  };

  const isFitActive = Math.abs(displayScale - fitScale) < 0.01;
  const zoomPercent = getZoomPercent(displayScale);

  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewportSize({ width, height });
  };

  const boardLeft =
    viewportSize.width > 0 ? (viewportSize.width - metrics.boardWidth) / 2 : 0;
  const boardTop =
    viewportSize.height > 0 ? (viewportSize.height - metrics.boardHeight) / 2 : 0;

  const relatedLabels = roadmap.relatedRoadmaps.map((id) => {
    const match = relatedRoadmaps.find((item) => item.id === id);
    return match?.role || prettifyRoadmapName(id);
  });

  if (roadmap.nodes.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>No roadmap nodes available.</Text>
        <Text style={styles.stateText}>
          This roadmap is valid but it does not contain any visual nodes yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.toolbar}>
        <Pressable
          style={[styles.toolbarButton, isFitActive && styles.toolbarButtonActive]}
          onPress={resetFit}
        >
          <Text style={[styles.toolbarButtonText, isFitActive && styles.toolbarButtonTextActive]}>
            Fit
          </Text>
        </Pressable>

        <View style={styles.zoomGroup}>
          <Pressable style={styles.iconButton} onPress={zoomOut}>
            <Feather name="minus" size={14} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.zoomLabel}>{zoomPercent}%</Text>
          <Pressable style={styles.iconButton} onPress={zoomIn}>
            <Feather name="plus" size={14} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View
        style={[styles.viewport, { height: canvasHeight }]}
        onLayout={onViewportLayout}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={styles.gestureSurface}>
            {viewportSize.width > 0 ? (
              <Animated.View
                pointerEvents="box-none"
                style={[
                  styles.board,
                  {
                    left: boardLeft,
                    top: boardTop,
                    width: metrics.boardWidth,
                    height: metrics.boardHeight,
                  },
                  boardAnimatedStyle,
                ]}
              >
                <Svg
                  pointerEvents="none"
                  width={metrics.boardWidth}
                  height={metrics.boardHeight}
                  viewBox={`0 0 ${metrics.boardWidth} ${metrics.boardHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={StyleSheet.absoluteFill}
                >
                  {roadmap.connections.map((connection, index) => {
                    const fromNode = translatedNodeMap.get(connection.from);
                    const toNode = translatedNodeMap.get(connection.to);
                    if (!fromNode || !toNode) return null;
                    const points = getConnectionPoints(fromNode, toNode, connection);
                    return (
                      <Line
                        key={`${connection.from}-${connection.to}-${index}`}
                        x1={points.x1}
                        y1={points.y1}
                        x2={points.x2}
                        y2={points.y2}
                        stroke={CONNECTOR_COLOR}
                        strokeWidth={connection.type === "solid" ? 4 : 3}
                        strokeDasharray={connection.type === "solid" ? undefined : "6 10"}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </Svg>

                {metrics.showRelatedBox ? (
                  <View
                    style={[
                      styles.relatedBox,
                      {
                        left: metrics.relatedBoxLeft,
                        top: metrics.relatedBoxTop,
                      },
                    ]}
                  >
                    <Text style={styles.relatedTitle}>Related Paths</Text>
                    {relatedLabels.length > 0 ? (
                      relatedLabels.slice(0, 4).map((label) => (
                        <View key={label} style={styles.relatedRow}>
                          <Feather name="check-square" size={14} color={Colors.primaryDark} />
                          <Text style={styles.relatedText}>{label}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.relatedEmpty}>No related example roadmaps yet.</Text>
                    )}
                  </View>
                ) : null}

                {metrics.nodes.map((node) => (
                  <VisualRoadmapNode key={node.id} node={node} onPress={onNodePress} />
                ))}
              </Animated.View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  toolbar: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toolbarButton: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarButtonActive: {
    borderColor: Colors.accentYellow,
    backgroundColor: Colors.accentYellowMuted,
  },
  toolbarButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  toolbarButtonTextActive: {
    color: Colors.textPrimary,
  },
  zoomGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomLabel: {
    minWidth: 44,
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: Colors.textSecondary,
  },
  viewport: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: Colors.accentYellowMuted,
  },
  gestureSurface: {
    flex: 1,
  },
  board: {
    position: "absolute",
    backgroundColor: Colors.accentYellowMuted,
  },
  relatedBox: {
    position: "absolute",
    width: RELATED_BOX_WIDTH,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    zIndex: 3,
  },
  relatedTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  relatedText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter_500Medium",
    color: Colors.textPrimary,
  },
  relatedEmpty: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
  stateCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 18,
  },
  stateTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  stateText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
});
