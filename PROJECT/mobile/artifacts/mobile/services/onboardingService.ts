/**
 * onboardingService.ts
 *
 * Adaptive knowledge assessment flow:
 *   GREETING → COLLECT_NAME → COLLECT_TARGET_ROLE
 *   → COLLECT_PROFILE  (education, experience, hours/week, current stack)
 *   → ASSESS_BASIC     (5 questions: MCQ knowledge-level + TEXT actual knowledge)
 *   → ASSESS_ADVANCED  (5 questions, OR early-exit if basic avg < 4)
 *   → SHOW_COMPATIBILITY
 *   → GENERATING_ROADMAP → ROADMAP_READY
 */

import type { JobRole } from "./supabaseService";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type OnboardingState =
  | "GREETING"
  | "COLLECT_NAME"
  | "COLLECT_TARGET_ROLE"
  | "COLLECT_PROFILE"
  | "ASSESS_BASIC"
  | "ASSESS_ADVANCED"
  | "SHOW_COMPATIBILITY"
  | "GENERATING_ROADMAP"
  | "ROADMAP_READY";

export interface CollectedData {
  full_name: string;
  target_job_role_id: string;
  target_job_role_title: string;
  education_level: "high_school" | "associate" | "bachelor" | "master" | "doctorate" | "other";
  years_experience: number;
  hours_per_week: number;
  current_stack: string;
  background_context: string;
  skills: Array<{
    skill_id: string;
    skill_name: string;
    proficiency_level: "beginner" | "intermediate" | "advanced" | "expert";
  }>;
  basic_scores: number[];
  advanced_scores: number[];
  compatibility_percentage: number;
  overall_level: "beginner" | "intermediate" | "advanced";
}

export interface OnboardingMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type AssessmentPhase = "setup" | "profile" | "basic" | "advanced" | "done";
export type QuestionInputType = "rating" | "text" | "mcq" | null;

// ─── Motivational message pools (randomly injected to vary AI responses) ─────────

const MOTIVATIONAL_LOW = [
  "That's your starting point — your roadmap will get you there step by step! 🚀",
  "Every expert was once exactly here! This will be one of your early breakthroughs. 💡",
  "Perfect honesty — this is what makes your roadmap actually useful. Keep going! ⚡",
  "No worries — your personalized path will build this from the ground up. 🎯",
  "This is great to know! Now your roadmap knows exactly where to start. 🔥",
  "That gap? Consider it filled by your upcoming path. We've got you. 💪",
  "Knowing what you don't know is step one — your roadmap will tackle this head-on. 🌟",
];

const MOTIVATIONAL_MED = [
  "Solid foundation — your roadmap will sharpen this into a real strength.",
  "You've got the basics — your path will turn that into deep expertise.",
  "Good start! Focused practice and this becomes your superpower.",
  "That's a workable base — your roadmap will level this up quickly.",
  "You're on the right track — your plan will fill the gaps efficiently.",
  "Nice — that's exactly the level where focused practice makes the biggest jump.",
];

const MOTIVATIONAL_HIGH = [
  "Impressive — that knowledge will give you a real edge from day one.",
  "Strong answer! That'll accelerate your progress significantly.",
  "That's the kind of depth that makes you stand out. Great.",
  "Excellent — that foundation means your roadmap can skip straight to advanced topics.",
  "That's expert-level thinking — your roadmap will build on that.",
];

function pickN(arr: string[], n: number): string {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).join("\n");
}

// ─── Progress & Labels ──────────────────────────────────────────────────────────

export function getStateProgress(state: OnboardingState, questionIndex = 0): number {
  switch (state) {
    case "GREETING":           return 0;
    case "COLLECT_NAME":       return 5;
    case "COLLECT_TARGET_ROLE":return 12;
    case "COLLECT_PROFILE":    return 18 + questionIndex * 3;  // 18–30
    case "ASSESS_BASIC":       return 30 + questionIndex * 8;  // 30–70
    case "ASSESS_ADVANCED":    return 70 + questionIndex * 5;  // 70–95
    case "SHOW_COMPATIBILITY": return 95;
    case "GENERATING_ROADMAP": return 97;
    case "ROADMAP_READY":      return 100;
    default:                   return 0;
  }
}

