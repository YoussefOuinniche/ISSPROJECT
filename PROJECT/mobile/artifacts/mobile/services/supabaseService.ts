/**
 * supabaseService.ts
 * Direct Supabase REST (PostgREST) integration for the mobile app.
 *
 * Uses the service-role key for unrestricted access in this dev/demo context.
 * All data-mutation functions accept an explicit profileId to avoid coupling
 * to any particular auth mechanism — the caller obtains it once at startup
 * via fetchProfileId() then passes it through.
 */

import { getMobileAccessToken, getMobileApiBaseUrl } from "@/lib/api/runtime";

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = "https://byhpsacljgnwemwfudkk.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHBzYWNsamdud2Vtd2Z1ZGtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTkwMDE4OSwiZXhwIjoyMDkxNDc2MTg5fQ.caZyvSP_qpEX9IKLEw2yBMZG1m4tR8uH9Ot_viZniAI";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface JobRole {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string;
  seniority_level: "entry" | "mid" | "senior" | "lead" | "principal" | null;
  avg_salary_usd: number | null;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
}

export interface Course {
  id: string;
  title: string;
  url: string | null;
  provider: string | null;
  duration_hours: number | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
}

export interface SkillInsight {
  skill_id: string;
  trend_score: number | null;
  demand_level: "low" | "moderate" | "high" | "very_high" | "critical" | null;
  market_summary: string | null;
}

export type StepResourceProvider =
  | "coursera"
  | "udemy"
  | "youtube"
  | "edx"
  | "other";

export interface StepResource {
  provider: StepResourceProvider;
  title: string;
  url: string;
  free?: boolean;
}

export interface RoadmapStep {
  id: string;
  roadmap_id: string;
  profile_id: string;
  skill_id: string | null;
  course_id: string | null;
  step_order: number;
  title: string;
  description: string | null;
  duration_hours: number | null;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  completed_at: string | null;
  resources?: StepResource[];
  // Embedded join results
  skills?: { id: string; name: string } | null;
  courses?: {
    id: string;
    title: string;
    url: string | null;
    provider: string | null;
  } | null;
}

export interface Roadmap {
  id: string;
  profile_id: string;
  job_role_id: string;
  title: string;
  summary: string | null;
  estimated_weeks: number | null;
  status: "generating" | "active" | "completed" | "archived" | "failed";
  generation_params: Record<string, unknown>;
  created_at: string;
}

export interface RoadmapWithSteps extends Roadmap {
  steps: RoadmapStep[];
  job_roles?: { title: string; seniority_level: string | null } | null;
}

// ─── HTTP Helpers ──────────────────────────────────────────────────────────────

function buildHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  };
}

async function sbGet<T>(tablePath: string, query = ""): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${tablePath}${query ? `?${query}` : ""}`;
  const resp = await fetch(url, { headers: buildHeaders() });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`[supabase] GET ${tablePath} → ${resp.status}: ${body}`);
  }
  return resp.json() as Promise<T[]>;
}

async function sbPost<T>(
  tablePath: string,
  body: unknown,
  returnRepresentation = false
): Promise<T[]> {
  const prefer = returnRepresentation
    ? "return=representation"
    : "return=minimal";
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    method: "POST",
    headers: buildHeaders({ Prefer: prefer }),
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[supabase] POST ${tablePath} → ${resp.status}: ${text}`);
  }
  if (returnRepresentation) return resp.json() as Promise<T[]>;
  return [];
}

