import {
  getMobileAccessToken,
  getMobileApiBaseUrl,
  resetStoredMobileAccessToken,
} from "@/lib/api/runtime";

export interface AIProfileSkill {
  name: string;
  level: string;
  skill_name: string;
  proficiency_level: string;
}

export interface AIProfileGap {
  id?: string | null;
  skill_name: string;
  domain: string;
  gap_level: number;
  reason: string;
  importance: string;
}

export interface AIProfileRecommendation {
  id?: string | null;
  title: string;
  content: string;
  type: string;
  priority: string;
}

export interface AISkillGapStrength {
  skill: string;
  current_level: string;
  target_level: string;
  why_it_matters: string;
  category: string;
}

export interface AISkillGapAnalysisItem {
  skill: string;
  current_level: string | null;
  target_level: string;
  priority: string;
  gap_severity: string;
  why_it_matters: string;
  category: string;
}

export interface AISkillGapAnalysisRecommendation {
  title: string;
  priority: string;
  action: string;
  reason: string;
}

export interface AISkillGapAnalysis {
  target_role: string | null;
  strengths: AISkillGapStrength[];
  missing_skills: AISkillGapAnalysisItem[];
  partial_gaps: AISkillGapAnalysisItem[];
  recommendations: AISkillGapAnalysisRecommendation[];
  meta: {
    matched_role_key: string | null;
    current_skill_count: number;
    explicit_skill_count: number;
    ai_skill_count: number;
    source: string;
  };
}

export interface AIProfileSummary {
  top_skills: string[];
  top_goal: string | null;
  target_role: string | null;
  strengths: string[];
  urgent_gaps: string[];
  next_step: string | null;
  market_summary?: string | null;
  recommended_next_step?: string | null;
  high_priority_skills?: string[];
  missing_skills?: string[];
  missing_market_skills?: string[];
  market_role?: string | null;
  market_stale?: boolean;
  market_updated_at?: string | null;
  market_short_summary?: Array<{ skill?: string; frequency?: number; category?: string }>;
  profile_completion_hint: string;
}

export interface ExplicitProfileSkill {
  name: string;
  level: string;
}

export interface ExplicitProfilePreferences {
  domain: string | null;
  stack: string | null;
}

export interface ExplicitProfileEnvelope {
  skills: ExplicitProfileSkill[];
  target_role: string | null;
  education: string | null;
  experience: string | null;
  preferences: ExplicitProfilePreferences;
}

export interface AIProfileEnvelope {
  skills: AIProfileSkill[];
  goals: string[];
  interests: string[];
  education: string[];
  experience_years: number | null;
  confidence: number;
  skill_gaps: AIProfileGap[];
  recommendations: AIProfileRecommendation[];
  skill_gap_analysis: AISkillGapAnalysis;
  target_role?: string | null;
  preferences?: ExplicitProfilePreferences;
  learning_roadmap?: AIProfileLearningRoadmap | null;
}

export interface AIRoadmapStage {
  title: string;
  items: string[];
  projects: string[];
}

export interface AIRoadmapVisualizationDatum {
  label: string;
  value: number | null;
  items: string[];
  color: string | null;
}

export interface AIRoadmapVisualizationStage {
  title: string;
  items: string[];
}

export interface AIRoadmapVisualization {
  type: "roadmap" | "bar_chart" | "radar";
  title: string;
  data: AIRoadmapVisualizationDatum[];
  stages: AIRoadmapVisualizationStage[];
}

export interface AIProfileLearningRoadmap {
  role: string | null;
  stages: AIRoadmapStage[];
  tools: string[];
  final_projects: string[];
  visualization: AIRoadmapVisualization | null;
}

export interface AIProfileData extends Record<string, unknown> {
  user?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  explicit_profile: ExplicitProfileEnvelope;
  ai_profile: AIProfileEnvelope;
  ai_summary: AIProfileSummary;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    const text = asTrimmedString(item);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(text);
  }

  return normalized;
}

function normalizeConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;

  if (numeric > 1 && numeric <= 100) {
    return Number((numeric / 100).toFixed(4));
  }

  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return Number(numeric.toFixed(4));
}

function normalizeExperienceYears(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Number(numeric.toFixed(1));
}

