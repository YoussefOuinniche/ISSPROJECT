import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

import { generateCompletion, testOllamaConnection } from "@/services/ollamaService";
import { getJobRoles, fetchProfileId } from "@/services/supabaseService";
import {
  buildSetupSystemPrompt,
  buildProfileCollectionPrompt,
  buildBasicAssessmentSystemPrompt,
  buildAdvancedAssessmentSystemPrompt,
  computeCompatibility,
  getAdvancedDifficulty,
  extractTargetSet,
  stripTargetSet,
  extractProfileSet,
  stripProfileSet,
  detectInputType,
  stripInputTags,
  extractAIScore,
  stripAIScore,
  extractMCQOptions,
  mcqIndexToScore,
  shouldEarlyExit,
  parseEducationLevel,
  parseYearsExperience,
  parseHoursPerWeek,
  getGreetingMessage,
  getStateProgress,
  getStateLabel,
  type OnboardingState,
  type AssessmentPhase,
  type QuestionInputType,
  type CollectedData,
  type OnboardingMessage,
} from "@/services/onboardingService";
import { generateAndSaveRoadmap } from "@/services/roadmapService";
import type { JobRole } from "@/services/supabaseService";

const MONO = Platform.OS === "ios" ? "Courier New" : "monospace";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const GENERATION_PHASES = [
  "Analyzing your assessment…",
  "Mapping skill gaps…",
  "Finding the best courses…",
  "Generating your roadmap with AI…",
  "Saving your personalized plan…",
];

const STEP_LABELS = ["HANDS", "NAME", "ROLE", "SKILL", "REVUE"];

// ─── MCQ Input ──────────────────────────────────────────────────────────────────

