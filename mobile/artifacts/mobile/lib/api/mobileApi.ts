import {
  getMobileAccessToken,
  getMobileApiBaseUrl,
  resetStoredMobileAccessToken,
} from "@/lib/api/runtime";

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";
type RequestOptions = {
  signal?: AbortSignal;
};

let hasWarnedMissingRoleTrendsEndpoint = false;
let hasWarnedMissingPersonalizedEndpoint = false;

type UserSkillPayload = {
  skillId: string;
  proficiencyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
};

export type ExplicitProfileSkillPayload = {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
};

export type ExplicitProfileUpdatePayload = {
  skills: ExplicitProfileSkillPayload[];
  target_role: string;
  education: string;
  experience: string;
  preferences?: {
    domain?: string;
    stack?: string;
  };
};

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted|abort/i.test(error.message))
  );
}

async function request<T>(
  method: ApiMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
  const buildUrl = (requestPath: string) => `${baseUrl}${requestPath}`;

  const performRequest = async (requestPath: string) => {
    const token = await getMobileAccessToken();
    const url = buildUrl(requestPath);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: options.signal,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error("[mobileApi] Network request failed", {
        method,
        url,
        hasToken: Boolean(token),
        message,
      });
      throw new Error(
        `Network request failed for ${method} ${url}. Make sure backend is running and reachable from your device.`
      );
    }

    const payload = await response.json().catch(() => null);
    return {
      response,
      payload,
      url,
    };
  };

  let { response, payload, url } = await performRequest(path);

  if (response.status === 401 && !options.signal?.aborted) {
    await resetStoredMobileAccessToken();
    ({ response, payload, url } = await performRequest(path));
  }

  if (!response.ok) {
    console.error("[mobileApi] Request failed", {
      method,
      url,
      status: response.status,
      payload,
    });
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Request failed (${response.status})`;
    const error = new Error(message) as Error & { status?: number; path?: string };
    error.status = response.status;
    error.path = path;
    throw error;
  }

  return payload as T;
}

export async function getSkillCatalog() {
  const response = await request<{ success: boolean; data: Record<string, unknown>[] }>(
    "GET",
    "/api/skills?limit=200"
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function getUserSkills() {
  const response = await request<{ success: boolean; data: Record<string, unknown>[] }>(
    "GET",
    "/api/user/skills"
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function addUserSkill(payload: UserSkillPayload) {
  return request<{ success: boolean; data: Record<string, unknown> }>("POST", "/api/user/skills", payload);
}

export async function updateUserSkill(skillId: string, payload: Omit<UserSkillPayload, "skillId">) {
  return request<{ success: boolean; data: Record<string, unknown> }>(
    "PUT",
    `/api/user/skills/${skillId}`,
    payload
  );
}

export async function deleteUserSkill(skillId: string) {
  return request<{ success: boolean; message?: string }>("DELETE", `/api/user/skills/${skillId}`);
}

export async function getTrends() {
  const response = await request<{ success: boolean; data: Record<string, unknown>[] }>(
    "GET",
    "/api/trends?limit=100"
  );
  return Array.isArray(response.data) ? response.data : [];
}

export type MarketTrendRow = {
  role?: string | null;
  skill: string;
  frequency: number;
  category: string;
  source_count?: number;
  updated_at?: string | null;
};

export type RoleMarketTrendsResponse = {
  success: boolean;
  role: string | null;
  count: number;
  stale: boolean;
  stale_after_hours?: number;
  latest_updated_at?: string | null;
  background_refresh_triggered?: boolean;
  trends: MarketTrendRow[];
  summary?: Array<{ skill: string; frequency: number; category: string }>;
};

export type PersonalizedMarketInsights = {
  role: string | null;
  stale: boolean;
  latest_updated_at?: string | null;
  missing_skills: Array<{
    skill: string;
    category: string;
    frequency: number;
    demand_score: number;
    status: string;
    user_level?: string | null;
  }>;
  high_priority_skills: Array<{
    skill: string;
    category: string;
    frequency: number;
    demand_score: number;
    status: string;
    user_level?: string | null;
  }>;
  market_summary?: string | null;
  recommended_next_step?: string | null;
  missing_skill_names?: string[];
  high_priority_skill_names?: string[];
};

export async function getRoleMarketTrends(options?: {
  role?: string | null;
  limit?: number;
  refreshIfStale?: boolean;
}) {
  const requestedRole = String(options?.role || "").trim();
  const safeLimit = Number.isFinite(Number(options?.limit)) ? Number(options?.limit) : 50;
  const refreshIfStale = options?.refreshIfStale !== false;

  const path = requestedRole
    ? `/api/user/market-trends/role/${encodeURIComponent(requestedRole)}?limit=${safeLimit}&refreshIfStale=${
        refreshIfStale ? "1" : "0"
      }`
    : `/api/user/market-trends/role?limit=${safeLimit}&refreshIfStale=${refreshIfStale ? "1" : "0"}`;

  try {
    const response = await request<{ success: boolean; data: RoleMarketTrendsResponse }>("GET", path);
    return response.data;
  } catch (error) {
    const runtimeError = error as Error & { status?: number; path?: string };
    if (runtimeError.status === 404) {
      if (!hasWarnedMissingRoleTrendsEndpoint) {
        hasWarnedMissingRoleTrendsEndpoint = true;
        console.warn("[mobileApi] role market trends endpoint unavailable; using empty fallback", {
          path,
        });
      }
      return {
        success: true,
        role: requestedRole || null,
        count: 0,
        stale: true,
        latest_updated_at: null,
        background_refresh_triggered: false,
        trends: [],
        summary: [],
      } as RoleMarketTrendsResponse;
    }
    throw error;
  }
}

export async function getGlobalMarketTrends(options?: { limit?: number }) {
  const safeLimit = Number.isFinite(Number(options?.limit)) ? Number(options?.limit) : 50;
  const response = await request<{ success: boolean; data: { trends: MarketTrendRow[]; stale?: boolean } }>(
    "GET",
    `/api/user/market-trends/global?limit=${safeLimit}`
  );
  return response.data;
}

export async function getPersonalizedMarketInsights(options?: {
  role?: string | null;
  limit?: number;
  refreshIfStale?: boolean;
}) {
  const requestedRole = String(options?.role || "").trim();
  const safeLimit = Number.isFinite(Number(options?.limit)) ? Number(options?.limit) : 80;
  const refreshIfStale = options?.refreshIfStale !== false;

  const query = [
    `limit=${safeLimit}`,
    `refreshIfStale=${refreshIfStale ? "1" : "0"}`,
    ...(requestedRole ? [`role=${encodeURIComponent(requestedRole)}`] : []),
  ].join("&");

  try {
    const response = await request<{ success: boolean; data: PersonalizedMarketInsights }>(
      "GET",
      `/api/user/market-trends/personalized?${query}`
    );

    return response.data;
  } catch (error) {
    const runtimeError = error as Error & { status?: number; path?: string };
    if (runtimeError.status === 404) {
      if (!hasWarnedMissingPersonalizedEndpoint) {
        hasWarnedMissingPersonalizedEndpoint = true;
        console.warn("[mobileApi] personalized market endpoint unavailable; using empty fallback", {
          query,
        });
      }
      return {
        role: requestedRole || null,
        stale: true,
        latest_updated_at: null,
        missing_skills: [],
        high_priority_skills: [],
        missing_skill_names: [],
        high_priority_skill_names: [],
        market_summary: null,
        recommended_next_step: null,
      } as PersonalizedMarketInsights;
    }
    throw error;
  }
}

export async function refreshRoleMarketTrends(payload?: { role?: string; searchLimit?: number }) {
  return request<{ success: boolean; data: Record<string, unknown> }>(
    "POST",
    "/api/user/market-trends/refresh",
    payload || {}
  );
}

export async function updateCurrentUserAccount(payload: {
  full_name?: string;
  email?: string;
}) {
  return request<{ success: boolean; data: Record<string, unknown> }>(
    "PUT",
    "/api/user/update",
    payload
  );
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return request<{ success: boolean; message?: string }>("POST", "/api/auth/change-password", payload);
}

export async function updateExplicitUserProfile(payload: ExplicitProfileUpdatePayload) {
  return request<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("POST", "/api/user/profile/update", payload);
}

export type AiSkillGapResponse = Record<string, unknown>;
export type AiRoadmapResponse = Record<string, unknown>;
export type AiRecommendationsResponse = unknown;
export type AiCareerAdviceResponse = Record<string, unknown> | string;
export type AiJobDescriptionResponse = Record<string, unknown>;
export type AiRoleSnapshotResponse = Record<string, unknown>;

export async function analyzeSkillGapsWithAi(payload: { targetRole?: string }) {
  return request<{ success: boolean; message?: string; data: AiSkillGapResponse }>(
    "POST",
    "/api/user/ai/skill-gaps/analyze",
    payload
  );
}

export async function generateRoadmapWithAi(payload: { role?: string; targetRole?: string; timeframeMonths?: number }) {
  return request<{ success: boolean; message?: string; data: AiRoadmapResponse }>(
    "POST",
    "/api/user/ai/roadmap",
    payload
  );
}

export async function generateRecommendationsWithAi(payload: { count?: number }) {
  return request<{ success: boolean; message?: string; data: AiRecommendationsResponse }>(
    "POST",
    "/api/user/ai/recommendations/generate",
    payload
  );
}

export async function getCareerAdviceWithAi(payload: { question: string }) {
  return request<{ success: boolean; message?: string; data: AiCareerAdviceResponse }>(
    "POST",
    "/api/user/ai/career-advice",
    payload
  );
}

export async function generateJobDescriptionWithAi(payload: { role: string; perSourceLimit?: number }) {
  return request<{ success: boolean; message?: string; data: AiJobDescriptionResponse }>(
    "POST",
    "/api/user/ai/job-description",
    payload
  );
}

export async function fetchAiRoleSnapshotEnvelope(
  payload: { role: string; countries: string[] },
  options?: RequestOptions
) {
  return request<{
    success: boolean;
    message?: string;
    data: AiRoleSnapshotResponse;
    meta?: Record<string, unknown>;
  }>("POST", "/api/user/ai/role-snapshot", payload, options);
}