function normalizeSkillLevel(value: unknown): string {
  const level = asTrimmedString(value).toLowerCase();
  if (["beginner", "intermediate", "advanced", "expert"].includes(level)) {
    return level;
  }
  return "intermediate";
}

function normalizeSkills(value: unknown): AIProfileSkill[] {
  if (!Array.isArray(value)) return [];

  const byName = new Map<string, AIProfileSkill>();
  const rank = ["beginner", "intermediate", "advanced", "expert"];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const name = asTrimmedString(record.name ?? record.skill_name);
    if (!name) continue;

    const level = normalizeSkillLevel(record.level ?? record.proficiency_level);
    const key = name.toLowerCase();
    const previous = byName.get(key);

    if (!previous || rank.indexOf(level) > rank.indexOf(previous.level)) {
      byName.set(key, {
        name,
        level,
        skill_name: name,
        proficiency_level: level,
      });
    }
  }

  return Array.from(byName.values());
}

function normalizeExplicitSkills(value: unknown): ExplicitProfileSkill[] {
  if (!Array.isArray(value)) return [];

  const byName = new Map<string, ExplicitProfileSkill>();
  const rank = ["beginner", "intermediate", "advanced"];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const name = asTrimmedString(record.name ?? record.skill_name);
    if (!name) continue;

    const level = asTrimmedString(record.level ?? record.proficiency_level).toLowerCase();
    const normalizedLevel = rank.includes(level) ? level : "intermediate";
    const key = name.toLowerCase();
    const previous = byName.get(key);

    if (!previous || rank.indexOf(normalizedLevel) > rank.indexOf(previous.level)) {
      byName.set(key, {
        name,
        level: normalizedLevel,
      });
    }
  }

  return Array.from(byName.values());
}

function normalizeSkillGaps(value: unknown): AIProfileGap[] {
  if (!Array.isArray(value)) return [];

  const gaps: AIProfileGap[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    const skillName = asTrimmedString(record.skill_name ?? record.skill);
    if (!skillName) return;

    const gapLevel = Number(record.gap_level);
    const safeGapLevel = Number.isFinite(gapLevel)
      ? Math.max(1, Math.min(5, gapLevel))
      : 3;

    gaps.push({
      id: typeof record.id === "string" ? record.id : null,
      skill_name: skillName,
      domain: asTrimmedString(record.domain) || "General",
      gap_level: safeGapLevel,
      reason: asTrimmedString(record.reason),
      importance:
        asTrimmedString(record.importance) ||
        (safeGapLevel >= 4 ? "high" : safeGapLevel >= 3 ? "medium" : "low"),
    });
  });

  return gaps;
}

function normalizeRecommendations(value: unknown): AIProfileRecommendation[] {
  if (!Array.isArray(value)) return [];

  const recommendations: AIProfileRecommendation[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const record = item as Record<string, unknown>;
    const title = asTrimmedString(record.title);
    const content = asTrimmedString(record.content);
    if (!title && !content) return;

    recommendations.push({
      id: typeof record.id === "string" ? record.id : null,
      title: title || content,
      content,
      type: asTrimmedString(record.type) || "career",
      priority: asTrimmedString(record.priority) || "medium",
    });
  });

  return recommendations;
}

function normalizeStructuredStrengths(value: unknown): AISkillGapStrength[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const skill = asTrimmedString(record.skill ?? record.skill_name);
      if (!skill) return null;

      return {
        skill,
        current_level: normalizeSkillLevel(record.current_level ?? record.currentLevel ?? record.level),
        target_level: normalizeSkillLevel(record.target_level ?? record.targetLevel ?? "intermediate"),
        why_it_matters: asTrimmedString(record.why_it_matters ?? record.reason),
        category: asTrimmedString(record.category) || "General",
      };
    })
    .filter((item): item is AISkillGapStrength => Boolean(item));
}

