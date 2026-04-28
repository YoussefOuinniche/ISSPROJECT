/**
 * roadmapService.ts
 * Full roadmap generation pipeline:
 *
 *   Step A — Gap Analysis:   Find skills needed for target role that user lacks
 *   Step B — Course Mapping: Find best course for each gap skill
 *   Step C — AI Generation:  Call Ollama to produce an ordered roadmap JSON
 *   Step D — Persistence:    Write everything to Supabase in correct order
 *
 * The `generation_params` JSONB field on ai_roadmaps stores metadata
 * (is_critical, why_needed per step) that doesn't have dedicated DB columns.
 */

import { generateStructuredJson } from "./ollamaService";
import {
  getSkillsByCategory,
  getCoursesForSkill,
  getSkillInsights,
  createRoadmap,
  createRoadmapSteps,
  saveChatSession,
  saveChatMessage,
  upsertUserSkills,
  updateProfile,
  createNotification,
  type JobRole,
  type Skill,
  type Course,
  type SkillInsight,
} from "./supabaseService";
import type { CollectedData, OnboardingMessage } from "./onboardingService";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RoadmapStep {
  step_order: number;
  title: string;
  description: string;
  skill_id: string | null;
  course_id: string | null;
  duration_hours: number;
  is_critical: boolean;
  why_needed: string;
  tools_needed: string[];
}

export interface GeneratedRoadmap {
  title: string;
  summary: string;
  estimated_weeks: number;
  steps: RoadmapStep[];
}

interface GapSkill extends Skill {
  insight: SkillInsight | null;
  bestCourse: Course | null;
}

// ─── Step A: Gap Analysis ───────────────────────────────────────────────────────

/**
 * Computes the skill gap between what the user knows and what the target
 * job role's category requires.
 *
 * Strategy: All active skills in the job role's category are considered
 * "relevant". We subtract the user's known skill IDs to get the gap.
 * A maximum of 10 gap skills are returned to keep the roadmap focused.
 */
async function analyzeSkillGaps(
  jobRole: JobRole,
  userSkillIds: Set<string>
): Promise<GapSkill[]> {
  const categorySkills = await getSkillsByCategory(jobRole.category_id);

  const gapSkills = categorySkills.filter(
    (s) => !userSkillIds.has(s.id)
  );

  // Fetch insights and courses in parallel (capped at 10 gap skills)
  const top10 = gapSkills.slice(0, 10);

  const enriched = await Promise.all(
    top10.map(async (skill): Promise<GapSkill> => {
      const [insight, courses] = await Promise.all([
        getSkillInsights(skill.id).catch(() => null),
        getCoursesForSkill(skill.id).catch(() => []),
      ]);
      return {
        ...skill,
        insight: insight ?? null,
        bestCourse: courses[0] ?? null,
      };
    })
  );

  // Sort: high demand / trending skills first
  return enriched.sort((a, b) => {
    const scoreA = a.insight?.trend_score ?? 0;
    const scoreB = b.insight?.trend_score ?? 0;
    return scoreB - scoreA;
  });
}

// ─── Step C: AI Roadmap Generation ─────────────────────────────────────────────

const ROADMAP_SYSTEM_PROMPT = `You are a precise career roadmap expert. Generate a learning roadmap as structured JSON.

STEP TYPES — mix all four across the roadmap. Pattern: Learn → Build → Learn → Build/Apply → Review:
  LEARN  — theory, syntax, concepts. Title: "Learn ...", "Understand ...", "Master the basics of ..."
  BUILD  — hands-on mini-project using the skill. Title: "Build a ...", "Create a ...", "Implement a ..."
  APPLY  — integrate skill into a larger project. Title: "Add ... to your project", "Wire ... into ..."
  REVIEW — consolidate, test, refactor. Title: "Review & Test ...", "Refactor ... using best practices"

Each BUILD or APPLY step must include what the user will create and how it connects to their target role in the description.

TOOLS NEEDED per step:
- List the EXACT tools, libraries, frameworks, and software the user must install and use for this step.
- Be specific: "Express.js" not "backend framework", "pytest" not "testing library", "Postman" not "API tool".
- LEARN steps: 2–3 core tools (the technology being learned + its main dev tool).
- BUILD/APPLY steps: 3–6 tools (everything needed to actually build the project).
- REVIEW steps: same tools as the step being reviewed plus any linting/testing tools.
- Always include the setup tool (npm, pip, cargo, etc.) when relevant.

Rules:
1. Never make all steps "Learn ..." — at least 40% must be BUILD or APPLY steps
2. Order from foundational to advanced; first step is always a LEARN
3. Leverage existing skills — don't repeat what the user already knows
4. Add estimated duration in hours (10 hrs/week pace)
5. Mark the 2-3 most critical/trending skills as is_critical: true
6. One-sentence why_needed linking this step to the target job
7. tools_needed must be a flat array of short, precise tool names
Respond ONLY with valid JSON matching the schema exactly. No markdown, no explanation.`;