export function getStateLabel(state: OnboardingState): string {
  const labels: Record<OnboardingState, string> = {
    GREETING:            "Welcome",
    COLLECT_NAME:        "Your Name",
    COLLECT_TARGET_ROLE: "Target Role",
    COLLECT_PROFILE:     "Your Profile",
    ASSESS_BASIC:        "Basic Assessment",
    ASSESS_ADVANCED:     "Advanced Assessment",
    SHOW_COMPATIBILITY:  "Results",
    GENERATING_ROADMAP:  "Building Roadmap",
    ROADMAP_READY:       "Done!",
  };
  return labels[state];
}

// ─── System Prompts ─────────────────────────────────────────────────────────────

export function buildSetupSystemPrompt(
  jobRoles: JobRole[],
  priorContext?: { name?: string | null; target_role?: string | null },
): string {
  const roleList = jobRoles.map((r) => `- ${r.title} (id: ${r.id})`).join("\n");
  const knownName = priorContext?.name?.trim() || "";
  const knownRole = priorContext?.target_role?.trim() || "";

  const targetRule = `
CRITICAL RULE — TARGET ROLE:
Whatever role the user names is the target. Cybersecurity stays cybersecurity. Embedded
stays embedded. Niche specialities stay niche. NEVER tell the user "the closest thing
we have is X" and NEVER reroute them to a different role.

The KNOWN_ROLES list below is reference only — if the user's role matches an entry,
use that entry's UUID. If it doesn't match, output the user's role text verbatim
as role_title and use "custom" as role_id. Do not substitute.

KNOWN_ROLES (reference, NOT a hard menu):
${roleList}`;

  if (knownName && knownRole) {
    return `You are NexaPath AI, a friendly career assessment expert. Keep every reply SHORT (2-3 sentences max).

You already know this user from a previous session:
- Name: ${knownName}
- Last target role: ${knownRole}

STEP 1: Greet ${knownName} warmly and ask if they still want to target "${knownRole}", or want a different role today.
STEP 2: Take whichever role they confirm — keep it verbatim. If it matches a KNOWN_ROLES entry, use its UUID; else role_id="custom".
STEP 3: Confirm the final choice, then output EXACTLY on its own line:
<TARGET_SET>{"name":"${knownName}","role_id":"THE_UUID_OR_custom","role_title":"THE_USERS_ROLE_VERBATIM"}</TARGET_SET>

Do NOT ask their name again — you already know it.
${targetRule}`;
  }

  if (knownName) {
    return `You are NexaPath AI, a friendly career assessment expert. Keep every reply SHORT (2-3 sentences max).

You already know the user's name from a previous session: ${knownName}.

STEP 1: Greet ${knownName} and ask what role or career they want to focus on.
STEP 2: Take their answer verbatim as the target.
STEP 3: Confirm and output EXACTLY on its own line:
<TARGET_SET>{"name":"${knownName}","role_id":"THE_UUID_OR_custom","role_title":"THE_USERS_ROLE_VERBATIM"}</TARGET_SET>
${targetRule}`;
  }

  return `You are NexaPath AI, a friendly career assessment expert. Keep every reply SHORT (2-3 sentences max).

The user's first message will be their name. After receiving it:
STEP 1: Greet them by name and ask what role or career they want to pursue.
STEP 2: Take their answer verbatim as the target.
STEP 3: Confirm and output EXACTLY on its own line:
<TARGET_SET>{"name":"THEIR_NAME","role_id":"THE_UUID_OR_custom","role_title":"THE_USERS_ROLE_VERBATIM"}</TARGET_SET>
${targetRule}`;
}

/**
 * Profile collection prompt — asked right after role is confirmed.
 * Collects education, experience, hours/week, and current tools.
 * Each question uses MCQ or TEXT.
 */