function normalizeStructuredGapItems(value: unknown): AISkillGapAnalysisItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const skill = asTrimmedString(record.skill ?? record.skill_name);
      if (!skill) return null;

      return {
        skill,
        current_level:
          record.current_level !== undefined || record.currentLevel !== undefined
            ? normalizeSkillLevel(record.current_level ?? record.currentLevel)
            : null,
        target_level: normalizeSkillLevel(record.target_level ?? record.targetLevel ?? "intermediate"),
        priority: asTrimmedString(record.priority ?? record.importance) || "medium",
        gap_severity: asTrimmedString(record.gap_severity ?? record.gapSeverity) || "moderate",
        why_it_matters: asTrimmedString(record.why_it_matters ?? record.reason),
        category: asTrimmedString(record.category) || "General",
      };
    })
    .filter((item): item is AISkillGapAnalysisItem => Boolean(item));
}

function normalizeStructuredRecommendations(value: unknown): AISkillGapAnalysisRecommendation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = asTrimmedString(record.title);
      const action = asTrimmedString(record.action ?? record.content);
      const reason = asTrimmedString(record.reason);
      if (!title && !action) return null;

      return {
        title: title || action,
        priority: asTrimmedString(record.priority) || "medium",
        action,
        reason,
      };
    })
    .filter((item): item is AISkillGapAnalysisRecommendation => Boolean(item));
}

function defaultSkillGapAnalysis(): AISkillGapAnalysis {
  return {
    target_role: null,
    strengths: [],
    missing_skills: [],
    partial_gaps: [],
    recommendations: [],
    meta: {
      matched_role_key: null,
      current_skill_count: 0,
      explicit_skill_count: 0,
      ai_skill_count: 0,
      source: "role_taxonomy",
    },
  };
}

function normalizeSkillGapAnalysis(value: unknown): AISkillGapAnalysis {
  if (!value || typeof value !== "object") {
    return defaultSkillGapAnalysis();
  }

  const record = value as Record<string, unknown>;
  const meta =
    record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : {};

  return {
    target_role: asTrimmedString(record.target_role) || null,
    strengths: normalizeStructuredStrengths(record.strengths),
    missing_skills: normalizeStructuredGapItems(record.missing_skills),
    partial_gaps: normalizeStructuredGapItems(record.partial_gaps),
    recommendations: normalizeStructuredRecommendations(record.recommendations),
    meta: {
      matched_role_key: asTrimmedString(meta.matched_role_key) || null,
      current_skill_count: Number.isFinite(Number(meta.current_skill_count))
        ? Number(meta.current_skill_count)
        : 0,
      explicit_skill_count: Number.isFinite(Number(meta.explicit_skill_count))
        ? Number(meta.explicit_skill_count)
        : 0,
      ai_skill_count: Number.isFinite(Number(meta.ai_skill_count))
        ? Number(meta.ai_skill_count)
        : 0,
      source: asTrimmedString(meta.source) || "role_taxonomy",
    },
  };
}

function defaultSummary(): AIProfileSummary {
  return {
    top_skills: [],
    top_goal: null,
    target_role: null,
    strengths: [],
    urgent_gaps: [],
    next_step: null,
    market_summary: null,
    recommended_next_step: null,
    high_priority_skills: [],
    missing_skills: [],
    missing_market_skills: [],
    market_role: null,
    market_stale: true,
    market_updated_at: null,
    market_short_summary: [],
    profile_completion_hint:
      "Tell the AI assistant more about your projects and experience to deepen the profile.",
  };
}

function normalizeRoadmapStageList(value: unknown): AIRoadmapStage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = asTrimmedString(record.title);
      if (!title) return null;

      return {
        title,
        items: normalizeStringArray(record.items ?? record.skills ?? record.tasks),
        projects: normalizeStringArray(record.projects ?? record.resources),
      };
    })
    .filter((item): item is AIRoadmapStage => Boolean(item));
}

