import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { GlassCard } from "@/components/ui/GradientCard";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  analyzeSkillGapsWithAi,
  generateJobDescriptionWithAi,
  generateRecommendationsWithAi,
  generateRoadmapWithAi,
  getCareerAdviceWithAi,
} from "@/lib/api/mobileApi";
import { getBottomContentPadding } from "@/lib/layout";

type ActionState = {
  loading: boolean;
  error: string | null;
};

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderList(title: string, values: unknown): React.ReactNode {
  if (!Array.isArray(values) || values.length === 0) return null;

  return (
    <View style={styles.resultBlock}>
      <Text style={styles.resultTitle}>{title}</Text>
      {values.map((value, idx) => (
        <Text key={`${title}-${idx}`} style={styles.resultItem}>
          {`- ${stringify(value)}`}
        </Text>
      ))}
    </View>
  );
}

export default function AiAssistantScreen() {
  const insets = useSafeAreaInsets();

  const [targetRole, setTargetRole] = useState("");
  const [timeframeMonths, setTimeframeMonths] = useState("6");
  const [recommendationCount, setRecommendationCount] = useState("8");
  const [careerQuestion, setCareerQuestion] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [perSourceLimit, setPerSourceLimit] = useState("5");

  const [skillGapState, setSkillGapState] = useState<ActionState>({ loading: false, error: null });
  const [roadmapState, setRoadmapState] = useState<ActionState>({ loading: false, error: null });
  const [recommendationState, setRecommendationState] = useState<ActionState>({ loading: false, error: null });
  const [careerState, setCareerState] = useState<ActionState>({ loading: false, error: null });
  const [jobState, setJobState] = useState<ActionState>({ loading: false, error: null });

  const [skillGapResult, setSkillGapResult] = useState<Record<string, unknown> | null>(null);
  const [roadmapResult, setRoadmapResult] = useState<Record<string, unknown> | null>(null);
  const [recommendationResult, setRecommendationResult] = useState<unknown>(null);
  const [careerResult, setCareerResult] = useState<unknown>(null);
  const [jobResult, setJobResult] = useState<Record<string, unknown> | null>(null);

  const onAnalyzeSkillGaps = async () => {
    setSkillGapState({ loading: true, error: null });
    try {
      const response = await analyzeSkillGapsWithAi({
        targetRole: targetRole.trim() || undefined,
      });
      setSkillGapResult((response.data as Record<string, unknown>) ?? null);
      setSkillGapState({ loading: false, error: null });
    } catch (error) {
      setSkillGapState({
        loading: false,
        error: error instanceof Error ? error.message : "Skill-gap analysis failed",
      });
    }
  };

  const onGenerateRoadmap = async () => {
    setRoadmapState({ loading: true, error: null });
    try {
      const response = await generateRoadmapWithAi({
        targetRole: targetRole.trim() || undefined,
        timeframeMonths: Number(timeframeMonths) || 6,
      });
      setRoadmapResult((response.data as Record<string, unknown>) ?? null);
      setRoadmapState({ loading: false, error: null });
    } catch (error) {
      setRoadmapState({
        loading: false,
        error: error instanceof Error ? error.message : "Roadmap generation failed",
      });
    }
  };

  const onGenerateRecommendations = async () => {
    setRecommendationState({ loading: true, error: null });
    try {
      const response = await generateRecommendationsWithAi({
        count: Number(recommendationCount) || 8,
      });
      setRecommendationResult(response.data);
      setRecommendationState({ loading: false, error: null });
    } catch (error) {
      setRecommendationState({
        loading: false,
        error: error instanceof Error ? error.message : "Recommendation generation failed",
      });
    }
  };

  const onGetCareerAdvice = async () => {
    const question = careerQuestion.trim();
    if (question.length < 5) {
      setCareerState({ loading: false, error: "Question must be at least 5 characters." });
      return;
    }

    setCareerState({ loading: true, error: null });
    try {
      const response = await getCareerAdviceWithAi({ question });
      setCareerResult(response.data);
      setCareerState({ loading: false, error: null });
    } catch (error) {
      setCareerState({
        loading: false,
        error: error instanceof Error ? error.message : "Career advice request failed",
      });
    }
  };

  const onGenerateJobDescription = async () => {
    const role = jobRole.trim();
    if (role.length < 2) {
      setJobState({ loading: false, error: "Role must be at least 2 characters." });
      return;
    }

    setJobState({ loading: true, error: null });
    try {
      const response = await generateJobDescriptionWithAi({
        role,
        perSourceLimit: Number(perSourceLimit) || 5,
      });
      setJobResult((response.data as Record<string, unknown>) ?? null);
      setJobState({ loading: false, error: null });
    } catch (error) {
      setJobState({
        loading: false,
        error: error instanceof Error ? error.message : "Job description generation failed",
      });
    }
  };

  const roadmapData = roadmapResult && typeof roadmapResult.data === "object" && roadmapResult.data !== null
    ? (roadmapResult.data as Record<string, unknown>)
    : null;

  const jobData = jobResult && typeof jobResult.data === "object" && jobResult.data !== null
    ? (jobResult.data as Record<string, unknown>)
    : null;

  const careerAnswer =
    careerResult && typeof careerResult === "object" && careerResult !== null && "answer" in careerResult
      ? String((careerResult as Record<string, unknown>).answer ?? "")
      : typeof careerResult === "string"
      ? careerResult
      : "";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.navBar,
          { paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle}>AI Assistant</Text>
        <Pressable onPress={() => router.push("/recommendations")} style={styles.backBtn}>
          <Feather name="star" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      <Animated.View entering={FadeIn.duration(280)} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: getBottomContentPadding(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#0F172A", "#1E293B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <LinearGradient
              colors={["rgba(43,230,246,0.18)", "rgba(124,58,237,0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.heroTitle}>AI Workspace</Text>
            <Text style={styles.heroText}>
              Run live AI actions for skill-gap analysis, roadmap planning, recommendation refresh,
              career advice, and IT job description generation.
            </Text>
          </LinearGradient>

          <Text style={styles.groupLabel}>Shared Inputs</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <Text style={styles.inputLabel}>Target Role</Text>
            <TextInput
              style={styles.input}
              value={targetRole}
              onChangeText={setTargetRole}
              placeholder="e.g. Senior Backend Engineer"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Roadmap Timeframe (months)</Text>
            <TextInput
              style={styles.input}
              value={timeframeMonths}
              onChangeText={setTimeframeMonths}
              keyboardType="number-pad"
              placeholder="6"
              placeholderTextColor={Colors.textTertiary}
            />
          </GlassCard>

          <Text style={styles.groupLabel}>1. Skill Gap Analysis</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <AnimatedButton containerStyle={styles.primaryBtnWrap} onPress={onAnalyzeSkillGaps}>
              <View style={styles.primaryBtn}>
                <Feather name="target" size={15} color={Colors.background} />
                <Text style={styles.primaryBtnText}>
                  {skillGapState.loading ? "Analyzing..." : "Analyze Skill Gaps"}
                </Text>
              </View>
            </AnimatedButton>

            {skillGapState.error ? <Text style={styles.errorText}>{skillGapState.error}</Text> : null}

            {renderList("Detected Gaps", skillGapResult?.gaps)}
            {skillGapResult?.target_role ? (
              <Text style={styles.resultMeta}>Target role: {String(skillGapResult.target_role)}</Text>
            ) : null}
          </GlassCard>

          <Text style={styles.groupLabel}>2. Learning Roadmap</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <AnimatedButton containerStyle={styles.primaryBtnWrap} onPress={onGenerateRoadmap}>
              <View style={styles.primaryBtn}>
                <Feather name="map" size={15} color={Colors.background} />
                <Text style={styles.primaryBtnText}>
                  {roadmapState.loading ? "Generating..." : "Generate Roadmap"}
                </Text>
              </View>
            </AnimatedButton>

            {roadmapState.error ? <Text style={styles.errorText}>{roadmapState.error}</Text> : null}

            {roadmapData?.roadmap_title ? (
              <Text style={styles.resultMeta}>{String(roadmapData.roadmap_title)}</Text>
            ) : null}
            {renderList("Roadmap Phases", roadmapData?.phases)}
            {renderList("Milestones", roadmapData?.milestones)}
          </GlassCard>

          <Text style={styles.groupLabel}>3. Recommendations Generator</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <Text style={styles.inputLabel}>Recommendation Count</Text>
            <TextInput
              style={styles.input}
              value={recommendationCount}
              onChangeText={setRecommendationCount}
              keyboardType="number-pad"
              placeholder="8"
              placeholderTextColor={Colors.textTertiary}
            />

            <AnimatedButton containerStyle={styles.primaryBtnWrap} onPress={onGenerateRecommendations}>
              <View style={styles.primaryBtn}>
                <Feather name="refresh-cw" size={15} color={Colors.background} />
                <Text style={styles.primaryBtnText}>
                  {recommendationState.loading ? "Generating..." : "Generate Recommendations"}
                </Text>
              </View>
            </AnimatedButton>

            {recommendationState.error ? <Text style={styles.errorText}>{recommendationState.error}</Text> : null}

            {Array.isArray(recommendationResult) ? (
              <Text style={styles.resultMeta}>Generated {recommendationResult.length} recommendations.</Text>
            ) : null}
            {renderList("Generated Recommendations", recommendationResult)}

            <Pressable style={styles.linkBtn} onPress={() => router.push("/recommendations")}> 
              <Feather name="external-link" size={14} color={Colors.primary} />
              <Text style={styles.linkBtnText}>Open Recommendations Page</Text>
            </Pressable>
          </GlassCard>

          <Text style={styles.groupLabel}>4. Career Advice</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <Text style={styles.inputLabel}>Your Question</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={careerQuestion}
              onChangeText={setCareerQuestion}
              multiline
              placeholder="Ask anything about your next career move"
              placeholderTextColor={Colors.textTertiary}
            />

            <AnimatedButton containerStyle={styles.primaryBtnWrap} onPress={onGetCareerAdvice}>
              <View style={styles.primaryBtn}>
                <Feather name="message-circle" size={15} color={Colors.background} />
                <Text style={styles.primaryBtnText}>
                  {careerState.loading ? "Thinking..." : "Get Career Advice"}
                </Text>
              </View>
            </AnimatedButton>

            {careerState.error ? <Text style={styles.errorText}>{careerState.error}</Text> : null}

            {careerAnswer ? (
              <View style={styles.resultBlock}>
                <Text style={styles.resultTitle}>AI Advice</Text>
                <Text style={styles.resultParagraph}>{careerAnswer}</Text>
              </View>
            ) : null}
          </GlassCard>

          <Text style={styles.groupLabel}>5. Job Description Generator</Text>
          <GlassCard style={styles.group} padding={16} radius={20}>
            <Text style={styles.inputLabel}>IT Role</Text>
            <TextInput
              style={styles.input}
              value={jobRole}
              onChangeText={setJobRole}
              placeholder="e.g. DevOps Engineer"
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Per Source Limit</Text>
            <TextInput
              style={styles.input}
              value={perSourceLimit}
              onChangeText={setPerSourceLimit}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={Colors.textTertiary}
            />

            <AnimatedButton containerStyle={styles.primaryBtnWrap} onPress={onGenerateJobDescription}>
              <View style={styles.primaryBtn}>
                <Feather name="file-text" size={15} color={Colors.background} />
                <Text style={styles.primaryBtnText}>
                  {jobState.loading ? "Generating..." : "Generate Job Description"}
                </Text>
              </View>
            </AnimatedButton>

            {jobState.error ? <Text style={styles.errorText}>{jobState.error}</Text> : null}

            {jobData?.job_without_ai ? (
              <View style={styles.resultBlock}>
                <Text style={styles.resultTitle}>Job Without AI</Text>
                <Text style={styles.resultParagraph}>{stringify(jobData.job_without_ai)}</Text>
              </View>
            ) : null}
            {jobData?.job_with_ai ? (
              <View style={styles.resultBlock}>
                <Text style={styles.resultTitle}>Job With AI</Text>
                <Text style={styles.resultParagraph}>{stringify(jobData.job_with_ai)}</Text>
              </View>
            ) : null}
            {renderList("Skill Gaps", jobData?.skill_gaps)}
            {renderList("AI Integration Recommendations", jobData?.ai_integration_recommendations)}
          </GlassCard>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  groupLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
  },
  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  primaryBtnWrap: {
    marginTop: 14,
  },
  primaryBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  primaryBtnText: {
    color: Colors.background,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  linkBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  linkBtnText: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  errorText: {
    marginTop: 10,
    color: Colors.danger,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  resultMeta: {
    marginTop: 12,
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  resultBlock: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.backgroundSecondary,
    gap: 6,
  },
  resultTitle: {
    color: Colors.textPrimary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  resultItem: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  resultParagraph: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
});