async function callOllamaRoadmapGeneration(
  jobRole: JobRole,
  collected: CollectedData,
  gapSkills: GapSkill[]
): Promise<GeneratedRoadmap> {
  const existingSkillNames = collected.skills
    .map((s) => `${s.skill_name} (${s.proficiency_level})`)
    .join(", ");

  const gapList = gapSkills
    .map((s) => {
      const course = s.bestCourse
        ? `course: "${s.bestCourse.title}" by ${s.bestCourse.provider ?? "N/A"} (${s.bestCourse.duration_hours ?? "?"} hrs, ${s.bestCourse.difficulty ?? "?"}) id: ${s.bestCourse.id}`
        : "no course found";
      const insight = s.insight
        ? `demand: ${s.insight.demand_level ?? "unknown"}, trend: ${s.insight.trend_score ?? "?"}/10`
        : "no market data";
      return `- ${s.name} (id: ${s.id}) | ${insight} | ${course}`;
    })
    .join("\n");

  const levelContext = (collected as any).overall_level
    ? `Assessment Level: ${(collected as any).overall_level} (${(collected as any).compatibility_percentage ?? "?"}% compatibility score)`
    : `Education: ${collected.education_level}, Experience: ${collected.years_experience} yrs`;

  const userPrompt = `Generate a roadmap for this user:

Target Role: ${jobRole.title} (${jobRole.seniority_level ?? "any"} level, avg salary $${jobRole.avg_salary_usd ?? "N/A"}/yr)
User Background: ${levelContext}
Already Knows: ${existingSkillNames || "nothing yet — build from scratch"}

Skills to Learn (gap analysis):
${gapList}

Required JSON schema:
{
  "title": "string — compelling roadmap title",
  "summary": "string — 2 motivating sentences about this path",
  "estimated_weeks": 12,
  "steps": [
    {
      "step_order": 1,
      "title": "string — MUST reflect step type: Learn / Build / Apply / Review prefix",
      "description": "string — for BUILD/APPLY steps describe the actual project/output; for LEARN steps describe what concepts are covered",
      "skill_id": "uuid or null",
      "course_id": "uuid or null",
      "duration_hours": 20,
      "is_critical": false,
      "why_needed": "one sentence linking this step to the target job",
      "tools_needed": ["Tool1", "Tool2", "Tool3"]
    }
  ]
}

IMPORTANT: Alternate step types. Example pattern for 8 steps:
1. Learn (foundation) → 2. Build (apply it) → 3. Learn (next concept) → 4. Build (project) →
5. Apply (integrate) → 6. Learn (advanced) → 7. Build (capstone) → 8. Review (polish)

Example tools_needed by step type:
- "Learn Node.js" → ["Node.js", "npm", "VS Code", "Node REPL"]
- "Build a REST API" → ["Node.js", "Express.js", "Postman", "MongoDB", "Mongoose", "nodemon"]
- "Apply React to your project" → ["React", "Vite", "npm", "React DevTools", "Axios"]
- "Review & Test your API" → ["Jest", "Supertest", "ESLint", "Postman"]`;

  return generateStructuredJson<GeneratedRoadmap>(
    ROADMAP_SYSTEM_PROMPT,
    userPrompt
  );
}

// ─── Step D: Persistence ────────────────────────────────────────────────────────

/**
 * Validates and cleans up the AI-generated roadmap to ensure all
 * skill_ids and course_ids actually exist in our database.
 */