async function sbPatch<T>(
  tablePath: string,
  query: string,
  body: unknown
): Promise<T[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}?${query}`, {
    method: "PATCH",
    headers: buildHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[supabase] PATCH ${tablePath} → ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T[]>;
}

async function sbUpsert<T>(
  tablePath: string,
  body: unknown,
  onConflict: string
): Promise<T[]> {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/${tablePath}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: buildHeaders({
        Prefer: "return=representation,resolution=merge-duplicates",
      }),
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`[supabase] UPSERT ${tablePath} → ${resp.status}: ${text}`);
  }
  return resp.json() as Promise<T[]>;
}

// ─── Read Functions ─────────────────────────────────────────────────────────────

/** All active job roles ordered alphabetically. */
export async function getJobRoles(): Promise<JobRole[]> {
  return sbGet<JobRole>(
    "job_roles",
    "is_active=eq.true&select=id,title,slug,description,category_id,seniority_level,avg_salary_usd&order=title.asc"
  );
}

/** All active skills ordered alphabetically. */
export async function getSkills(): Promise<Skill[]> {
  return sbGet<Skill>(
    "skills",
    "is_active=eq.true&select=id,name,slug,description,category_id&order=name.asc"
  );
}

/** AI market insight for a single skill (returns null if not found). */
export async function getSkillInsights(
  skillId: string
): Promise<SkillInsight | null> {
  const rows = await sbGet<SkillInsight>(
    "ai_skill_insights",
    `skill_id=eq.${encodeURIComponent(skillId)}&select=skill_id,trend_score,demand_level,market_summary`
  );
  return rows[0] ?? null;
}

/**
 * Returns the best matching courses (lowest difficulty first) that cover a given skill.
 * Uses PostgREST embedded resource join: course_skills → courses
 */
export async function getCoursesForSkill(skillId: string): Promise<Course[]> {
  type Row = { courses: Course };
  const rows = await sbGet<Row>(
    "course_skills",
    `skill_id=eq.${encodeURIComponent(skillId)}&select=courses(id,title,url,provider,duration_hours,difficulty)&limit=3`
  );
  return rows
    .map((r) => r.courses)
    .filter((c): c is Course => c != null && c.id != null);
}

/**
 * All skills that belong to a given category — used for gap analysis.
 */
export async function getSkillsByCategory(categoryId: string): Promise<Skill[]> {
  return sbGet<Skill>(
    "skills",
    `category_id=eq.${encodeURIComponent(categoryId)}&is_active=eq.true&select=id,name,slug,description,category_id&order=name.asc`
  );
}

// ─── Profile ID Bootstrap ───────────────────────────────────────────────────────

/**
 * Fetches the current user's profile ID by calling the existing Node backend.
 * This is needed because the mobile app uses the backend JWT (not Supabase auth),
 * so we cannot decode a Supabase user ID from the token.
 *
 * The backend's /api/user/profile endpoint returns the full profile object
 * including its UUID primary key, which we use as `profile_id` for all
 * direct Supabase operations.
 */
export async function fetchProfileId(): Promise<string | null> {
  try {
    const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
    const token = await getMobileAccessToken();
    const resp = await fetch(`${baseUrl}/api/user/profile`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token ?? ""}`,
      },
    });
    if (!resp.ok) return null;
    const payload = (await resp.json()) as Record<string, unknown>;
    // Navigate response envelope: { data: { profile: { id: "..." } } }
    const envelope = (payload?.data ?? payload) as Record<string, unknown>;
    const profile = (envelope?.profile ?? envelope) as Record<string, unknown>;
    const id = profile?.id;
    return typeof id === "string" && id.length > 0 ? id : null;
  } catch (err) {
    if (__DEV__) console.warn("[supabase] fetchProfileId failed:", err);
    return null;
  }
}

// ─── Profile Operations ─────────────────────────────────────────────────────────

/**
 * Updates the profile record after onboarding is complete.
 */
export async function updateProfile(
  profileId: string,
  data: {
    full_name?: string;
    education_level?: string;
    years_experience?: number;
    onboarding_complete?: boolean;
  }
): Promise<void> {
  await sbPatch("profiles", `id=eq.${encodeURIComponent(profileId)}`, data);
}

// ─── User Skills ────────────────────────────────────────────────────────────────

/**
 * Upserts (insert or update) user skill rows.
 * Safe to call multiple times — conflict on (profile_id, skill_id).
 */
export async function upsertUserSkills(
  profileId: string,
  skills: Array<{ skill_id: string; proficiency_level: string }>
): Promise<void> {
  if (skills.length === 0) return;
  const rows = skills.map((s) => ({
    profile_id: profileId,
    skill_id: s.skill_id,
    proficiency_level: s.proficiency_level,
    self_assessed: true,
  }));
  await sbUpsert("user_skills", rows, "profile_id,skill_id");
}

// ─── Roadmap ────────────────────────────────────────────────────────────────────

/**
 * Creates an ai_roadmaps row and returns its UUID.
 * `generation_params` stores extra step metadata (is_critical, why_needed)
 * that doesn't have dedicated columns in the steps table.
 */
