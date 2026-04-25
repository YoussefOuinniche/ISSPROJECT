import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedSection } from "@/components/AnimatedSection";
import { RoadmapRoleSelector } from "@/components/roadmap/RoadmapRoleSelector";
import { VisualRoadmapCanvas } from "@/components/roadmap/VisualRoadmapCanvas";
import { VisualRoadmapDetailsModal } from "@/components/roadmap/VisualRoadmapDetailsModal";
import { AppButton } from "@/components/ui/AppButton";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GradientCard";
import Colors from "@/constants/colors";
import {
  VISUAL_ROADMAP_INDEX,
  getExampleVisualRoadmap,
  getVisualRoadmapById,
} from "@/constants/visualRoadmaps";
import { generateRoadmapWithAi } from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";
import { aiRoadmapToVisualRoadmap } from "@/lib/roadmap/roadmapAdapters";
import type { VisualRoadmap, VisualRoadmapNode } from "@/lib/roadmap/roadmapTypes";
import {
  sanitizeVisualRoadmap,
  validateVisualRoadmapShape,
} from "@/lib/roadmap/roadmapValidation";

type RoadmapRequestPayload = {
  role: string;
};

function normalizeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.trim() : "";
  const runtimeError = error as Error & { status?: number };
  const status = runtimeError?.status;
  const normalized = message.toLowerCase();

  if (status === 401) {
    return "Your session has expired. Please sign in again before generating a roadmap.";
  }

  if (status === 400) {
    if (normalized.includes("role")) {
      return "Please choose a valid role before generating a roadmap.";
    }
    return "The roadmap request is missing required information.";
  }

  if (status === 422 || normalized.includes("not supported by the skillpulse roadmap taxonomy")) {
    return "This selected role is not currently supported by the AI roadmap service.";
  }

  if (status === 503 || normalized.includes("unavailable")) {
    return "The AI roadmap service is currently unavailable. Please try again shortly.";
  }

  if (status === 504 || normalized.includes("timed out") || normalized.includes("timeout")) {
    return "The AI roadmap service took too long to respond. Please retry.";
  }

  if (normalized.includes("network request failed")) {
    return "The backend is unreachable right now. Check that the API server is running and try again.";
  }

  if (normalized.includes("unauthorized")) {
    return "Your session is not authorized to generate a roadmap. Please sign in again.";
  }

  if (normalized.includes("malformed")) {
    return "The AI service returned roadmap data in an unexpected format.";
  }

  if (normalized.includes("empty roadmap") || normalized.includes("no visual nodes")) {
    return "The AI service returned an empty roadmap for this role.";
  }

  if (message) {
    return message;
  }

  return "AI generation failed.";
}

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const generationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiRoadmapCacheRef = useRef(new Map<string, VisualRoadmap>());
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    VISUAL_ROADMAP_INDEX[0]?.id || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [rawRoadmap, setRawRoadmap] = useState<VisualRoadmap | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisualRoadmapNode | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
      }
    };
  }, []);

  const sanitizedRoadmap = useMemo(
    () => (rawRoadmap ? sanitizeVisualRoadmap(rawRoadmap) : null),
    [rawRoadmap]
  );

  const roadmapIsValid = useMemo(
    () => (sanitizedRoadmap ? validateVisualRoadmapShape(sanitizedRoadmap) : false),
    [sanitizedRoadmap]
  );

  const selectedRoadmapPreview = useMemo(
    () => (selectedRoleId ? getVisualRoadmapById(selectedRoleId) : null),
    [selectedRoleId]
  );

  const selectedRoleLabel = selectedRoadmapPreview?.role || "No role selected";
  const sourceBadgeLabel =
    sanitizedRoadmap?.source === "ai" ? "AI Generated" : "Example Roadmap";
  const sourceBadgeVariant =
    sanitizedRoadmap?.source === "ai" ? "accent" : "accentYellow";

  function buildRoadmapPayload(role: string): RoadmapRequestPayload {
    return {
      role,
    };
  }

  function applyExampleRoadmap() {
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
    }

    if (!selectedRoleId) {
      setGenerationError("Choose a role first to generate a roadmap.");
      setRawRoadmap(null);
      return;
    }

    const exactRoadmap = getVisualRoadmapById(selectedRoleId);
    const exampleRoadmap = getExampleVisualRoadmap(selectedRoleId);
    const nextRoadmap = sanitizeVisualRoadmap(exactRoadmap || exampleRoadmap);

    setSelectedNode(null);
    setGenerationError(null);
    setRawRoadmap(nextRoadmap);
  }

  async function handleGenerateRoadmap(options: { forceRefresh?: boolean } = {}) {
    if (generationTimerRef.current) {
      clearTimeout(generationTimerRef.current);
    }

    if (!selectedRoleId) {
      setGenerationError("Choose a role first to generate a roadmap.");
      setRawRoadmap(null);
      return;
    }

    const fallbackRoadmap = getExampleVisualRoadmap(selectedRoleId);
    const selectedRole = selectedRoadmapPreview?.role || fallbackRoadmap.role;
    const cachedRoadmap = aiRoadmapCacheRef.current.get(selectedRoleId);

    if (cachedRoadmap && !options.forceRefresh) {
      setSelectedNode(null);
      setGenerationError(null);
      setRawRoadmap(cachedRoadmap);
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setSelectedNode(null);

    try {
      await new Promise<void>((resolve) => {
        generationTimerRef.current = setTimeout(() => resolve(), 650);
      });

      const payload = buildRoadmapPayload(selectedRole);
      const response = await generateRoadmapWithAi(payload);
      const visualRoadmap = aiRoadmapToVisualRoadmap(response.data, selectedRole);
      const sanitizedAiRoadmap = sanitizeVisualRoadmap(visualRoadmap);

      if (!validateVisualRoadmapShape(sanitizedAiRoadmap)) {
        throw new Error("AI generation returned malformed roadmap data.");
      }

      if (sanitizedAiRoadmap.nodes.length === 0) {
        throw new Error("AI generation returned an empty roadmap.");
      }

      aiRoadmapCacheRef.current.set(selectedRoleId, sanitizedAiRoadmap);
      setRawRoadmap(sanitizedAiRoadmap);
    } catch (error) {
      setRawRoadmap(null);
      setGenerationError(
        `${normalizeErrorMessage(error)} You can retry or use the example roadmap.`
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16,
          paddingBottom: getBottomContentPadding(insets.bottom, { hasTabBar: true }),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedSection delay={20} style={styles.header}>
        <View style={styles.headerBrand}>
          <Image
            source={require("@/assets/images/nexapath.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerCopy}>
            <Text style={styles.screenTitle}>Learning Roadmaps</Text>
            <Text style={styles.screenSub}>
              Generate a roadmap for a role, then explore the board visually.
            </Text>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection delay={40}>
        <GlassCard style={styles.controlCard} padding={18} radius={24}>
          <View style={styles.controlHeader}>
            <Text style={styles.selectorTitle}>Choose a role</Text>
            <Text style={styles.selectorSub}>Generate a roadmap and explore it on the canvas.</Text>
          </View>

          <RoadmapRoleSelector
            roadmaps={VISUAL_ROADMAP_INDEX}
            selectedId={selectedRoleId}
            onSelect={setSelectedRoleId}
          />

          <View style={styles.controlFooter}>
            <Text style={styles.selectedRoleLabel}>Selected role</Text>
            <Text style={styles.selectedRoleValue}>{selectedRoleLabel}</Text>
          </View>

          <AppButton
            label={isGenerating ? "Generating roadmap with AI..." : "Generate Roadmap"}
            onPress={() => {
              void handleGenerateRoadmap();
            }}
            disabled={isGenerating}
            style={styles.generateButton}
            leading={
              isGenerating ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Feather name="play" size={16} color={Colors.background} />
              )
            }
          />

          {!isGenerating && rawRoadmap ? (
            <View style={styles.inlineActions}>
              <Pressable
                style={styles.inlineAction}
                onPress={() => {
                  void handleGenerateRoadmap({ forceRefresh: true });
                }}
              >
                <Feather name="refresh-cw" size={14} color={Colors.accentTertiary} />
                <Text style={styles.inlineActionText}>Retry AI</Text>
              </Pressable>

              <Pressable style={styles.inlineAction} onPress={applyExampleRoadmap}>
                <Feather name="layers" size={14} color={Colors.textSecondary} />
                <Text style={styles.inlineActionText}>Use Example Roadmap</Text>
              </Pressable>
            </View>
          ) : null}
        </GlassCard>
      </AnimatedSection>

      <AnimatedSection delay={60}>
        {isGenerating ? (
          <GlassCard style={styles.loadingCard} padding={18} radius={24}>
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.accentTertiary} />
              <Text style={styles.loadingText}>Generating roadmap with AI...</Text>
            </View>
          </GlassCard>
        ) : !selectedRoleId ? (
          <GlassCard style={styles.stateCard} padding={20} radius={24}>
            <Text style={styles.stateTitle}>No role selected</Text>
            <Text style={styles.stateText}>Choose a role above to start.</Text>
          </GlassCard>
        ) : generationError ? (
          <GlassCard style={styles.stateCard} padding={20} radius={24}>
            <Text style={styles.stateTitle}>AI generation failed</Text>
            <Text style={styles.stateText}>{generationError}</Text>
            <View style={styles.errorActions}>
              <AppButton
                label="Retry"
                onPress={() => {
                  void handleGenerateRoadmap({ forceRefresh: true });
                }}
                style={styles.errorActionPrimary}
              />
              <AppButton
                label="Use Example Roadmap"
                variant="secondary"
                onPress={applyExampleRoadmap}
                style={styles.errorActionSecondary}
              />
            </View>
          </GlassCard>
        ) : rawRoadmap && sanitizedRoadmap && sanitizedRoadmap.nodes.length === 0 ? (
          <GlassCard style={styles.stateCard} padding={20} radius={24}>
            <Text style={styles.stateTitle}>Roadmap has no nodes</Text>
            <Text style={styles.stateText}>
              The roadmap resolved safely, but it does not contain any visual nodes.
            </Text>
            <View style={styles.errorActions}>
              <AppButton
                label="Retry"
                onPress={() => {
                  void handleGenerateRoadmap({ forceRefresh: true });
                }}
                style={styles.errorActionPrimary}
              />
              <AppButton
                label="Use Example Roadmap"
                variant="secondary"
                onPress={applyExampleRoadmap}
                style={styles.errorActionSecondary}
              />
            </View>
          </GlassCard>
        ) : rawRoadmap && sanitizedRoadmap && !roadmapIsValid ? (
          <GlassCard style={styles.stateCard} padding={20} radius={24}>
            <Text style={styles.stateTitle}>Malformed roadmap data</Text>
            <Text style={styles.stateText}>
              The roadmap could not be validated after sanitization, so it is not being rendered.
            </Text>
            <View style={styles.errorActions}>
              <AppButton
                label="Retry"
                onPress={() => {
                  void handleGenerateRoadmap({ forceRefresh: true });
                }}
                style={styles.errorActionPrimary}
              />
              <AppButton
                label="Use Example Roadmap"
                variant="secondary"
                onPress={applyExampleRoadmap}
                style={styles.errorActionSecondary}
              />
            </View>
          </GlassCard>
        ) : rawRoadmap && sanitizedRoadmap ? (
          <View style={styles.roadmapBlock}>
            <View style={styles.canvasMeta}>
              <View style={styles.canvasCopy}>
                <Text style={styles.canvasRole}>{sanitizedRoadmap.role}</Text>
                <Text style={styles.canvasTitle}>{sanitizedRoadmap.title}</Text>
                <Text style={styles.canvasSummary}>{sanitizedRoadmap.summary}</Text>
              </View>
              <Badge label={sourceBadgeLabel} variant={sourceBadgeVariant} size="sm" />
            </View>

            <Text style={styles.canvasInstruction}>
              Scroll the roadmap and tap a node for details.
            </Text>

            <VisualRoadmapCanvas
              roadmap={sanitizedRoadmap}
              relatedRoadmaps={VISUAL_ROADMAP_INDEX}
              onNodePress={setSelectedNode}
            />
          </View>
        ) : (
          <GlassCard style={styles.stateCard} padding={20} radius={24}>
            <Text style={styles.stateTitle}>Ready to generate</Text>
            <Text style={styles.stateText}>Choose a role and generate a roadmap to begin.</Text>
          </GlassCard>
        )}
      </AnimatedSection>

      <VisualRoadmapDetailsModal
        visible={Boolean(selectedNode)}
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 14,
  },
  header: {
    minHeight: 50,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 96,
    height: 38,
  },
  headerCopy: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  screenSub: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  controlCard: {
    gap: 12,
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  controlHeader: {
    gap: 4,
  },
  selectorTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  selectorSub: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    fontFamily: "Newsreader_400Regular",
  },
  controlFooter: {
    gap: 2,
  },
  selectedRoleLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectedRoleValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  generateButton: {
    minHeight: 48,
    borderRadius: 18,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  inlineAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inlineActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  loadingCard: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textPrimary,
  },
  stateCard: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 5,
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
  errorActions: {
    marginTop: 16,
    gap: 10,
  },
  errorActionPrimary: {
    width: "100%",
  },
  errorActionSecondary: {
    width: "100%",
  },
  roadmapBlock: {
    gap: 10,
  },
  canvasMeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  canvasCopy: {
    flex: 1,
  },
  canvasRole: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  canvasTitle: {
    marginTop: 4,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  canvasSummary: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_400Regular",
    color: Colors.textSecondary,
  },
  canvasInstruction: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Newsreader_500Medium",
    color: Colors.textSecondary,
  },
});