function sanitizeRoadmap(
  roadmap: GeneratedRoadmap,
  gapSkills: GapSkill[]
): GeneratedRoadmap {
  const validSkillIds = new Set(gapSkills.map((s) => s.id));
  const validCourseIds = new Set(
    gapSkills.map((s) => s.bestCourse?.id).filter(Boolean) as string[]
  );

  const steps = roadmap.steps.map((step, idx) => ({
    ...step,
    step_order: idx + 1,
    skill_id:
      step.skill_id && validSkillIds.has(step.skill_id)
        ? step.skill_id
        : null,
    course_id:
      step.course_id && validCourseIds.has(step.course_id)
        ? step.course_id
        : null,
    duration_hours: step.duration_hours > 0 ? step.duration_hours : 10,
    tools_needed: Array.isArray(step.tools_needed) ? step.tools_needed : [],
  }));

  return {
    ...roadmap,
    estimated_weeks:
      roadmap.estimated_weeks > 0 ? roadmap.estimated_weeks : 12,
    steps,
  };
}

// ─── Main Entry Point ───────────────────────────────────────────────────────────

/**
 * Full pipeline: gap analysis → AI generation → Supabase persistence.
 *
 * Returns the newly created roadmap UUID so the UI can navigate to it.
 */
export async function generateAndSaveRoadmap(
  profileId: string,
  collected: CollectedData,
  jobRole: JobRole,
  conversationMessages: OnboardingMessage[],
  onProgress?: (phase: string) => void
): Promise<string> {
  // ── Phase 1: Profile + Skills ──────────────────────────────────────────────
  onProgress?.("Saving your profile…");

  await updateProfile(profileId, {
    full_name: collected.full_name,
    education_level: collected.education_level,
    years_experience: collected.years_experience,
    onboarding_complete: true,
  });

  const userSkillIds = new Set(collected.skills.map((s) => s.skill_id));

  await upsertUserSkills(
    profileId,
    collected.skills.map((s) => ({
      skill_id: s.skill_id,
      proficiency_level: s.proficiency_level,
    }))
  );

  // ── Phase 2: Gap Analysis ──────────────────────────────────────────────────
  onProgress?.("Analyzing skill gaps…");

  const gapSkills = await analyzeSkillGaps(jobRole, userSkillIds);

  if (__DEV__) {
    console.log(`[roadmap] Gap skills found: ${gapSkills.length}`);
    gapSkills.forEach((g) =>
      console.log(`  · ${g.name} (course: ${g.bestCourse?.title ?? "none"})`)
    );
  }

  // ── Phase 3: AI Roadmap Generation ────────────────────────────────────────
  onProgress?.("Generating your roadmap with AI…");

  let rawRoadmap: GeneratedRoadmap;
  try {
    rawRoadmap = await callOllamaRoadmapGeneration(jobRole, collected, gapSkills);
  } catch (err) {
    if (__DEV__)
      console.warn("[roadmap] Ollama generation failed, using fallback", err);
    // Fallback: create a basic roadmap from gap skills without AI
    rawRoadmap = buildFallbackRoadmap(jobRole, collected, gapSkills);
  }

  const roadmap = sanitizeRoadmap(rawRoadmap, gapSkills);

  if (__DEV__) {
    console.log(
      `[roadmap] Generated: "${roadmap.title}", ${roadmap.steps.length} steps`
    );
  }

  // ── Phase 4: Persist to Supabase ──────────────────────────────────────────
  onProgress?.("Saving your roadmap…");

  // Build generation_params to store is_critical / why_needed / tools_needed per step
  const stepMetadata: Record<
    string,
    { is_critical: boolean; why_needed: string; tools_needed: string[] }
  > = {};
  roadmap.steps.forEach((step) => {
    stepMetadata[String(step.step_order)] = {
      is_critical: step.is_critical,
      why_needed: step.why_needed,
      tools_needed: Array.isArray(step.tools_needed) ? step.tools_needed : [],
    };
  });

  const roadmapId = await createRoadmap({
    profile_id: profileId,
    job_role_id: jobRole.id,
    title: roadmap.title,
    summary: roadmap.summary,
    estimated_weeks: roadmap.estimated_weeks,
    generation_params: { step_metadata: stepMetadata },
  });

  await createRoadmapSteps(
    roadmap.steps.map((step, idx) => ({
      roadmap_id: roadmapId,
      profile_id: profileId,
      skill_id: step.skill_id ?? null,
      course_id: step.course_id ?? null,
      step_order: step.step_order,
      title: step.title,
      description: `${step.description}\n\nWhy needed: ${step.why_needed}`,
      duration_hours: step.duration_hours,
      status: (idx === 0 ? "available" : "locked") as "available" | "locked",
    }))
  );

  // ── Phase 5: Chat Session ──────────────────────────────────────────────────
  onProgress?.("Saving conversation history…");

  const sessionId = await saveChatSession(
    profileId,
    `Onboarding — ${new Date().toLocaleDateString()}`
  );

  for (const msg of conversationMessages) {
    await saveChatMessage(sessionId, msg.role, msg.content, {
      onboarding: true,
    });
  }

  // ── Phase 6: Notification ──────────────────────────────────────────────────
  await createNotification(
    profileId,
    "roadmap_update",
    "Your roadmap is ready! 🚀",
    `Your personalized roadmap to become a ${jobRole.title} is live. Start your first step now!`
  );

  return roadmapId;
}

