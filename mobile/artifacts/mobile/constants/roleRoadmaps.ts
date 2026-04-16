import { IT_MARKET_ROLES, type ITMarketRole } from "@/constants/itMarketFeed";

export type RoleRoadmapStage = {
  id: string;
  title: string;
  duration: string;
  objective: string;
  skills: string[];
  outcomes: string[];
  deliverable: string;
};

export type RoleRoadmap = {
  id: string;
  role: string;
  definition: string;
  marketNote: string;
  totalDuration: string;
  stages: RoleRoadmapStage[];
  tools: string[];
  portfolioProjects: string[];
};

function pickSkills(skills: string[], start: number, size: number) {
  return skills.slice(start, start + size);
}

function roadmapStagesForRole(role: ITMarketRole): RoleRoadmapStage[] {
  const required = role.requiredSkills;
  const stage1Skills = pickSkills(required, 0, 3);
  const stage2Skills = pickSkills(required, 3, 3);
  const stage3Skills = pickSkills(required, 6, 2);

  return [
    {
      id: `${role.id}-foundation`,
      title: "Foundation Layer",
      duration: "Weeks 1-4",
      objective: `Build strong fundamentals required to start delivering as a ${role.role}.`,
      skills: stage1Skills,
      outcomes: [
        `Understand core concepts behind ${stage1Skills.join(", ")}.`,
        "Set up your personal workflow with version control and clean documentation.",
        "Ship small weekly exercises to validate consistency.",
      ],
      deliverable: `A foundational mini-project focused on ${stage1Skills[0] || "core skills"}.`,
    },
    {
      id: `${role.id}-core`,
      title: "Core Delivery",
      duration: "Weeks 5-8",
      objective: "Apply fundamentals to real feature-level implementation work.",
      skills: stage2Skills,
      outcomes: [
        "Build production-like feature slices with measurable quality.",
        "Introduce testing and debugging workflow into each iteration.",
        "Document architecture and trade-offs for each module.",
      ],
      deliverable: `A feature-focused project using ${stage2Skills.join(", ") || "role tools"}.`,
    },
    {
      id: `${role.id}-advanced`,
      title: "Advanced Execution",
      duration: "Weeks 9-12",
      objective: "Increase depth, reliability, and decision-making confidence.",
      skills: stage3Skills,
      outcomes: [
        "Handle edge cases, scalability concerns, and performance tuning.",
        "Apply quality gates and operational readiness checks.",
        "Start mentoring-level explanations of your technical choices.",
      ],
      deliverable: "An optimized module with performance and quality reports.",
    },
    {
      id: `${role.id}-portfolio`,
      title: "Portfolio & Interview Track",
      duration: "Weeks 13-16",
      objective: "Package your work into interview-ready and portfolio-ready assets.",
      skills: required,
      outcomes: [
        "Assemble a complete case study with architecture decisions.",
        "Prepare role-specific interview answers with practical examples.",
        "Publish project README, demo material, and technical breakdown.",
      ],
      deliverable: `A complete ${role.role} capstone project with public documentation.`,
    },
  ];
}

function toolsForRole(role: ITMarketRole) {
  return [
    ...role.requiredSkills,
    "Git",
    "Issue Tracking",
    "Code Review",
    "Testing Framework",
    "CI Workflow",
  ];
}

function projectsForRole(role: ITMarketRole) {
  return [
    `${role.role} Project 1: Build a practical production-style module from scratch.`,
    `${role.role} Project 2: Build an end-to-end solution with tests and documentation.`,
    `${role.role} Project 3: Build an optimized capstone with measurable impact metrics.`,
  ];
}

export function buildRoleRoadmap(role: ITMarketRole): RoleRoadmap {
  return {
    id: role.id,
    role: role.role,
    definition: role.definition,
    marketNote: role.marketNote,
    totalDuration: "16 weeks",
    stages: roadmapStagesForRole(role),
    tools: toolsForRole(role),
    portfolioProjects: projectsForRole(role),
  };
}

export const ROLE_ROADMAP_INDEX: RoleRoadmap[] = IT_MARKET_ROLES.map(buildRoleRoadmap);

export function getRoleRoadmapById(roleId: string | null | undefined) {
  const normalized = String(roleId || "").trim().toLowerCase();
  if (!normalized) return null;

  return ROLE_ROADMAP_INDEX.find((item) => item.id.toLowerCase() === normalized) || null;
}

export function getRoleRoadmapByTitle(roleTitle: string | null | undefined) {
  const normalized = String(roleTitle || "").trim().toLowerCase();
  if (!normalized) return null;

  return ROLE_ROADMAP_INDEX.find((item) => item.role.toLowerCase() === normalized) || null;
}
