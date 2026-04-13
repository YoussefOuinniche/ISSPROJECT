import Colors from "@/constants/colors";

export type RoadmapRoleOption = {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
};

export const ROADMAP_ROLE_OPTIONS: RoadmapRoleOption[] = [
  {
    id: "frontend-engineer",
    title: "Frontend Engineer",
    description: "Build polished web interfaces, component systems, and accessible product experiences.",
    icon: "layout",
    gradient: ["#0EA5E9", "#2563EB"],
  },
  {
    id: "backend-engineer",
    title: "Backend Engineer",
    description: "Design APIs, data models, and service logic that can scale reliably in production.",
    icon: "server",
    gradient: ["#0F766E", "#14B8A6"],
  },
  {
    id: "full-stack-engineer",
    title: "Full Stack Engineer",
    description: "Own product features end to end across UI, APIs, data, and deployment.",
    icon: "layers",
    gradient: ["#4F46E5", "#7C3AED"],
  },
  {
    id: "mobile-engineer",
    title: "Mobile Engineer",
    description: "Ship fast, resilient mobile experiences with strong API integration and performance.",
    icon: "smartphone",
    gradient: ["#2563EB", "#06B6D4"],
  },
  {
    id: "ai-engineer",
    title: "AI Engineer",
    description: "Build AI product features with LLM workflows, evaluation, APIs, and production guardrails.",
    icon: "cpu",
    gradient: ["#7C3AED", "#EC4899"],
  },
  {
    id: "machine-learning-engineer",
    title: "Machine Learning Engineer",
    description: "Turn models into production systems with pipelines, deployment, and evaluation.",
    icon: "activity",
    gradient: ["#7C3AED", "#2563EB"],
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    description: "Automate delivery, infrastructure, and observability across cloud environments.",
    icon: "cloud-lightning",
    gradient: ["#F59E0B", "#EF4444"],
  },
  {
    id: "cloud-engineer",
    title: "Cloud Engineer",
    description: "Build and secure cloud infrastructure with strong networking and automation fundamentals.",
    icon: "cloud",
    gradient: ["#0284C7", "#38BDF8"],
  },
  {
    id: "data-engineer",
    title: "Data Engineer",
    description: "Create pipelines, warehouses, and reliable data foundations for analytics and ML.",
    icon: "database",
    gradient: ["#0F766E", "#10B981"],
  },
  {
    id: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    description: "Detect threats, respond to incidents, and strengthen cloud and identity security posture.",
    icon: "shield",
    gradient: ["#DC2626", "#F97316"],
  },
];

export const ROADMAP_ROLE_LOOKUP = Object.fromEntries(
  ROADMAP_ROLE_OPTIONS.map((role) => [role.id, role])
) as Record<string, RoadmapRoleOption>;

export const ROADMAP_DEFAULT_GRADIENT = Colors.gradientPrimary;