// ─── Fallback Roadmap ───────────────────────────────────────────────────────────

/**
 * Creates a basic roadmap from gap skills if Ollama is unavailable.
 * Ensures the user always gets a roadmap even if LLM generation fails.
 */
/** Infer a sensible tools list from a skill name when the AI is unavailable. */
function inferTools(skillName: string, stepType: "learn" | "build" | "apply" | "review"): string[] {
  const n = skillName.toLowerCase();

  // Base tools by skill keyword
  const bases: string[] = (() => {
    if (n.includes("react"))        return ["React", "Vite", "npm", "React DevTools", "Axios"];
    if (n.includes("vue"))          return ["Vue.js", "Vite", "npm", "Vue DevTools", "Pinia"];
    if (n.includes("angular"))      return ["Angular CLI", "TypeScript", "npm", "RxJS", "Angular DevTools"];
    if (n.includes("next"))         return ["Next.js", "React", "npm", "Vercel CLI", "TypeScript"];
    if (n.includes("node"))         return ["Node.js", "npm", "nodemon", "VS Code", "Postman"];
    if (n.includes("express"))      return ["Express.js", "Node.js", "Postman", "Nodemon", "dotenv"];
    if (n.includes("django"))       return ["Django", "Python", "pip", "SQLite/PostgreSQL", "Postman"];
    if (n.includes("flask"))        return ["Flask", "Python", "pip", "Postman", "virtualenv"];
    if (n.includes("fastapi"))      return ["FastAPI", "Python", "pip", "Uvicorn", "Swagger UI"];
    if (n.includes("python"))       return ["Python", "pip", "VS Code", "Jupyter Notebook", "venv"];
    if (n.includes("typescript"))   return ["TypeScript", "tsc", "npm", "ts-node", "VS Code"];
    if (n.includes("javascript"))   return ["JavaScript", "Node.js", "npm", "VS Code", "Chrome DevTools"];
    if (n.includes("sql") || n.includes("postgres")) return ["PostgreSQL", "pgAdmin", "DBeaver", "psql CLI"];
    if (n.includes("mongo"))        return ["MongoDB", "Mongoose", "MongoDB Compass", "Atlas"];
    if (n.includes("docker"))       return ["Docker", "Docker Compose", "Docker Desktop", "VS Code Docker ext."];
    if (n.includes("kubernetes"))   return ["kubectl", "Minikube", "Helm", "Docker", "k9s"];
    if (n.includes("git"))          return ["Git", "GitHub", "VS Code", "GitHub CLI"];
    if (n.includes("aws"))          return ["AWS CLI", "IAM Console", "S3", "EC2", "CloudWatch"];
    if (n.includes("graphql"))      return ["GraphQL", "Apollo Client", "Apollo Studio", "Postman"];
    if (n.includes("redis"))        return ["Redis", "Redis CLI", "RedisInsight", "Node.js redis client"];
    if (n.includes("jest") || n.includes("test")) return ["Jest", "Testing Library", "Vitest", "ESLint"];
    if (n.includes("figma") || n.includes("ui") || n.includes("ux")) return ["Figma", "VS Code", "Chrome DevTools", "Storybook"];
    if (n.includes("linux"))        return ["Linux Terminal", "Bash", "SSH", "vim/nano", "htop"];
    if (n.includes("java"))         return ["Java JDK", "Maven/Gradle", "IntelliJ IDEA", "Spring Boot"];
    if (n.includes("spring"))       return ["Spring Boot", "Java JDK", "Maven", "IntelliJ IDEA", "Postman"];
    if (n.includes("swift"))        return ["Xcode", "Swift", "Swift Package Manager", "Simulator"];
    if (n.includes("kotlin"))       return ["Android Studio", "Kotlin", "Gradle", "ADB", "Emulator"];
    if (n.includes("rust"))         return ["Rust", "Cargo", "rustup", "VS Code", "rust-analyzer"];
    if (n.includes("go") || n.includes("golang")) return ["Go", "go CLI", "VS Code", "Postman", "Air (hot reload)"];
    if (n.includes("css") || n.includes("tailwind")) return ["Tailwind CSS", "PostCSS", "VS Code", "Browser DevTools"];
    if (n.includes("webpack") || n.includes("vite") || n.includes("build")) return ["Vite", "npm", "ESLint", "Prettier"];
    if (n.includes("ci") || n.includes("devops") || n.includes("pipeline")) return ["GitHub Actions", "Docker", "YAML", "bash scripting"];
    if (n.includes("machine learning") || n.includes("ml")) return ["Python", "scikit-learn", "Jupyter Notebook", "pandas", "numpy"];
    if (n.includes("tensorflow") || n.includes("pytorch")) return ["Python", "TensorFlow/PyTorch", "Jupyter Notebook", "CUDA (optional)", "pip"];
    return [skillName, "VS Code", "npm/pip", "Terminal"];
  })();

  // BUILD/APPLY steps get extra integration tools
  if (stepType === "build" || stepType === "apply") {
    return [...new Set([...bases, "Git", "GitHub"])].slice(0, 7);
  }
  if (stepType === "review") {
    return [...new Set([bases[0], "ESLint/Pylint", "Git", "GitHub", bases[1] ?? "VS Code"])].slice(0, 5);
  }
  return bases.slice(0, 4);
}