export async function createRoadmap(data: {
  profile_id: string;
  job_role_id: string;
  title: string;
  summary: string;
  estimated_weeks: number;
  generation_params?: Record<string, unknown>;
}): Promise<string> {
  const rows = await sbPost<Roadmap>(
    "ai_roadmaps",
    {
      ...data,
      status: "active",
      ai_model: "qwen2:7b",
      generation_params: data.generation_params ?? {},
    },
    true
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("createRoadmap: Supabase returned no ID");
  return id;
}

/**
 * Batch-inserts all ai_roadmap_steps for a newly created roadmap.
 * The first step gets status='available', the rest stay 'locked'.
 */
export async function createRoadmapSteps(
  steps: Array<{
    roadmap_id: string;
    profile_id: string;
    skill_id?: string | null;
    course_id?: string | null;
    step_order: number;
    title: string;
    description?: string;
    duration_hours?: number | null;
    status: "locked" | "available";
  }>
): Promise<void> {
  if (steps.length === 0) return;
  await sbPost("ai_roadmap_steps", steps);
}

/**
 * Fetches the most recent active/completed roadmap for a user with all
 * steps, skill names, and course info embedded using PostgREST joins.
 */
export async function getRoadmapWithSteps(
  profileId: string
): Promise<RoadmapWithSteps | null> {
  const rows = await sbGet<
    Roadmap & {
      ai_roadmap_steps: RoadmapStep[];
      job_roles: { title: string; seniority_level: string | null } | null;
    }
  >(
    "ai_roadmaps",
    [
      `profile_id=eq.${encodeURIComponent(profileId)}`,
      "status=in.(active,completed)",
      "select=*,ai_roadmap_steps(id,roadmap_id,profile_id,skill_id,course_id,step_order,title,description,duration_hours,status,completed_at,skills(id,name),courses(id,title,url,provider)),job_roles(title,seniority_level)",
      "order=created_at.desc",
      "limit=1",
    ].join("&")
  );

  const raw = rows[0];
  if (!raw) return null;

  const rawSteps = raw.ai_roadmap_steps ?? [];
  const steps = [...rawSteps]
    .sort((a, b) => a.step_order - b.step_order)
    .map((s) => ({
      ...s,
      resources: ensureStepResources(s),
    }));

  return {
    ...raw,
    steps,
    job_roles: raw.job_roles ?? null,
  };
}

/**
 * Returns a step's curated resources if the AI populated any, otherwise
 * synthesizes search-URL fallbacks across Coursera / Udemy / YouTube so the
 * UI always has something to show. Real curated links replace these once the
 * AI generator service is updated to populate `resources`.
 */
export function ensureStepResources(step: {
  title: string;
  resources?: StepResource[] | null;
  skills?: { name: string } | null;
  courses?: { title: string; url: string | null; provider: string | null } | null;
}): StepResource[] {
  const existing = Array.isArray(step.resources) ? step.resources : [];
  if (existing.length > 0) return existing;

  const query = encodeURIComponent(
    [step.title, step.skills?.name].filter(Boolean).join(" ").trim() || step.title
  );
  const fallbacks: StepResource[] = [
    {
      provider: "coursera",
      title: `Search Coursera for "${step.title}"`,
      url: `https://www.coursera.org/search?query=${query}`,
    },
    {
      provider: "udemy",
      title: `Search Udemy for "${step.title}"`,
      url: `https://www.udemy.com/courses/search/?q=${query}`,
    },
    {
      provider: "youtube",
      title: `Search YouTube for "${step.title}"`,
      url: `https://www.youtube.com/results?search_query=${query}`,
      free: true,
    },
  ];

  // If a legacy single course link exists, surface it too as "other".
  if (step.courses?.url && step.courses.title) {
    fallbacks.push({
      provider: (mapProvider(step.courses.provider) ?? "other") as StepResourceProvider,
      title: step.courses.title,
      url: step.courses.url,
    });
  }
  return fallbacks;
}

function mapProvider(p: string | null | undefined): StepResourceProvider | null {
  if (!p) return null;
  const s = p.toLowerCase();
  if (s.includes("coursera")) return "coursera";
  if (s.includes("udemy")) return "udemy";
  if (s.includes("youtube")) return "youtube";
  if (s.includes("edx")) return "edx";
  return "other";
}

/** Updates a single step's status (triggers DB-level auto-unlock of next step). */
export async function updateRoadmapStepStatus(
  stepId: string,
  status: RoadmapStep["status"]
): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (status === "completed") {
    body.completed_at = new Date().toISOString();
  }
  await sbPatch("ai_roadmap_steps", `id=eq.${encodeURIComponent(stepId)}`, body);
}

// ─── Chat Persistence ───────────────────────────────────────────────────────────

/** Creates a chat session record and returns its UUID. */
export async function saveChatSession(
  profileId: string,
  title: string
): Promise<string> {
  const rows = await sbPost<{ id: string }>(
    "chat_sessions",
    { profile_id: profileId, title, status: "active" },
    true
  );
  const id = rows[0]?.id;
  if (!id) throw new Error("saveChatSession: Supabase returned no ID");
  return id;
}

/** Inserts a single chat message into a session. */
export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await sbPost("chat_messages", { session_id: sessionId, role, content, metadata });
}

/** Fetches all messages for an active chat session, ordered by time. */
export async function getChatMessages(
  sessionId: string
): Promise<Array<{ id: string; role: string; content: string; created_at: string }>> {
  return sbGet(
    "chat_messages",
    `session_id=eq.${encodeURIComponent(sessionId)}&select=id,role,content,created_at&order=created_at.asc`
  );
}

/** Fetches the most recent active chat session for post-onboarding chat. */
export async function getLatestChatSession(
  profileId: string
): Promise<{ id: string; title: string | null } | null> {
  const rows = await sbGet<{ id: string; title: string | null }>(
    "chat_sessions",
    `profile_id=eq.${encodeURIComponent(profileId)}&status=eq.active&select=id,title&order=created_at.desc&limit=1`
  );
  return rows[0] ?? null;
}

// ─── Notifications ──────────────────────────────────────────────────────────────

/** Creates a notification for the user (e.g. "Your roadmap is ready!"). */
export async function createNotification(
  profileId: string,
  type: "reminder" | "achievement" | "system" | "roadmap_update",
  title: string,
  body: string
): Promise<void> {
  await sbPost("notifications", {
    profile_id: profileId,
    type,
    title,
    body,
    is_read: false,
  });
}
