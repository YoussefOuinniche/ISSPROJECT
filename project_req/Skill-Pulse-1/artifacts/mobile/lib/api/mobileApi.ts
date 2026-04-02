import { getMobileAccessToken, getMobileApiBaseUrl } from "@/lib/api/runtime";

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE";

type UserSkillPayload = {
  skillId: string;
  proficiencyLevel?: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
};

async function request<T>(method: ApiMethod, path: string, body?: unknown): Promise<T> {
  const token = await getMobileAccessToken();
  const baseUrl = getMobileApiBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
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
    throw new Error(message);
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

export type AiSkillGapResponse = Record<string, unknown>;
export type AiRoadmapResponse = Record<string, unknown>;
export type AiRecommendationsResponse = unknown;
export type AiCareerAdviceResponse = Record<string, unknown> | string;
export type AiJobDescriptionResponse = Record<string, unknown>;

export async function analyzeSkillGapsWithAi(payload: { targetRole?: string }) {
  return request<{ success: boolean; message?: string; data: AiSkillGapResponse }>(
    "POST",
    "/api/user/ai/skill-gaps/analyze",
    payload
  );
}

export async function generateRoadmapWithAi(payload: { targetRole?: string; timeframeMonths?: number }) {
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