function buildFallbackRoadmap(
  jobRole: JobRole,
  collected: CollectedData,
  gapSkills: GapSkill[]
): GeneratedRoadmap {
  type StepType = "learn" | "build" | "apply" | "review";
  const STEP_PATTERNS: Array<(skill: GapSkill, role: string) => Partial<RoadmapStep> & { _type: StepType }> = [
    (s, r) => ({ _type: "learn",  title: `Learn ${s.name}`,                           description: `Master the fundamentals of ${s.name} including core concepts and syntax.` }),
    (s, r) => ({ _type: "build",  title: `Build a mini-project with ${s.name}`,        description: `Create a small working project that applies ${s.name} — this is how ${r} roles expect you to use it.` }),
    (s, r) => ({ _type: "learn",  title: `Learn ${s.name}`,                           description: `Go deeper into ${s.name}: advanced patterns, best practices, and real-world usage.` }),
    (s, r) => ({ _type: "apply",  title: `Apply ${s.name} to your portfolio project`,  description: `Integrate ${s.name} into a larger project that demonstrates ${r} skills to employers.` }),
    (s, r) => ({ _type: "build",  title: `Build a ${s.name} feature`,                 description: `Implement a production-style feature using ${s.name} following industry standards.` }),
    (s, r) => ({ _type: "learn",  title: `Learn ${s.name}`,                           description: `Understand how ${s.name} fits into the ${r} tech stack and when to use it.` }),
    (s, r) => ({ _type: "apply",  title: `Apply ${s.name} — real-world scenario`,     description: `Tackle a realistic ${r} task using ${s.name}: debug, optimize, and document your work.` }),
    (s, r) => ({ _type: "review", title: `Review & refactor with ${s.name}`,          description: `Revisit your previous work, refactor using ${s.name} best practices, and write tests.` }),
  ];

  const steps: RoadmapStep[] = gapSkills.slice(0, 8).map((skill, idx) => {
    const pattern = STEP_PATTERNS[idx % STEP_PATTERNS.length](skill, jobRole.title);
    return {
      step_order: idx + 1,
      title: pattern.title!,
      description: pattern.description!,
      skill_id: skill.id,
      course_id: skill.bestCourse?.id ?? null,
      duration_hours: skill.bestCourse?.duration_hours ?? 15,
      is_critical: idx < 3,
      why_needed: `${skill.name} is a core requirement for ${jobRole.title} roles.`,
      tools_needed: inferTools(skill.name, pattern._type),
    };
  });

  const totalHours = steps.reduce((sum, s) => sum + s.duration_hours, 0);
  const estimatedWeeks = Math.max(4, Math.ceil(totalHours / 10));

  return {
    title: `Your Path to ${jobRole.title}`,
    summary: `A structured ${estimatedWeeks}-week roadmap built for ${collected.full_name}. Follow each step to build the skills you need for ${jobRole.title}.`,
    estimated_weeks: estimatedWeeks,
    steps,
  };
}