function normalizeRoadmapVisualization(
  value: unknown,
  fallbackRole: string | null,
  fallbackStages: AIRoadmapStage[]
): AIRoadmapVisualization | null {
  if (!value || typeof value !== "object") {
    if (fallbackStages.length === 0) return null;
    return {
      type: "roadmap",
      title: `${fallbackRole || "Role"} roadmap`,
      data: fallbackStages.map((stage) => ({
        label: stage.title,
        value: stage.items.length,
        items: stage.items.slice(0, 4),
        color: null,
      })),
      stages: fallbackStages.map((stage) => ({
        title: stage.title,
        items: stage.items,
      })),
    };
  }

  const record = value as Record<string, unknown>;
  const type = asTrimmedString(record.type) as AIRoadmapVisualization["type"];
  const safeType = ["roadmap", "bar_chart", "radar"].includes(type) ? type : "roadmap";
  const stages = Array.isArray(record.stages)
    ? record.stages
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const title = asTrimmedString(row.title);
          if (!title) return null;
          return {
            title,
            items: normalizeStringArray(row.items),
          };
        })
        .filter((item): item is AIRoadmapVisualizationStage => Boolean(item))
    : fallbackStages.map((stage) => ({
        title: stage.title,
        items: stage.items,
      }));

  return {
    type: safeType,
    title: asTrimmedString(record.title) || `${fallbackRole || "Role"} roadmap`,
    data: Array.isArray(record.data)
      ? record.data
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const label = asTrimmedString(row.label ?? row.title);
            if (!label) return null;
            const numericValue = Number(row.value);
            return {
              label,
              value: Number.isFinite(numericValue) ? numericValue : null,
              items: normalizeStringArray(row.items),
              color: asTrimmedString(row.color) || null,
            };
          })
          .filter((item): item is AIRoadmapVisualizationDatum => Boolean(item))
      : [],
    stages,
  };
}

function normalizeLearningRoadmap(value: unknown): AIProfileLearningRoadmap | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;

  const role = asTrimmedString(nested.role ?? nested.roadmap_title) || null;
  const stages = normalizeRoadmapStageList(nested.stages ?? nested.phases);
  const tools = normalizeStringArray(nested.tools);
  const finalProjects = normalizeStringArray(nested.final_projects ?? nested.milestones);

  if (!role && stages.length === 0 && tools.length === 0 && finalProjects.length === 0) {
    return null;
  }

  return {
    role,
    stages,
    tools,
    final_projects: finalProjects,
    visualization: normalizeRoadmapVisualization(nested.visualization, role, stages),
  };
}