export function buildProfileCollectionPrompt(name: string, roleTitle: string): string {
  return `You are NexaPath AI collecting profile information for ${name} (target: ${roleTitle}).

Ask EXACTLY 4 questions, ONE at a time, to gather profile data needed for a perfect roadmap.

QUESTION ORDER:
1. Education level → [MCQ:High School|Some College|Bachelor's Degree|Master's / PhD|Self-Taught / Bootcamp]
2. Years of tech/professional experience → [MCQ:0 (student/beginner)|Less than 1 year|1–2 years|3–5 years|5+ years]
3. Hours per week you can dedicate to learning → [MCQ:Less than 5h|5–10h|10–20h|20h or more]
4. What tools, languages, or frameworks do you already know? List them or say "none". → end with: "Type your answer below ✍️ [TEXT_ME]"

RULES:
- Label each: "**Profile Q1/4:**" through "**Profile Q4/4:**"
- For MCQ questions, append the options tag EXACTLY like: [MCQ:Option A|Option B|Option C]
- Be friendly and brief — one sentence intro then the question.
- After Q4 is answered, output EXACTLY on its own line:
<PROFILE_SET>{"education":"ANSWER","experience":"ANSWER","hours_per_week":"ANSWER","current_stack":"ANSWER"}</PROFILE_SET>

Start immediately with Profile Q1/4.`;
}

/**
 * Basic assessment — 5 questions mixing MCQ (knowledge-level) and TEXT (actual knowledge).
 * MCQ: "How well do you know X" / "How familiar are you with Y"  → NEVER ask to explain for MCQ
 * TEXT: "Describe X", "What would you do in scenario Y"  → test actual knowledge
 */
export function buildBasicAssessmentSystemPrompt(name: string, roleTitle: string): string {
  const lowPool = pickN(MOTIVATIONAL_LOW, 4);
  const medPool = pickN(MOTIVATIONAL_MED, 3);
  const highPool = pickN(MOTIVATIONAL_HIGH, 2);

  return `You are NexaPath AI conducting a knowledge assessment for ${name}, targeting ${roleTitle}.

QUESTION TYPES — use BOTH across 5 questions:

1. MCQ QUESTION — assess KNOWLEDGE LEVEL only. Ask "How well do you know X?" or "How familiar are you with Y?".
   NEVER ask them to explain or define anything in an MCQ.
   Append EXACTLY: [MCQ:No experience|Basic awareness|Used it a few times|Proficient|Expert-level]
   Map the chosen option to a score internally: option 1=1, option 2=3, option 3=5, option 4=7, option 5=9.
   Include [SCORE:X] hidden in your response based on which option they chose.

2. TEXT QUESTION — test actual understanding. Ask them to describe, give an example, or explain a concept briefly.
   Append EXACTLY: "Type your answer below ✍️ [TEXT_ME]"
   Score 1–10 based on accuracy and depth. Include [SCORE:X] hidden in your response.

RESPONSE TONE BY SCORE (pick a DIFFERENT phrase each time — never repeat):
Low (1–3): ${lowPool}
Medium (4–6): ${medPool}
High (7–10): ${highPool}

RULES:
- Ask exactly 5 BASIC questions (core fundamentals for ${roleTitle}), ONE at a time.
- Use AT LEAST 2 MCQ AND at least 2 TEXT questions.
- Label each: "**Question 1/5 — Basic:**" through "**Question 5/5 — Basic:**"
- NEVER say "good", "great", "nice", "well done" for wrong/unknown answers.
- If user says "I don't know" / "idk" / blank → score = 1, respond with encouragement only.
- After Question 5 is scored, say ONLY: "Basic phase complete! Reviewing your scores... 🔄"

Start immediately with Question 1/5 — Basic.`;
}

/**
 * Advanced assessment — 5 deeper questions. MCQ for experience level, TEXT for real knowledge.
 */
