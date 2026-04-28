// ─── Domain models ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  subscription_status?: string | null;
  plan_name?: string | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  provider: string | null;
  duration_hours: number | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  category_id: string | null;
  course_url: string | null;
  description: string | null;
  is_active: boolean;
}

export interface Skill {
  id: string;
  name: string;
  skill_type: string | null;
  category_id: string | null;
  description: string | null;
}

export interface JobRole {
  id: string;
  title: string;
  description: string | null;
  avg_salary: number | null;
  seniority_level: string | null;
  is_active: boolean;
}

export interface Roadmap {
  id: string;
  title: string;
  summary: string | null;
  estimated_weeks: number | null;
  status: "active" | "completed" | "generating" | null;
  progress_pct: number;
  total_steps: number;
  completed_steps: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  billing_period: string | null;
  max_roadmaps: number | null;
  description: string | null;
  slug: string | null;
  features: string[];
}

export interface Subscription {
  id: string;
  profile_id: string;
  plan_id: string;
  status: "active" | "trialing" | "cancelled" | "expired";
  created_at: string;
}

// ─── UI helpers ─────────────────────────────────────────────────────────────

export type ChangeType = "positive" | "negative" | "neutral";
export type Theme = "light" | "dark";