function normalizeEnvelope(payload: unknown): AIProfileData {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawAiProfile =
    record.ai_profile && typeof record.ai_profile === "object"
      ? (record.ai_profile as Record<string, unknown>)
      : {};
  const rawAiSummary =
    record.ai_summary && typeof record.ai_summary === "object"
      ? (record.ai_summary as Record<string, unknown>)
      : {};

  return {
    ...record,
    user:
      record.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>)
        : null,
    profile:
      record.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>)
        : null,
    ai_profile: {
      skills: normalizeSkills(rawAiProfile.skills),
      goals: normalizeStringArray(rawAiProfile.goals),
      interests: normalizeStringArray(rawAiProfile.interests),
      education: normalizeStringArray(rawAiProfile.education),
      experience_years: normalizeExperienceYears(rawAiProfile.experience_years),
      confidence: normalizeConfidence(rawAiProfile.confidence),
      skill_gaps: normalizeSkillGaps(rawAiProfile.skill_gaps),
      recommendations: normalizeRecommendations(rawAiProfile.recommendations),
      skill_gap_analysis: normalizeSkillGapAnalysis(rawAiProfile.skill_gap_analysis),
      target_role: asTrimmedString(rawAiProfile.target_role) || null,
      preferences: {
        domain:
          rawAiProfile.preferences && typeof rawAiProfile.preferences === "object"
            ? asTrimmedString((rawAiProfile.preferences as Record<string, unknown>).domain) || null
            : null,
        stack:
          rawAiProfile.preferences && typeof rawAiProfile.preferences === "object"
            ? asTrimmedString((rawAiProfile.preferences as Record<string, unknown>).stack) || null
            : null,
      },
      learning_roadmap: normalizeLearningRoadmap(rawAiProfile.learning_roadmap),
    },
    explicit_profile: {
      skills: normalizeExplicitSkills(record.explicit_profile && typeof record.explicit_profile === "object"
        ? (record.explicit_profile as Record<string, unknown>).skills
        : []),
      target_role:
        record.explicit_profile && typeof record.explicit_profile === "object"
          ? asTrimmedString((record.explicit_profile as Record<string, unknown>).target_role) || null
          : null,
      education:
        record.explicit_profile && typeof record.explicit_profile === "object"
          ? asTrimmedString((record.explicit_profile as Record<string, unknown>).education) || null
          : null,
      experience:
        record.explicit_profile && typeof record.explicit_profile === "object"
          ? asTrimmedString((record.explicit_profile as Record<string, unknown>).experience) || null
          : null,
      preferences: {
        domain:
          record.explicit_profile &&
          typeof record.explicit_profile === "object" &&
          (record.explicit_profile as Record<string, unknown>).preferences &&
          typeof (record.explicit_profile as Record<string, unknown>).preferences === "object"
            ? asTrimmedString(
                ((record.explicit_profile as Record<string, unknown>).preferences as Record<
                  string,
                  unknown
                >).domain
              ) || null
            : null,
        stack:
          record.explicit_profile &&
          typeof record.explicit_profile === "object" &&
          (record.explicit_profile as Record<string, unknown>).preferences &&
          typeof (record.explicit_profile as Record<string, unknown>).preferences === "object"
            ? asTrimmedString(
                ((record.explicit_profile as Record<string, unknown>).preferences as Record<
                  string,
                  unknown
                >).stack
              ) || null
            : null,
      },
    },
    ai_summary: {
      top_skills: normalizeStringArray(rawAiSummary.top_skills),
      top_goal: asTrimmedString(rawAiSummary.top_goal) || null,
      target_role: asTrimmedString(rawAiSummary.target_role) || null,
      strengths: normalizeStringArray(rawAiSummary.strengths),
      urgent_gaps: normalizeStringArray(rawAiSummary.urgent_gaps),
      next_step: asTrimmedString(rawAiSummary.next_step) || null,
      market_summary: asTrimmedString(rawAiSummary.market_summary) || null,
      recommended_next_step: asTrimmedString(rawAiSummary.recommended_next_step) || null,
      high_priority_skills: normalizeStringArray(rawAiSummary.high_priority_skills),
      missing_skills: normalizeStringArray(rawAiSummary.missing_skills),
      missing_market_skills: normalizeStringArray(
        rawAiSummary.missing_market_skills ?? rawAiSummary.missing_skills
      ),
      market_role: asTrimmedString(rawAiSummary.market_role) || null,
      market_stale: Boolean(rawAiSummary.market_stale),
      market_updated_at: asTrimmedString(rawAiSummary.market_updated_at) || null,
      market_short_summary: Array.isArray(rawAiSummary.market_short_summary)
        ? rawAiSummary.market_short_summary
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const row = item as Record<string, unknown>;
              const skill = asTrimmedString(row.skill);
              if (!skill) return null;
              return {
                skill,
                frequency: Number.isFinite(Number(row.frequency)) ? Number(row.frequency) : 0,
                category: asTrimmedString(row.category) || "tooling",
              };
            })
            .filter((item): item is { skill: string; frequency: number; category: string } => Boolean(item))
        : [],
      profile_completion_hint:
        asTrimmedString(rawAiSummary.profile_completion_hint) ||
        defaultSummary().profile_completion_hint,
    },
  };
}

export async function fetchAIProfile(): Promise<AIProfileData> {
  const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}/api/user/profile`;

  const attemptFetch = async () => {
    const token = await getMobileAccessToken();
    return fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  try {
    let response = await attemptFetch();
    let payload = await response.json().catch(() => null);

    if (response.status === 401) {
      // Stored session can become stale after backend restarts or JWT rotation.
      await resetStoredMobileAccessToken();
      response = await attemptFetch();
      payload = await response.json().catch(() => null);
    }

    if (!response.ok) {
      const payloadRecord =
        payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const message = asTrimmedString(payloadRecord.message);
      const errorDetail = asTrimmedString(payloadRecord.error);
      const metaError =
        payloadRecord.meta && typeof payloadRecord.meta === "object"
          ? asTrimmedString((payloadRecord.meta as Record<string, unknown>).error)
          : "";

      const detail = errorDetail || metaError;
      const composedMessage = [message || `Profile API error: ${response.status} ${response.statusText}`, detail]
        .filter(Boolean)
        .join(" - ");

      console.error("[profileApi] non-OK response", {
        status: response.status,
        statusText: response.statusText,
        payload,
      });

      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }

      throw new Error(composedMessage);
    }

    const envelope =
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data?: unknown }).data
        : payload;

    return normalizeEnvelope(envelope);
  } catch (error) {
    console.error("[profileApi] fetch failed", error);
    throw error;
  }
}