export function buildAdvancedAssessmentSystemPrompt(
  name: string,
  roleTitle: string,
  basicAvg: number,
  difficulty: "medium" | "hard"
): string {
  const diffLabel = difficulty === "hard" ? "Advanced" : "Intermediate";
  const diffDesc  = difficulty === "hard"
    ? "real-world scenarios, architecture decisions, tradeoffs, best practices"
    : "practical knowledge, common tools, typical workflows, problem-solving";
  const bridge    = difficulty === "hard"
    ? `${name} scored ${basicAvg.toFixed(1)}/10 on basics — strong foundation, now probe their depth.`
    : `${name} scored ${basicAvg.toFixed(1)}/10 on basics — still building, ask practical intermediate questions.`;

  const lowPool  = pickN(MOTIVATIONAL_LOW, 3);
  const medPool  = pickN(MOTIVATIONAL_MED, 3);
  const highPool = pickN(MOTIVATIONAL_HIGH, 2);

  return `You are NexaPath AI continuing the assessment for ${name} (target: ${roleTitle}).
${bridge}

QUESTION TYPES — use BOTH:

1. MCQ QUESTION — assess experience/confidence level only.
   Ask "How much experience do you have with X?" or "How confident are you in Y?".
   NEVER ask to explain in MCQ.
   Append: [MCQ:Never tried|Tried once or twice|Some experience|Comfortable|Very confident]
   Map: option 1=1, 2=3, 3=5, 4=7, 5=9. Include [SCORE:X] hidden.

2. TEXT QUESTION — test real knowledge. Ask them to describe a real scenario, compare approaches, or explain a concept.
   Append: "Type your answer below ✍️ [TEXT_ME]"
   Score 1–10. Include [SCORE:X] hidden.

RESPONSE TONE (pick a DIFFERENT phrase each time):
Low (1–3): ${lowPool}
Medium (4–6): ${medPool}
High (7–10): ${highPool}

RULES:
- Ask exactly 5 ${diffLabel} questions about ${roleTitle}, ONE at a time.
- AT LEAST 2 MCQ AND at least 2 TEXT questions.
- Label: "**Question 1/5 — ${diffLabel}:**" through "**Question 5/5 — ${diffLabel}:**"
- NEVER use "good" / "great" / "nice" for wrong/unknown answers.
- If "I don't know" / "idk" → score 1, respond with motivation only.
- After Question 5, say ONLY: "Assessment complete! Calculating your compatibility score now... 🔄"

Start immediately with Question 1/5 — ${diffLabel}.`;
}

// ─── Score Computation ──────────────────────────────────────────────────────────

export interface CompatibilityResult {
  compatibility_percentage: number;
  overall_level: "beginner" | "intermediate" | "advanced";
  basic_avg: number;
  advanced_avg: number;
}

export function computeCompatibility(
  basicScores: number[],
  advancedScores: number[]
): CompatibilityResult {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const basic_avg    = avg(basicScores);
  const advanced_avg = avg(advancedScores);
  const raw = (basic_avg * 0.35 + advanced_avg * 0.65) * 10;
  const compatibility_percentage = Math.round(Math.min(100, Math.max(5, raw)));
  const overall_level: "beginner" | "intermediate" | "advanced" =
    compatibility_percentage >= 65 ? "advanced"
    : compatibility_percentage >= 35 ? "intermediate"
    : "beginner";
  return { compatibility_percentage, overall_level, basic_avg, advanced_avg };
}

export function getAdvancedDifficulty(basicScores: number[]): "medium" | "hard" {
  const avg = basicScores.reduce((a, b) => a + b, 0) / basicScores.length;
  return avg >= 6 ? "hard" : "medium";
}

/** Returns true if basic avg is too low to proceed to advanced questions. */
export function shouldEarlyExit(basicScores: number[]): boolean {
  if (basicScores.length === 0) return false;
  const avg = basicScores.reduce((a, b) => a + b, 0) / basicScores.length;
  return avg < 4;
}

// ─── TARGET_SET Extraction ──────────────────────────────────────────────────────

const TARGET_SET_REGEX = /<TARGET_SET>([\s\S]+?)<\/TARGET_SET>/i;

export function extractTargetSet(aiResponse: string): { name: string; role_id: string; role_title: string } | null {
  const match = aiResponse.match(TARGET_SET_REGEX);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as { name?: string; role_id?: string; role_title?: string };
    if (!parsed.role_id || !parsed.role_title) return null;
    return { name: parsed.name ?? "there", role_id: parsed.role_id, role_title: parsed.role_title };
  } catch { return null; }
}

export function stripTargetSet(text: string): string {
  return text.replace(TARGET_SET_REGEX, "").trim();
}

// ─── PROFILE_SET Extraction ──────────────────────────────────────────────────────

const PROFILE_SET_REGEX = /<PROFILE_SET>([\s\S]+?)<\/PROFILE_SET>/i;

export interface ProfileSet {
  education: string;
  experience: string;
  hours_per_week: string;
  current_stack: string;
}

export function extractProfileSet(aiResponse: string): ProfileSet | null {
  const match = aiResponse.match(PROFILE_SET_REGEX);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as Partial<ProfileSet>;
    return {
      education:      parsed.education      ?? "",
      experience:     parsed.experience     ?? "",
      hours_per_week: parsed.hours_per_week ?? "",
      current_stack:  parsed.current_stack  ?? "",
    };
  } catch { return null; }
}