function MCQInput({
  options,
  onSelect,
  disabled,
}: {
  options: string[];
  onSelect: (text: string, index: number) => void;
  disabled: boolean;
}) {
  const letters = "ABCDE";
  return (
    <View style={inputStyles.mcqWrap}>
      <Text style={inputStyles.ratingLabel}>{"// SELECT_OPTION"}</Text>
      {options.map((opt, i) => (
        <Pressable
          key={i}
          onPress={() => !disabled && onSelect(opt, i)}
          disabled={disabled}
          style={({ pressed }) => [
            inputStyles.mcqOption,
            pressed && { opacity: 0.65 },
          ]}
        >
          <View style={inputStyles.mcqLetterBox}>
            <Text style={inputStyles.mcqLetter}>{letters[i] ?? String(i + 1)}</Text>
          </View>
          <Text style={inputStyles.mcqText}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Terminal Rating Bar ────────────────────────────────────────────────────────

function RatingBar({ onRate, disabled }: { onRate: (n: number) => void; disabled: boolean }) {
  const getColor = (n: number) =>
    n <= 3 ? Colors.danger : n <= 6 ? Colors.warning : Colors.success;

  return (
    <View style={inputStyles.ratingWrap}>
      <Text style={inputStyles.ratingLabel}>{"// SELF_ASSESSMENT · 1–10"}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={inputStyles.ratingRow}
        bounces={false}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const c = getColor(n);
          return (
            <Pressable
              key={n}
              onPress={() => !disabled && onRate(n)}
              disabled={disabled}
              style={({ pressed }) => [
                inputStyles.ratingBox,
                { borderColor: c + "50", backgroundColor: c + "10" },
                pressed && { opacity: 0.65 },
              ]}
            >
              <Text style={[inputStyles.ratingNum, { color: c }]}>{n}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={inputStyles.ratingLegend}>
        <Text style={[inputStyles.legendText, { color: Colors.danger }]}>1–3 NONE</Text>
        <Text style={inputStyles.legendSep}>·</Text>
        <Text style={[inputStyles.legendText, { color: Colors.warning }]}>4–6 MED</Text>
        <Text style={inputStyles.legendSep}>·</Text>
        <Text style={[inputStyles.legendText, { color: Colors.success }]}>7–10 STRONG</Text>
      </View>
    </View>
  );
}

// ─── Text Answer Input ──────────────────────────────────────────────────────────

function TextAnswerInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim() && !disabled) {
      onSend(val.trim());
      setVal("");
    }
  };

  return (
    <View style={inputStyles.textWrap}>
      <Text style={inputStyles.ratingLabel}>{"// KNOWLEDGE_INPUT"}</Text>
      <View style={inputStyles.textInputRow}>
        <Text style={inputStyles.prompt}>{">"}</Text>
        <TextInput
          style={inputStyles.textInput}
          value={val}
          onChangeText={setVal}
          placeholder="type answer here_"
          placeholderTextColor={Colors.textTertiary}
          multiline
          maxLength={400}
          editable={!disabled}
          onSubmitEditing={submit}
        />
        <Pressable
          style={[inputStyles.sendBtn, (!val.trim() || disabled) && inputStyles.sendBtnOff]}
          onPress={submit}
          disabled={!val.trim() || disabled}
        >
          <LinearGradient
            colors={
              val.trim() && !disabled
                ? [Colors.success, Colors.accentDark]
                : [Colors.borderSubtle, Colors.borderSubtle]
            }
            style={inputStyles.sendBtnGrad}
          >
            <Feather name="send" size={14} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Default Chat Input ─────────────────────────────────────────────────────────

function DefaultInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [val, setVal] = useState("");

  const submit = () => {
    if (val.trim() && !disabled) {
      onSend(val.trim());
      setVal("");
    }
  };

  return (
    <View style={inputStyles.defaultRow}>
      <Text style={inputStyles.prompt}>{">"}</Text>
      <TextInput
        style={inputStyles.defaultInput}
        value={val}
        onChangeText={setVal}
        placeholder="message nexapath_ai_"
        placeholderTextColor={Colors.textTertiary}
        multiline
        maxLength={500}
        editable={!disabled}
      />
      <Pressable
        style={[inputStyles.sendBtn, (!val.trim() || disabled) && inputStyles.sendBtnOff]}
        onPress={submit}
        disabled={!val.trim() || disabled}
      >
        <LinearGradient
          colors={
            val.trim() && !disabled
              ? [Colors.primary, Colors.primaryDark]
              : [Colors.borderSubtle, Colors.borderSubtle]
          }
          style={inputStyles.sendBtnGrad}
        >
          <Feather name="send" size={14} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

// ─── Compatibility Card ─────────────────────────────────────────────────────────

function CompatibilityCard({
  percentage,
  level,
  basicAvg,
  advancedAvg,
  roleTitle,
  earlyExit,
}: {
  percentage: number;
  level: "beginner" | "intermediate" | "advanced";
  basicAvg: number;
  advancedAvg: number;
  roleTitle: string;
  earlyExit?: boolean;
}) {
  const accent =
    percentage >= 65 ? Colors.success : percentage >= 35 ? Colors.warning : Colors.danger;

  const pctStr = String(percentage).padStart(3, "0");
  const bars = 20;
  const filled = Math.round((percentage / 100) * bars);
  const blockBar = "█".repeat(filled) + "░".repeat(bars - filled);

  const levelCopy = {
    beginner: { label: "BEGINNER", sub: "Great start — roadmap will build you fast." },
    intermediate: { label: "INTERMEDIATE", sub: "Solid base — focused learning gets you there." },
    advanced: { label: "ADVANCED", sub: "Strong profile — nearly job-ready." },
  }[level];

  return (
    <View style={compatStyles.card}>
      <View style={[compatStyles.accentLine, { backgroundColor: accent }]} />
      <Text style={compatStyles.eyebrow}>
        {earlyExit ? "// ASSESSMENT_LOCKED" : "// COMPAT_SCORE"}
      </Text>
      <Text style={compatStyles.roleName}>{roleTitle.toUpperCase()}</Text>

      <View style={compatStyles.scoreRow}>
        <Text style={[compatStyles.pct, { color: accent }]}>{pctStr}</Text>
        <Text style={compatStyles.pctUnit}>%</Text>
      </View>
      <Text style={[compatStyles.blockBar, { color: accent }]}>{blockBar}</Text>

      <View
        style={[
          compatStyles.levelBadge,
          { borderColor: accent + "40", backgroundColor: accent + "12" },
        ]}
      >
        <Text style={[compatStyles.levelTitle, { color: accent }]}>{levelCopy.label}</Text>
        <Text style={compatStyles.levelSub}>{levelCopy.sub}</Text>
      </View>

      <View style={compatStyles.statsWrap}>
        {[
          { label: "BASIC_KNOWLEDGE", value: basicAvg },
          { label: "ADVANCED_KNOWLEDGE", value: advancedAvg },
        ].map((row) => (
          <View key={row.label} style={compatStyles.statRow}>
            <Text style={compatStyles.statLabel}>{row.label}</Text>
            <Text style={[compatStyles.statVal, { color: accent }]}>
              {row.value.toFixed(1)}/10
            </Text>
          </View>
        ))}
      </View>

      <Text style={compatStyles.footer}>{"$ nexa compile --roadmap --ai"}</Text>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────

export default function OnboardingChatScreen() {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [ollamaUnreachable, setOllamaUnreachable] = useState(false);

  const [assessPhase, setAssessPhase] = useState<AssessmentPhase>("setup");
  const [currentInputType, setCurrentInputType] = useState<QuestionInputType>(null);
  const [mcqOptions, setMcqOptions] = useState<string[] | null>(null);
  const [userName, setUserName] = useState("");
  const [targetRole, setTargetRole] = useState<{ id: string; title: string } | null>(null);
  const [basicScores, setBasicScores] = useState<number[]>([]);
  const [advancedScores, setAdvancedScores] = useState<number[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [profileQuestionIndex, setProfileQuestionIndex] = useState(0);
  const [isEarlyExit, setIsEarlyExit] = useState(false);

  const [onboardingState, setOnboardingState] = useState<OnboardingState>("GREETING");
  const [questionIndex, setQuestionIndex] = useState(0);

  const [compatResult, setCompatResult] = useState<{
    percentage: number;
    level: "beginner" | "intermediate" | "advanced";
    basicAvg: number;
    advancedAvg: number;
  } | null>(null);

  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState("");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [pendingCollected, setPendingCollected] = useState<CollectedData | null>(null);

  const conversationHistory = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  // Stores MCQ score computed client-side, used as fallback if AI omits [SCORE:X]
  const pendingMcqScore = useRef<number | null>(null);
  // Profile data collected during COLLECT_PROFILE phase (ref avoids stale closure in callbacks)
  const collectedProfileRef = useRef<{
    education_level: CollectedData["education_level"];
    years_experience: number;
    hours_per_week: number;
    current_stack: string;
  } | null>(null);

  useEffect(() => {
    initialise();
  }, []);

  async function initialise() {
    setInputDisabled(true);
    try {
      const ok = await testOllamaConnection();
      if (!ok) {
        setOllamaUnreachable(true);
        setInputDisabled(false);
        return;
      }

      const [roles, pid] = await Promise.all([
        getJobRoles().catch(() => [] as JobRole[]),
        fetchProfileId().catch(() => null),
      ]);

      setJobRoles(roles);
      setProfileId(pid);
      setSystemPrompt(buildSetupSystemPrompt(roles));
      appendAIMessage(getGreetingMessage());
      setOnboardingState("COLLECT_NAME");
    } catch {
      appendAIMessage("ERR: startup failed. Please restart the app.");
    } finally {
      setInputDisabled(false);
    }
  }

  function appendMessage(text: string, isUser: boolean) {
    setMessages((prev) => [...prev, { id: makeId(), text, isUser, timestamp: Date.now() }]);
  }
  function appendAIMessage(text: string) {
    appendMessage(text, false);
  }

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }, [messages]);

  function applyInputType(aiRaw: string) {
    const inputType = detectInputType(aiRaw);
    if (inputType === "mcq") {
      const opts = extractMCQOptions(aiRaw);
      setMcqOptions(opts);
      setCurrentInputType("mcq");
    } else {
      setMcqOptions(null);
      setCurrentInputType(inputType);
    }
    return inputType;
  }

  const handleRating = useCallback(
    async (n: number) => {
      if (inputDisabled || isTyping || isGenerating) return;
      setCurrentInputType(null);
      setMcqOptions(null);
      await handleSend(String(n));
    },
    [inputDisabled, isTyping, isGenerating]
  );

  const handleSend = useCallback(
    async (userText: string) => {
      if (isTyping || isGenerating || inputDisabled) return;
      Keyboard.dismiss();

      appendMessage(userText, true);
      const history = conversationHistory.current;
      history.push({ role: "user", content: userText });

      setIsTyping(true);
      setInputDisabled(true);
      setCurrentInputType(null);
      setMcqOptions(null);

      try {
        const aiRaw = await generateCompletion(systemPrompt, userText, history.slice(0, -1), 0.7);
        history.push({ role: "assistant", content: aiRaw });

        // ── SETUP phase ─────────────────────────────────────────────────────────
        if (assessPhase === "setup") {
          const target = extractTargetSet(aiRaw);
          if (target) {
            const clean = stripTargetSet(aiRaw);
            if (clean) appendAIMessage(clean);

            const role = { id: target.role_id, title: target.role_title };
            setUserName(target.name);
            setTargetRole(role);

            // Transition to profile collection (not directly to basic)
            const profilePrompt = buildProfileCollectionPrompt(target.name, role.title);
            setSystemPrompt(profilePrompt);
            setAssessPhase("profile");
            setOnboardingState("COLLECT_PROFILE");
            setProfileQuestionIndex(0);

            setIsTyping(true);
            const pq1 = await generateCompletion(profilePrompt, "[start]", [], 0.6);
            history.push({ role: "assistant", content: pq1 });
            const displayPQ1 = stripInputTags(pq1);
            appendAIMessage(displayPQ1);
            applyInputType(pq1);
            setProfileQuestionIndex(1);
          } else {
            appendAIMessage(aiRaw);
            if (onboardingState === "COLLECT_NAME") setOnboardingState("COLLECT_TARGET_ROLE");
          }

        // ── PROFILE phase ────────────────────────────────────────────────────────
        } else if (assessPhase === "profile") {
          const profileSet = extractProfileSet(aiRaw);
          if (profileSet) {
            const displayText = stripProfileSet(aiRaw).trim();
            if (displayText) appendAIMessage(displayText);

            const education_level = parseEducationLevel(profileSet.education);
            const years_experience = parseYearsExperience(profileSet.experience);
            const hours_per_week = parseHoursPerWeek(profileSet.hours_per_week);
            const current_stack = profileSet.current_stack || "none";

            collectedProfileRef.current = {
              education_level,
              years_experience,
              hours_per_week,
              current_stack,
            };

            // Transition to basic assessment
            const basicPrompt = buildBasicAssessmentSystemPrompt(
              userName || "there",
              targetRole?.title ?? ""
            );
            setSystemPrompt(basicPrompt);
            setAssessPhase("basic");
            setOnboardingState("ASSESS_BASIC");
            setQuestionIndex(0);

            setIsTyping(true);
            const q1 = await generateCompletion(basicPrompt, "[start]", [], 0.7);
            history.push({ role: "assistant", content: q1 });
            const displayQ1 = stripInputTags(q1);
            appendAIMessage(displayQ1);
            applyInputType(q1);
            setQuestionIndex(1);
          } else {
            const displayText = stripInputTags(aiRaw);
            appendAIMessage(displayText);
            applyInputType(aiRaw);
            setProfileQuestionIndex((prev) => prev + 1);
          }

        // ── BASIC phase ──────────────────────────────────────────────────────────
        } else if (assessPhase === "basic") {
          let aiScore = extractAIScore(aiRaw);
          if (aiScore === null && pendingMcqScore.current !== null) {
            aiScore = pendingMcqScore.current;
          }
          pendingMcqScore.current = null;

          const displayText = stripInputTags(stripAIScore(aiRaw));
          appendAIMessage(displayText);

          const isDontKnow = /^(i\s*don'?t\s*know|idk|no\s*idea|not\s*sure|dunno|nothing|nope|n\/a|-)$/i.test(
            userText.trim()
          );
          let newBasic = basicScores;
          if (aiScore !== null) {
            newBasic = [...basicScores, isDontKnow ? 1 : aiScore];
            setBasicScores(newBasic);
            setQuestionIndex(newBasic.length);
          } else if (/^\d+$/.test(userText.trim())) {
            const score = Math.min(10, Math.max(1, parseInt(userText.trim(), 10)));
            newBasic = [...basicScores, score];
            setBasicScores(newBasic);
            setQuestionIndex(newBasic.length);
          } else if (isDontKnow) {
            newBasic = [...basicScores, 1];
            setBasicScores(newBasic);
            setQuestionIndex(newBasic.length);
          }

          if (newBasic.length >= 5) {
            await transitionToAdvanced(newBasic, history);
          } else {
            applyInputType(aiRaw);
          }

        // ── ADVANCED phase ───────────────────────────────────────────────────────
        } else if (assessPhase === "advanced") {
          let aiScore = extractAIScore(aiRaw);
          if (aiScore === null && pendingMcqScore.current !== null) {
            aiScore = pendingMcqScore.current;
          }
          pendingMcqScore.current = null;

          const displayText = stripInputTags(stripAIScore(aiRaw));
          appendAIMessage(displayText);

          const isDontKnowAdv = /^(i\s*don'?t\s*know|idk|no\s*idea|not\s*sure|dunno|nothing|nope|n\/a|-)$/i.test(
            userText.trim()
          );
          let newAdv = advancedScores;
          if (aiScore !== null) {
            newAdv = [...advancedScores, isDontKnowAdv ? 1 : aiScore];
            setAdvancedScores(newAdv);
            setQuestionIndex(newAdv.length);
          } else if (/^\d+$/.test(userText.trim())) {
            const score = Math.min(10, Math.max(1, parseInt(userText.trim(), 10)));
            newAdv = [...advancedScores, score];
            setAdvancedScores(newAdv);
            setQuestionIndex(newAdv.length);
          } else if (isDontKnowAdv) {
            newAdv = [...advancedScores, 1];
            setAdvancedScores(newAdv);
            setQuestionIndex(newAdv.length);
          }

          if (newAdv.length >= 5) {
            finishAssessment(basicScores, newAdv);
          } else {
            applyInputType(aiRaw);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (
          msg.toLowerCase().includes("timeout") ||
          msg.toLowerCase().includes("network") ||
          msg.toLowerCase().includes("fetch")
        ) {
          setOllamaUnreachable(true);
        } else {
          appendAIMessage("ERR: response failed. Try again.");
        }
        if (__DEV__) console.error("[chat]", err);
      } finally {
        setIsTyping(false);
        setInputDisabled(false);
      }
    },
    [
      assessPhase,
      systemPrompt,
      basicScores,
      advancedScores,
      onboardingState,
      isTyping,
      isGenerating,
      inputDisabled,
      userName,
      targetRole,
      profileId,
      jobRoles,
      profileQuestionIndex,
    ]
  );

  async function transitionToAdvanced(
    scores: number[],
    history: Array<{ role: "user" | "assistant"; content: string }>
  ) {
    // Early exit: basic avg < 4 → skip advanced entirely
    if (shouldEarlyExit(scores)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      setIsEarlyExit(true);
      appendAIMessage(
        `ASSESSMENT_LOCKED ⚠️\n\nBasic score: ${avg.toFixed(1)}/10 — this indicates you're at the very beginning of this journey.\n\nThis is your starting point. We will not go deeper. Press GENERATE ROADMAP to compile your beginner roadmap.`
      );
      // Use default advanced scores so compatibility is weighted low (beginner)
      finishAssessment(scores, [2, 2, 2, 2, 2]);
      return;
    }

    const difficulty = getAdvancedDifficulty(scores);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const role = targetRole ?? { id: "", title: "your target role" };

    const advPrompt = buildAdvancedAssessmentSystemPrompt(
      userName || "there",
      role.title,
      avg,
      difficulty
    );
    setSystemPrompt(advPrompt);
    setAssessPhase("advanced");
    setOnboardingState("ASSESS_ADVANCED");
    setQuestionIndex(0);
    setCurrentInputType(null);
    setMcqOptions(null);

    const bridge =
      avg >= 6
        ? `BASIC_AVG: ${avg.toFixed(1)}/10 ✓\n\nStrong base. Advancing to depth questions.`
        : `BASIC_AVG: ${avg.toFixed(1)}/10\n\nGood start. Moving to practical questions.`;
    appendAIMessage(bridge);

    setIsTyping(true);
    try {
      const firstQ = await generateCompletion(advPrompt, "[start]", [], 0.7);
      history.push({ role: "assistant", content: firstQ });
      appendAIMessage(stripInputTags(firstQ));
      applyInputType(firstQ);
      setQuestionIndex(1);
    } catch {
      appendAIMessage("Continuing with next questions...");
    }
    setIsTyping(false);
  }

  function finishAssessment(basic: number[], advanced: number[]) {
    const { compatibility_percentage, overall_level, basic_avg, advanced_avg } =
      computeCompatibility(basic, advanced);

    setCompatResult({
      percentage: compatibility_percentage,
      level: overall_level,
      basicAvg: basic_avg,
      advancedAvg: advanced_avg,
    });
    setOnboardingState("SHOW_COMPATIBILITY");
    setAssessPhase("done");
    setCurrentInputType(null);
    setMcqOptions(null);

    const profile = collectedProfileRef.current;

    const collected: CollectedData = {
      full_name: userName || "User",
      target_job_role_id: targetRole?.id ?? "",
      target_job_role_title: targetRole?.title ?? "",
      education_level: profile?.education_level ?? "other",
      years_experience: profile?.years_experience ?? 0,
      hours_per_week: profile?.hours_per_week ?? 0,
      current_stack: profile?.current_stack ?? "",
      background_context: "",
      skills: [],
      basic_scores: basic,
      advanced_scores: advanced,
      compatibility_percentage,
      overall_level,
    };

    setPendingCollected(collected);
    appendAIMessage(
      `ASSESSMENT_COMPLETE ✓\n\nScore: ${compatibility_percentage}% · ${targetRole?.title ?? "your role"}\nTap GENERATE_ROADMAP to compile your personalized path.`
    );
  }

  async function triggerRoadmapGeneration(collected: CollectedData) {
    setIsGenerating(true);
    setGenerationError(null);
    setOnboardingState("GENERATING_ROADMAP");

    const msgs: OnboardingMessage[] = conversationHistory.current.map((m, i) => ({
      id: `m${i}`,
      role: m.role,
      content: m.content,
      timestamp: Date.now() - (conversationHistory.current.length - i) * 1000,
    }));

    try {
      const jobRole = jobRoles.find((r) => r.id === collected.target_job_role_id);
      if (!jobRole) throw new Error(`Job role not found: ${collected.target_job_role_id}`);
      if (!profileId) throw new Error("Profile not found. Please log in again.");

      await generateAndSaveRoadmap(profileId, collected, jobRole, msgs, (phase) =>
        setGenerationPhase(phase)
      );

      setOnboardingState("ROADMAP_READY");
      appendAIMessage(
        `ROADMAP_COMPILED ✓\n\nScore: ${collected.compatibility_percentage}% · ${collected.target_job_role_title}\nYour path is ready. Let's execute.`
      );
      setTimeout(() => router.replace("/(tabs)/roadmap"), 2500);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Roadmap generation failed");
      setIsGenerating(false);
      setOnboardingState("SHOW_COMPATIBILITY");
      appendAIMessage("ERR: roadmap compile failed. Tap RETRY.");
    }
  }

  function retryOllama() {
    setOllamaUnreachable(false);
    initialise();
  }

  function retryRoadmap() {
    if (!pendingCollected) return;
    setGenerationError(null);
    triggerRoadmapGeneration(pendingCollected);
  }

  const progress = getStateProgress(onboardingState, questionIndex);
  const stateLabel = getStateLabel(onboardingState);

  const currentStep =
    assessPhase === "setup"
      ? onboardingState === "COLLECT_NAME"
        ? 1
        : 2
      : assessPhase === "profile"
      ? 2
      : assessPhase === "basic"
      ? 3
      : assessPhase === "advanced"
      ? 4
      : 5;

  const phaseLabel =
    assessPhase === "setup"
      ? "CAREER_SETUP"
      : assessPhase === "profile"
      ? `PROFILE · Q${profileQuestionIndex}/4`
      : assessPhase === "basic"
      ? `BASIC_ASSESS · Q${Math.min(basicScores.length + 1, 5)}/5`
      : assessPhase === "advanced"
      ? `ADV_ASSESS · Q${Math.min(advancedScores.length + 1, 5)}/5`
      : "COMPLETE";

  if (ollamaUnreachable) {
    return (
      <View style={[styles.screen, styles.centred]}>
        <View style={styles.errorCard}>
          <View style={styles.errorTopLine} />
          <Text style={styles.errorLabel}>{"// AI_SERVICE_OFFLINE"}</Text>
          <View style={styles.errorIconWrap}>
            <Feather name="wifi-off" size={24} color={Colors.warning} />
          </View>
          <Text style={styles.errorTitle}>CONNECTION_FAILED</Text>
          <Text style={styles.errorBody}>
            {"'> backend unreachable\n> check server status\n> then retry'"}
          </Text>
          <Pressable style={styles.retryBtn} onPress={retryOllama}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryBtnGrad}
            >
              <Feather name="refresh-cw" size={13} color="#FFF" />
              <Text style={styles.retryBtnText}>$ RETRY_CONNECTION</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top },
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.stepTracker}>
          {STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const active = stepNum === currentStep;
            const done = stepNum < currentStep;
            return (
              <View key={label} style={styles.stepItem}>
                <Text
                  style={[
                    styles.stepNum,
                    done && styles.stepDone,
                    active && styles.stepActive,
                  ]}
                >
                  {String(stepNum).padStart(2, "0")}
                </Text>
                <Text
                  style={[
                    styles.stepLabel,
                    done && styles.stepLabelDone,
                    active && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.progressRow}>
          <View style={styles.headerLeft}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              disabled={isGenerating}
            >
              <Text style={styles.backBtnText}>← BACK</Text>
            </Pressable>
            <Text style={styles.phaseLabel}>{phaseLabel}</Text>
          </View>
          <Text style={styles.pctLabel}>
            {String(currentStep).padStart(2, "0")}/05 · {progress}%
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </View>

      {/* ── Chat body ── */}
      <View style={styles.chatArea}>
        {isGenerating && (
          <View style={styles.overlay}>
            <View style={styles.genCard}>
              <View style={styles.genCardTopLine} />
              <Text style={styles.genLabel}>{"$ nexa compile --roadmap --ai"}</Text>
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
              <Text style={styles.genTitle}>COMPILING_ROADMAP</Text>
              <Text style={styles.genPhase}>{generationPhase || "initializing..."}</Text>
              <View style={styles.genSteps}>
                {GENERATION_PHASES.map((phase, idx) => {
                  const activeIdx = GENERATION_PHASES.indexOf(generationPhase);
                  const active = phase === generationPhase;
                  const done = activeIdx > idx;
                  return (
                    <View key={phase} style={styles.genStep}>
                      <Text
                        style={[
                          styles.genDot,
                          done && styles.genDotDone,
                          active && styles.genDotActive,
                        ]}
                      >
                        {done ? "✓" : active ? "►" : "·"}
                      </Text>
                      <Text
                        style={[
                          styles.genStepText,
                          active && styles.genStepActive,
                          done && styles.genStepDone,
                        ]}
                      >
                        {phase}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {generationError && !isGenerating && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText} numberOfLines={1}>
              ERR: {generationError}
            </Text>
            <Pressable style={styles.bannerRetry} onPress={retryRoadmap}>
              <Text style={styles.bannerRetryText}>RETRY</Text>
            </Pressable>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble text={item.text} isUser={item.isUser} />}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {isTyping && (
                <View style={styles.typingWrap}>
                  <TypingIndicator />
                </View>
              )}
              {compatResult && !isGenerating && onboardingState !== "ROADMAP_READY" && (
                <View style={styles.compatWrap}>
                  <CompatibilityCard
                    percentage={compatResult.percentage}
                    level={compatResult.level}
                    basicAvg={compatResult.basicAvg}
                    advancedAvg={compatResult.advancedAvg}
                    roleTitle={targetRole?.title ?? ""}
                    earlyExit={isEarlyExit}
                  />
                  {pendingCollected && (
                    <Pressable
                      style={styles.generateBtn}
                      onPress={() => triggerRoadmapGeneration(pendingCollected)}
                    >
                      <View style={styles.generateBtnTopLine} />
                      <Text style={styles.generateBtnText}>
                        {"$ nexa compile --roadmap --ai"}
                      </Text>
                      <Text style={styles.generateBtnSub}>
                        {isEarlyExit ? "GENERATE BEGINNER ROADMAP →" : "GENERATE_ROADMAP →"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          }
        />
      </View>

      {/* ── Input area ── */}
      <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {currentInputType === "mcq" && mcqOptions ? (
          <MCQInput
            options={mcqOptions}
            onSelect={(text, index) => {
              if (inputDisabled || isTyping || isGenerating) return;
              // Compute client-side score for assessment phases
              if (assessPhase === "basic" || assessPhase === "advanced") {
                pendingMcqScore.current = mcqIndexToScore(index, mcqOptions.length);
              }
              setMcqOptions(null);
              setCurrentInputType(null);
              handleSend(text);
            }}
            disabled={inputDisabled || isTyping || isGenerating}
          />
        ) : currentInputType === "rating" ? (
          <RatingBar
            onRate={handleRating}
            disabled={inputDisabled || isTyping || isGenerating}
          />
        ) : currentInputType === "text" ? (
          <TextAnswerInput
            onSend={handleSend}
            disabled={inputDisabled || isTyping || isGenerating}
          />
        ) : assessPhase !== "done" ? (
          <DefaultInput
            onSend={handleSend}
            disabled={inputDisabled || isTyping || isGenerating}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centred: { alignItems: "center", justifyContent: "center", padding: 24 },

  header: {
    backgroundColor: Colors.background2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  stepTracker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 12,
  },
  stepItem: { flexDirection: "row", alignItems: "baseline", gap: 3, marginRight: 10 },
  stepNum: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  stepDone: { color: Colors.success },
  stepActive: { color: Colors.primary },
  stepLabel: {
    fontFamily: MONO,
    fontSize: 8,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  stepLabelDone: { color: Colors.success },
  stepLabelActive: { color: Colors.primary, fontWeight: "700" },

  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { paddingVertical: 2 },
  backBtnText: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
  },
  phaseLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  pctLabel: { fontFamily: MONO, fontSize: 10, color: Colors.primary, letterSpacing: 0.8 },

  progressTrack: {
    height: 2,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: { height: 2, backgroundColor: Colors.primary, borderRadius: 1 },

  chatArea: { flex: 1, backgroundColor: Colors.background, overflow: "hidden" },
  msgList: { paddingTop: 12, paddingBottom: 12 },
  typingWrap: { paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  compatWrap: { marginHorizontal: 12, marginTop: 8, marginBottom: 8 },

  generateBtn: {
    marginTop: 10,
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary + "60",
    borderRadius: 4,
    padding: 18,
    overflow: "hidden",
  },
  generateBtnTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
  },
  generateBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  generateBtnSub: {
    fontFamily: MONO,
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background + "F0",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  genCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 24,
    alignItems: "flex-start",
    width: "88%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  genCardTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
  },
  genLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  genTitle: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  genPhase: {
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.primary,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  genSteps: { width: "100%", gap: 8 },
  genStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  genDot: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, width: 14 },
  genDotActive: { color: Colors.primary },
  genDotDone: { color: Colors.success },
  genStepText: { fontFamily: MONO, fontSize: 11, color: Colors.textTertiary, flex: 1 },
  genStepActive: { color: Colors.textPrimary, fontWeight: "700" },
  genStepDone: { color: Colors.success },

  inputArea: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },

  errorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 24,
    alignItems: "flex-start",
    gap: 10,
    maxWidth: 340,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  errorTopLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.warning,
  },
  errorLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  errorIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: Colors.warning + "15",
    borderWidth: 1,
    borderColor: Colors.warning + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  errorBody: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  retryBtn: { borderRadius: 4, overflow: "hidden", alignSelf: "stretch" },
  retryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryBtnText: {
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.danger + "15",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.danger + "30",
  },
  errorBannerText: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 10,
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  bannerRetry: {
    backgroundColor: Colors.danger,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerRetryText: {
    fontFamily: MONO,
    fontSize: 9,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
});

const inputStyles = StyleSheet.create({
  ratingLabel: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  // MCQ
  mcqWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 6 },
  mcqOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.background2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mcqLetterBox: {
    width: 24,
    height: 24,
    borderRadius: 3,
    backgroundColor: Colors.primary + "15",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  mcqLetter: {
    fontFamily: MONO,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
  },
  mcqText: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 18,
  },

  // Rating
  ratingWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  ratingRow: { flexDirection: "row", gap: 6, paddingRight: 16, paddingBottom: 4 },
  ratingBox: {
    width: 40,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingNum: { fontFamily: MONO, fontSize: 14, fontWeight: "700" },
  ratingLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingBottom: 2,
  },
  legendText: { fontFamily: MONO, fontSize: 9, letterSpacing: 0.8 },
  legendSep: { fontFamily: MONO, fontSize: 9, color: Colors.textTertiary },

  // Text answer
  textWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  textInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  prompt: {
    fontFamily: MONO,
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 12,
    lineHeight: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
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
    borderColor: Colors.success + "30",
  },

  // Default input
  defaultRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  defaultInput: {
    flex: 1,
    minHeight: 46,
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

  // Send button
  sendBtn: { width: 42, height: 42, borderRadius: 5, overflow: "hidden" },
  sendBtnOff: { opacity: 0.35 },
  sendBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const compatStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  accentLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  eyebrow: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  roleName: {
    fontFamily: MONO,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 6 },
  pct: { fontFamily: MONO, fontSize: 52, fontWeight: "700", lineHeight: 56 },
  pctUnit: { fontFamily: MONO, fontSize: 16, color: Colors.textTertiary },
  blockBar: { fontFamily: MONO, fontSize: 11, letterSpacing: 1, marginBottom: 14 },
  levelBadge: {
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 3,
  },
  levelTitle: { fontFamily: MONO, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  levelSub: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, lineHeight: 16 },
  statsWrap: { gap: 6, marginBottom: 14 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  statLabel: { fontFamily: MONO, fontSize: 9, color: Colors.textTertiary, letterSpacing: 1 },
  statVal: { fontFamily: MONO, fontSize: 12, fontWeight: "700" },
  footer: { fontFamily: MONO, fontSize: 10, color: Colors.textTertiary, letterSpacing: 0.5 },
});
