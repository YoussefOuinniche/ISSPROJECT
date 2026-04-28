import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AI_BASE_URL  = import.meta.env.VITE_AI_URL  || "http://localhost:8000";

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10_000,
});

// Response interceptor: unwrap { success: true, data: ... } envelope
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && body.success === true && "data" in body) {
      return body.data as any;
    }
    return body;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Request failed";
    return Promise.reject(new Error(message));
  }
);

// ─── Typed request helpers ────────────────────────────────────────────────────
// The interceptor strips the AxiosResponse wrapper at runtime.
// These helpers reflect that in the TypeScript types so callers
// get Promise<T> instead of Promise<AxiosResponse<T>>.

function get<T = any>(url: string, params?: Record<string, string | number>): Promise<T> {
  return apiClient.get(url, params ? { params } : undefined) as unknown as Promise<T>;
}

function post<T = any>(url: string, data: unknown): Promise<T> {
  return apiClient.post(url, data) as unknown as Promise<T>;
}

function put<T = any>(url: string, data: unknown): Promise<T> {
  return apiClient.put(url, data) as unknown as Promise<T>;
}

function del<T = any>(url: string): Promise<T> {
  return apiClient.delete(url) as unknown as Promise<T>;
}

// ─── Service methods ──────────────────────────────────────────────────────────

export const courseService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/courses", params),
  getById: (id: string) => get<any>(`/courses/${id}`),
  create: (data: unknown) => post<any>("/courses", data),
  update: (id: string, data: unknown) => put<any>(`/courses/${id}`, data),
  delete: (id: string) => del(`/courses/${id}`),
  search: (q: string) => get<any[]>("/courses", { search: q }),
};

export const skillService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/skills", params),
  getById: (id: string) => get<any>(`/skills/${id}`),
  create: (data: unknown) => post<any>("/skills", data),
  update: (id: string, data: unknown) => put<any>(`/skills/${id}`, data),
  delete: (id: string) => del(`/skills/${id}`),
  getTrending: () => get<any[]>("/skills/trending"),
};

export const categoryService = {
  getAll: () => get<any[]>("/categories"),
  getById: (id: string) => get<any>(`/categories/${id}`),
  create: (data: unknown) => post<any>("/categories", data),
  update: (id: string, data: unknown) => put<any>(`/categories/${id}`, data),
  delete: (id: string) => del(`/categories/${id}`),
};

export const planService = {
  getAll: () => get<any[]>("/plans"),
  getById: (id: string) => get<any>(`/plans/${id}`),
  create: (data: unknown) => post<any>("/plans", data),
  update: (id: string, data: unknown) => put<any>(`/plans/${id}`, data),
  delete: (id: string) => del(`/plans/${id}`),
};

export const jobRoleService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/job-roles", params),
  getById: (id: string) => get<any>(`/job-roles/${id}`),
  create: (data: unknown) => post<any>("/job-roles", data),
  update: (id: string, data: unknown) => put<any>(`/job-roles/${id}`, data),
  delete: (id: string) => del(`/job-roles/${id}`),
};

export const roadmapService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/roadmaps", params),
  getById: (id: string) => get<any>(`/roadmaps/${id}`),
  create: (data: unknown) => post<any>("/roadmaps", data),
  update: (id: string, data: unknown) => put<any>(`/roadmaps/${id}`, data),
  updateStatus: (id: string, status: string) => put<any>(`/roadmaps/${id}/status`, { status }),
  updateStep: (stepId: string, data: { status: string; completed_at?: string | null }) =>
    put<any>(`/roadmaps/steps/${stepId}`, data),
  delete: (id: string) => del(`/roadmaps/${id}`),
};

export const subscriptionService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/subscriptions", params),
  getById: (id: string) => get<any>(`/subscriptions/${id}`),
  create: (data: unknown) => post<any>("/subscriptions", data),
  update: (id: string, data: unknown) => put<any>(`/subscriptions/${id}`, data),
  cancel: (id: string) => put<any>(`/subscriptions/${id}/cancel`, {}),
};

export const progressService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/progress", params),
  getById: (id: string) => get<any>(`/progress/${id}`),
  create: (data: unknown) => post<any>("/progress", data),
  update: (id: string, data: unknown) => put<any>(`/progress/${id}`, data),
};

export const userService = {
  getAll: (params?: Record<string, string | number>) => get<any[]>("/users", params),
  getById: (id: string) => get<any>(`/users/${id}`),
  create: (data: unknown) => post<any>("/users", data),
  update: (id: string, data: unknown) => put<any>(`/users/${id}`, data),
  delete: (id: string) => del(`/users/${id}`),
};

export const adminService = {
  login: (email: string, password: string) =>
    post<any>("/admin/login", { email, password }),
  getStats: () => get<any>("/admin/stats"),
};

// ─── AI service (FastAPI on port 8000) ───────────────────────────────────────

export const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

aiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "AI request failed";
    return Promise.reject(new Error(message));
  }
);

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatResponse {
  response: string;
  message_id?: string | null;
  conversation_summary?: {
    skills_mentioned: string[];
    goals_mentioned: string[];
  };
}

export interface AIRoadmapStage {
  title: string;
  items: string[];
  projects: string[];
}

export interface AIRoadmapResponse {
  role: string;
  stages: AIRoadmapStage[];
  tools: string[];
  final_projects: string[];
  visualization: {
    type: string;
    title: string;
    data: { label: string; value: number; items: string[]; color: string }[];
    stages: { title: string; items: string[] }[];
  };
}

export interface AISkillGapResponse {
  role: string;
  missing_skills: { name: string; priority: string; target_level: string; why_it_matters: string }[];
  partial_gaps: { name: string; current_level: string; target_level: string; gap_description: string }[];
  strengths: { name: string; level: string; why_it_helps: string }[];
  recommendations: { title: string; description: string; priority: string; resources: string[] }[];
  meta: { total_requirements: number; fully_met: number; partially_met: number; missing: number };
}

export const aiChatService = {
  chat: (userId: string, message: string, recentMessages: ChatMessage[] = [], profile: Record<string, unknown> = {}) =>
    aiClient.post<AIChatResponse>("/ai/chat", {
      user_id: userId,
      message,
      recent_messages: recentMessages.map((m) => ({ role: m.role, content: m.content })),
      profile,
      skill_catalog: [],
    }) as unknown as Promise<AIChatResponse>,
};

export const aiRoadmapService = {
  generate: (role: string, userProfile: Record<string, unknown> = {}) =>
    aiClient.post<AIRoadmapResponse>("/ai/generate-roadmap", {
      role,
      user_profile: userProfile,
    }) as unknown as Promise<AIRoadmapResponse>,
};

export const aiSkillGapService = {
  analyze: (role: string, userProfile: Record<string, unknown> = {}) =>
    aiClient.post<AISkillGapResponse>("/ai/skill-gap", {
      role,
      user_profile: userProfile,
    }) as unknown as Promise<AISkillGapResponse>,
};