export function stripProfileSet(text: string): string {
  return text.replace(PROFILE_SET_REGEX, "").trim();
}

export function parseEducationLevel(raw: string): CollectedData["education_level"] {
  const lower = raw.toLowerCase();
  if (lower.includes("high school"))                   return "high_school";
  if (lower.includes("associate"))                     return "associate";
  if (lower.includes("master") || lower.includes("phd") || lower.includes("doctorate")) return "master";
  if (lower.includes("bachelor"))                      return "bachelor";
  if (lower.includes("self") || lower.includes("boot")) return "other";
  return "other";
}

export function parseYearsExperience(raw: string): number {
  if (raw.includes("5+") || raw.includes("5 +"))      return 6;
  if (raw.includes("3") || raw.includes("4"))          return 4;
  if (raw.includes("1") || raw.includes("2"))          return 1;
  if (raw.includes("less") || raw.includes("< 1"))     return 0;
  return 0;
}

export function parseHoursPerWeek(raw: string): number {
  if (raw.includes("20") || raw.includes("more"))     return 20;
  if (raw.includes("10"))                              return 15;
  if (raw.includes("5–10") || raw.includes("5-10"))   return 7;
  return 3;
}

// ─── MCQ ─────────────────────────────────────────────────────────────────────────

const MCQ_REGEX = /\[MCQ:([^\]]+)\]/i;

export function extractMCQOptions(text: string): string[] | null {
  const match = text.match(MCQ_REGEX);
  if (!match) return null;
  const options = match[1].split("|").map((s) => s.trim()).filter(Boolean);
  return options.length >= 2 ? options : null;
}

export function stripMCQTag(text: string): string {
  return text.replace(MCQ_REGEX, "").trim();
}

/** Convert MCQ option index (0-based) to a 1–10 score. */
export function mcqIndexToScore(index: number, total: number): number {
  const scores = [1, 3, 5, 7, 9, 10];
  if (total <= 3) return [1, 5, 9][Math.min(index, 2)];
  if (total === 4) return [1, 4, 7, 9][Math.min(index, 3)];
  return scores[Math.min(index, scores.length - 1)];
}

// ─── Question Type Detection ─────────────────────────────────────────────────────

export function detectInputType(text: string): QuestionInputType {
  if (text.includes("[MCQ:"))     return "mcq";
  if (text.includes("[RATE_ME]")) return "rating";
  if (text.includes("[TEXT_ME]")) return "text";
  return null;
}

export function stripInputTags(text: string): string {
  return text
    .replace(MCQ_REGEX, "")
    .replace(/\[RATE_ME\]/g, "")
    .replace(/\[TEXT_ME\]/g, "")
    .replace(/Rate your familiarity 1[–-]10 👆\s*/gi, "")
    .replace(/Type your answer below ✍️\s*/gi, "")
    .trim();
}

// Backward compat
export function hasRateMeTag(text: string): boolean { return text.includes("[RATE_ME]"); }
export function stripRateMe(text: string): string   { return stripInputTags(text); }

// ─── AI Score Extraction ─────────────────────────────────────────────────────────

const SCORE_REGEX = /\[SCORE:(\d+)\]/i;

export function extractAIScore(text: string): number | null {
  const match = text.match(SCORE_REGEX);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return isNaN(n) ? null : Math.min(10, Math.max(1, n));
}

export function stripAIScore(text: string): string {
  return text.replace(SCORE_REGEX, "").trim();
}

// ─── Greeting ───────────────────────────────────────────────────────────────────

const GREETINGS = [
  "Hey there! 👋 Welcome to NexaPath!\n\nI'm your AI career guide. I'll assess your knowledge, calculate your compatibility with your target role, and build you a personalized learning roadmap.\n\nTakes about 5 minutes. Let's go! 🚀\n\nFirst — what's your name?",
  "Hello! 👋 Great to have you at NexaPath!\n\nI'm going to ask you a few quick questions to understand where you are and where you want to go — then I'll build your personalized roadmap.\n\nShould only take 5 minutes! What's your name?",
  "Welcome to NexaPath! 🚀\n\nI'm your AI career assistant. I'll assess your current knowledge and create a custom learning path tailored exactly to you.\n\nReady to get started? What's your name?",
];

export function getGreetingMessage(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}
