import { z } from "zod";

import { fetchAiRoleSnapshotEnvelope } from "@/lib/api/mobileApi";

const demandLevels = [
  "very-high",
  "high",
  "medium-high",
  "medium",
  "medium-low",
  "low",
  "unknown",
] as const;
const MIN_PROJECTS = 7;
const MAX_PROJECTS = 7;

const roleFallbacks = {
  backend: {
    definition:
      "A Backend Engineer builds and maintains the APIs, data systems, and service logic that power applications.",
    skills: {
      core: ["APIs", "Databases", "System Design"],
      frequent: ["Node.js", "SQL", "Docker"],
      bonus: ["Redis", "Kubernetes", "AWS"],
    },
    projects: [
      {
        title: "Authentication API",
        description: "Ship login, session, and permission flows for secure product access.",
        tags: ["JWT", "RBAC", "PostgreSQL"],
      },
      {
        title: "Payments Service",
        description: "Handle billing events, subscriptions, and transaction reconciliation.",
        tags: ["Billing", "Webhooks", "Queues"],
      },
      {
        title: "Analytics Backend",
        description: "Ingest events and expose reporting endpoints for product teams.",
        tags: ["ETL", "SQL", "REST"],
      },
      {
        title: "Search Platform",
        description: "Index product data and serve low-latency search results.",
        tags: ["Search", "Caching", "Elasticsearch"],
      },
      {
        title: "Notifications Service",
        description: "Coordinate email, push, and messaging delivery with retries.",
        tags: ["Queues", "Retries", "Observability"],
      },
      {
        title: "Admin Operations API",
        description: "Expose internal workflows, audit trails, and moderation tools.",
        tags: ["Admin", "Audit", "Permissions"],
      },
      {
        title: "Job Scheduler",
        description: "Run asynchronous workloads and timed maintenance tasks reliably.",
        tags: ["Cron", "Workers", "Resilience"],
      },
    ],
  },
  frontend: {
    definition:
      "A Frontend Engineer designs and builds the interfaces, state flows, and client experiences users interact with directly.",
    skills: {
      core: ["UI Architecture", "State Management", "Accessibility"],
      frequent: ["React", "TypeScript", "Testing"],
      bonus: ["Animation", "Performance", "Design Systems"],
    },
    projects: [
      {
        title: "Design System Library",
        description: "Create reusable components, tokens, and interaction patterns for teams.",
        tags: ["Components", "Tokens", "Storybook"],
      },
      {
        title: "Analytics Dashboard",
        description: "Build dense, filterable reporting views with responsive layouts.",
        tags: ["Charts", "Tables", "UX"],
      },
      {
        title: "Checkout Flow",
        description: "Implement high-conversion purchase steps with clear validation states.",
        tags: ["Forms", "Validation", "Payments"],
      },
      {
        title: "Customer Portal",
        description: "Ship authenticated account management and settings experiences.",
        tags: ["Auth", "Routing", "Profile"],
      },
      {
        title: "Content Editor",
        description: "Support rich editing workflows with autosave and preview modes.",
        tags: ["Editor", "Autosave", "Preview"],
      },
      {
        title: "Mobile Performance Pass",
        description: "Improve render speed, skeletons, and perceived responsiveness.",
        tags: ["Performance", "Caching", "Profiling"],
      },
      {
        title: "Experimentation Surface",
        description: "Deliver feature flags and A/B test experiences without regressions.",
        tags: ["Flags", "Metrics", "QA"],
      },
    ],
  },
  ai: {
    definition:
      "An AI Engineer builds systems that integrate models, data pipelines, evaluation loops, and product workflows.",
    skills: {
      core: ["LLM Integration", "Prompt Design", "Evaluation"],
      frequent: ["Python", "Embeddings", "APIs"],
      bonus: ["Fine-tuning", "Agents", "Vector Search"],
    },
    projects: [
      {
        title: "RAG Assistant",
        description: "Ground model answers in indexed knowledge with retrieval and citations.",
        tags: ["RAG", "Embeddings", "Vector DB"],
      },
      {
        title: "Support Copilot",
        description: "Assist agents with summaries, suggested replies, and next actions.",
        tags: ["LLM", "Summaries", "Workflow"],
      },
      {
        title: "Prompt Evaluation Suite",
        description: "Measure output quality, drift, and failure modes before release.",
        tags: ["Eval", "Benchmarks", "QA"],
      },
      {
        title: "Document Extraction Pipeline",
        description: "Transform messy files into structured data for downstream systems.",
        tags: ["OCR", "Parsing", "Classification"],
      },
      {
        title: "Recommendation Engine",
        description: "Blend user behavior signals with model reasoning for relevance.",
        tags: ["Ranking", "Features", "ML"],
      },
      {
        title: "Voice Automation Flow",
        description: "Orchestrate speech, intent, and action handling for voice use cases.",
        tags: ["Speech", "Intent", "Automation"],
      },
      {
        title: "AI Guardrails Layer",
        description: "Add safety checks, policy filters, and confidence-based routing.",
        tags: ["Safety", "Moderation", "Policy"],
      },
    ],
  },
  data: {
    definition:
      "A Data Analyst turns raw operational data into business insight through reporting, modeling, and decision support.",
    skills: {
      core: ["SQL", "Analytics", "Data Modeling"],
      frequent: ["Dashboards", "Excel", "Stakeholder Reporting"],
      bonus: ["Python", "Experimentation", "Forecasting"],
    },
    projects: [
      {
        title: "Executive KPI Dashboard",
        description: "Track revenue, retention, and funnel trends for leadership decisions.",
        tags: ["BI", "KPIs", "Dashboards"],
      },
      {
        title: "Cohort Retention Study",
        description: "Identify churn patterns and segment retention by acquisition source.",
        tags: ["Retention", "Cohorts", "SQL"],
      },
      {
        title: "Revenue Attribution Model",
        description: "Map marketing and product events to reliable revenue signals.",
        tags: ["Attribution", "Modeling", "Metrics"],
      },
      {
        title: "Experiment Readout Pack",
        description: "Summarize test outcomes and explain business impact clearly.",
        tags: ["A/B Testing", "Stats", "Narrative"],
      },
      {
        title: "Pipeline Quality Monitor",
        description: "Catch stale sources, schema drift, and reporting anomalies early.",
        tags: ["Monitoring", "ETL", "QA"],
      },
      {
        title: "Forecast Review Model",
        description: "Estimate short-term demand and compare actuals against forecast assumptions.",
        tags: ["Forecasting", "Time Series", "Variance"],
      },
      {
        title: "Operations Scorecard",
        description: "Surface delivery, SLA, and productivity indicators for business teams.",
        tags: ["Ops", "Reporting", "SLA"],
      },
    ],
  },
  devops: {
    definition:
      "A DevOps Engineer automates delivery, infrastructure, observability, and reliability across software systems.",
    skills: {
      core: ["CI/CD", "Infrastructure", "Observability"],
      frequent: ["Docker", "Cloud", "Terraform"],
      bonus: ["Kubernetes", "Security", "Cost Optimization"],
    },
    projects: [
      {
        title: "Deployment Pipeline",
        description: "Automate build, test, and release promotion across environments.",
        tags: ["CI/CD", "GitHub Actions", "Quality Gates"],
      },
      {
        title: "Infrastructure as Code Stack",
        description: "Provision repeatable services and environment baselines with policy controls.",
        tags: ["Terraform", "Cloud", "IAM"],
      },
      {
        title: "Observability Platform",
        description: "Unify logs, metrics, and traces for faster incident response.",
        tags: ["Metrics", "Tracing", "Alerts"],
      },
      {
        title: "Auto-Scaling Runtime",
        description: "Tune workload scaling to match traffic spikes without waste.",
        tags: ["Kubernetes", "Scaling", "SRE"],
      },
      {
        title: "Secrets Management Flow",
        description: "Centralize credentials and rotate sensitive config safely.",
        tags: ["Secrets", "Security", "Compliance"],
      },
      {
        title: "Disaster Recovery Drill",
        description: "Validate backup, failover, and restoration procedures under pressure.",
        tags: ["Backups", "Failover", "Recovery"],
      },
      {
        title: "Cost Visibility Layer",
        description: "Track spend drivers and highlight optimization opportunities by service.",
        tags: ["FinOps", "Cloud", "Reporting"],
      },
    ],
  },
  default: {
    definition:
      "This role combines technical delivery, system understanding, and collaboration to ship reliable software outcomes.",
    skills: {
      core: ["Problem Solving", "System Thinking", "Delivery"],
      frequent: ["APIs", "Data", "Testing"],
      bonus: ["Automation", "Architecture", "Cloud"],
    },
    projects: [
      {
        title: "Internal Operations Tool",
        description: "Reduce manual work with a tailored workflow for internal teams.",
        tags: ["Workflow", "Automation", "UI"],
      },
      {
        title: "Reporting Platform",
        description: "Expose reliable metrics and drilldowns for business stakeholders.",
        tags: ["Reporting", "Dashboards", "Data"],
      },
      {
        title: "Customer Self-Serve Flow",
        description: "Let users manage setup, settings, and support tasks independently.",
        tags: ["Self-Serve", "UX", "Accounts"],
      },
      {
        title: "Integration Hub",
        description: "Connect product data with third-party systems through stable interfaces.",
        tags: ["Integrations", "APIs", "Reliability"],
      },
      {
        title: "Monitoring Console",
        description: "Track health, incidents, and usage across core services.",
        tags: ["Monitoring", "Alerts", "Ops"],
      },
      {
        title: "Workflow Automation Engine",
        description: "Trigger structured actions from events and business rules.",
        tags: ["Automation", "Rules", "Jobs"],
      },
      {
        title: "Experiment Delivery Layer",
        description: "Ship controlled releases and measure user impact safely.",
        tags: ["Experiments", "Flags", "Metrics"],
      },
    ],
  },
} as const;

const rawRoleSnapshotSchema = z
  .object({
    role: z.string().optional(),
    definition: z.string().optional(),
    summary: z.string().optional(),
    countries: z
      .array(
        z.object({
          name: z.string().optional(),
          salary_estimate: z.string().optional(),
          salary_score: z.number().optional(),
          demand_level: z.string().optional(),
        })
      )
      .optional(),
    skills: z
      .object({
        core: z.array(z.string()).optional(),
        frequent: z.array(z.string()).optional(),
        bonus: z.array(z.string()).optional(),
      })
      .optional(),
    projects: z
      .array(
        z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .optional(),
    insight: z.string().optional(),
    meta: z
      .object({
        generated_at: z.string().nullable().optional(),
        model: z.string().nullable().optional(),
        degraded: z.boolean().optional(),
        cache_status: z.string().nullable().optional(),
      })
      .optional(),
  })
  .passthrough();

const finalRoleSnapshotSchema = z.object({
  role: z.string().min(1),
  definition: z.string().min(1),
  summary: z.string().min(1),
  countries: z.array(
    z.object({
      name: z.string().min(1),
      salary_estimate: z.string().min(1),
      salary_score: z.number().min(0).max(100),
      demand_level: z.enum(demandLevels),
    })
  ).min(4),
  skills: z.object({
    core: z.array(z.string()),
    frequent: z.array(z.string()),
    bonus: z.array(z.string()),
  }),
  projects: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      tags: z.array(z.string()),
    })
  ).min(MIN_PROJECTS),
  insight: z.string().min(1),
  meta: z.object({
    generated_at: z.string().nullable(),
    model: z.string().nullable(),
    degraded: z.boolean(),
    requested_countries: z.array(z.string()),
    cache_status: z.string().nullable().optional(),
  }),
});

export type RoleSnapshotDemandLevel = (typeof demandLevels)[number];
export type AiRoleSnapshot = z.infer<typeof finalRoleSnapshotSchema>;

type RoleSnapshotRequest = {
  role: string;
  countries: string[];
};

function normalizeText(value: unknown, fallback = "", maxLength = 220) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function uniqueItems(values: unknown, maxItems = 8) {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const text = normalizeText(value, "", 40);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);

    if (normalized.length >= maxItems) break;
  }

  return normalized;
}

function getRoleFamily(role: string) {
  const normalized = role.toLowerCase();

  if (normalized.includes("backend")) return "backend";
  if (
    normalized.includes("frontend") ||
    normalized.includes("front-end") ||
    normalized.includes("mobile") ||
    normalized.includes("ios") ||
    normalized.includes("android")
  ) {
    return "frontend";
  }
  if (
    normalized.includes("ai") ||
    normalized.includes("ml") ||
    normalized.includes("machine learning") ||
    normalized.includes("llm")
  ) {
    return "ai";
  }
  if (
    normalized.includes("data") ||
    normalized.includes("analytics") ||
    normalized.includes("analyst") ||
    normalized.includes("bi")
  ) {
    return "data";
  }
  if (
    normalized.includes("devops") ||
    normalized.includes("platform") ||
    normalized.includes("sre") ||
    normalized.includes("infra")
  ) {
    return "devops";
  }

  return "default";
}

function getRoleFallback(role: string) {
  return roleFallbacks[getRoleFamily(role)];
}

function buildRoleDefinitionFallback(role: string) {
  const normalizedRole = normalizeText(role, "This role", 80) || "This role";
  const fallback = getRoleFallback(normalizedRole);

  if (
    normalizedRole.toLowerCase().includes("engineer") ||
    normalizedRole.toLowerCase().includes("analyst")
  ) {
    return fallback.definition;
  }

  return `${normalizedRole} focuses on shipping technical outcomes, shaping execution quality, and improving system reliability.`;
}

function buildFallbackSummary(role: string, countries: string[]) {
  return `${role} hiring stays active across ${countries.length} selected markets, with pay levels and stack expectations shifting by product scale and platform complexity.`;
}

function buildFallbackInsight(role: string) {
  return `${role} profiles that combine delivery speed with operational reliability remain easier to position across competitive markets.`;
}

function buildFallbackSkills(role: string) {
  const fallback = getRoleFallback(role);
  return {
    core: uniqueItems(fallback.skills.core, 8),
    frequent: uniqueItems(fallback.skills.frequent, 8),
    bonus: uniqueItems(fallback.skills.bonus, 8),
  };
}

function buildFallbackProjects(
  role: string,
  skills?: { core: string[]; frequent: string[]; bonus: string[] }
) {
  const fallback = getRoleFallback(role);
  const fallbackTags = uniqueItems(
    [
      ...(skills?.core ?? []),
      ...(skills?.frequent ?? []),
      ...(skills?.bonus ?? []),
      ...fallback.skills.core,
      ...fallback.skills.frequent,
      ...fallback.skills.bonus,
    ],
    4
  );

  return fallback.projects.slice(0, MIN_PROJECTS).map((project, index) => {
    const extraTags = fallbackTags.slice(
      index % Math.max(fallbackTags.length, 1),
      (index % Math.max(fallbackTags.length, 1)) + 2
    );

    return {
      title: project.title,
      description: project.description,
      tags: uniqueItems([...project.tags, ...extraTags], 4),
    };
  });
}

function normalizeDemandLevel(value: unknown): RoleSnapshotDemandLevel {
  const normalized = normalizeText(value, "unknown", 20).toLowerCase().replace(/\s+/g, "-");
  return demandLevels.includes(normalized as RoleSnapshotDemandLevel)
    ? (normalized as RoleSnapshotDemandLevel)
    : "unknown";
}

function clampScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function deriveSalaryMidpoint(text: string) {
  const matches = text.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return null;

  const values = matches
    .map((match) => Number(match.replace(",", ".")))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return (values[0] + values[1]) / 2;
}

function isAbortError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted|abort/i.test(error.message))
  );
}

function applyDerivedScores(
  countries: Array<{
    name: string;
    salary_estimate: string;
    salary_score: number;
    demand_level: RoleSnapshotDemandLevel;
  }>
) {
  const midpoints = countries.map((country) => deriveSalaryMidpoint(country.salary_estimate));
  const validMidpoints = midpoints.filter((value): value is number => typeof value === "number");

  if (validMidpoints.length === 0) {
    return countries;
  }

  const min = Math.min(...validMidpoints);
  const max = Math.max(...validMidpoints);

  return countries.map((country, index) => {
    if (country.salary_score > 0) return country;

    const midpoint = midpoints[index];
    if (typeof midpoint !== "number") return country;

    const derived =
      min === max ? 68 : Math.round(40 + ((midpoint - min) / (max - min)) * 60);

    return {
      ...country,
      salary_score: clampScore(derived),
    };
  });
}

function normalizeCountries(rawCountries: unknown, requestedCountries: string[]) {
  const rawItems = Array.isArray(rawCountries) ? rawCountries : [];
  const byName = new Map<
    string,
    {
      name: string;
      salary_estimate: string;
      salary_score: number;
      demand_level: RoleSnapshotDemandLevel;
    }
  >();

  for (const item of rawItems) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = normalizeText(record.name, "", 40);
    if (!name) continue;

    byName.set(name.toLowerCase(), {
      name,
      salary_estimate: normalizeText(record.salary_estimate, "Unavailable", 40),
      salary_score: clampScore(record.salary_score),
      demand_level: normalizeDemandLevel(record.demand_level),
    });
  }

  return applyDerivedScores(
    requestedCountries.map((country) => {
      return (
        byName.get(country.toLowerCase()) ?? {
          name: country,
          salary_estimate: "Unavailable",
          salary_score: 0,
          demand_level: "unknown",
        }
      );
    })
  );
}

function normalizeSkills(rawSkills: unknown, role: string) {
  const fallbackSkills = buildFallbackSkills(role);
  const record = rawSkills && typeof rawSkills === "object" ? rawSkills : {};
  const core = uniqueItems((record as { core?: unknown[] }).core, 8);
  const frequent = uniqueItems((record as { frequent?: unknown[] }).frequent, 8);
  const bonus = uniqueItems((record as { bonus?: unknown[] }).bonus, 8);

  return {
    skills: {
      core: core.length > 0 ? core : fallbackSkills.core,
      frequent: frequent.length > 0 ? frequent : fallbackSkills.frequent,
      bonus: bonus.length > 0 ? bonus : fallbackSkills.bonus,
    },
    supplemented: core.length === 0 || frequent.length === 0 || bonus.length === 0,
  };
}

function normalizeProjects(
  rawProjects: unknown,
  role: string,
  skills: { core: string[]; frequent: string[]; bonus: string[] }
) {
  const projects: Array<{ title: string; description: string; tags: string[] }> = [];
  const seen = new Set<string>();

  if (Array.isArray(rawProjects)) {
    for (const item of rawProjects) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title, "", 56);
      if (!title) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      projects.push({
        title,
        description: normalizeText(
          record.description,
          `Build a production-ready ${role.toLowerCase()} workflow with clear delivery value.`,
          96
        ),
        tags: uniqueItems(record.tags, 4),
      });

      if (projects.length >= MAX_PROJECTS) {
        break;
      }
    }
  }

  if (projects.length >= MIN_PROJECTS) {
    return {
      projects: projects.slice(0, MAX_PROJECTS),
      supplemented: false,
    };
  }

  const fallbackProjects = buildFallbackProjects(role, skills);
  for (const project of fallbackProjects) {
    const key = project.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    projects.push(project);

    if (projects.length >= MIN_PROJECTS) {
      break;
    }
  }

  return {
    projects: projects.slice(0, MAX_PROJECTS),
    supplemented: true,
  };
}

function buildSafeRoleSnapshot(rawInput: unknown, request: RoleSnapshotRequest): AiRoleSnapshot {
  const parsed = rawRoleSnapshotSchema.safeParse(rawInput);
  const raw = parsed.success ? parsed.data : {};
  const role = normalizeText(raw.role, request.role, 80) || request.role;
  const skillsBundle = normalizeSkills(raw.skills, role);
  const projectsBundle = normalizeProjects(raw.projects, role, skillsBundle.skills);

  const normalized = {
    role,
    definition: normalizeText(raw.definition, buildRoleDefinitionFallback(role), 150),
    summary: normalizeText(raw.summary, buildFallbackSummary(role, request.countries), 220),
    countries: normalizeCountries(raw.countries, request.countries),
    skills: skillsBundle.skills,
    projects: projectsBundle.projects,
    insight: normalizeText(raw.insight, buildFallbackInsight(role), 180),
    meta: {
      generated_at: normalizeText(raw.meta?.generated_at, "", 64) || null,
      model: normalizeText(raw.meta?.model, "", 80) || null,
      degraded:
        Boolean(raw.meta?.degraded) ||
        raw.definition == null ||
        raw.summary == null ||
        raw.insight == null ||
        !Array.isArray(raw.countries) ||
        skillsBundle.supplemented ||
        projectsBundle.supplemented,
      requested_countries: request.countries,
      cache_status: normalizeText(raw.meta?.cache_status, "", 32) || null,
    },
  };

  return finalRoleSnapshotSchema.parse(normalized);
}

function buildPlaceholderSnapshot(request: RoleSnapshotRequest): AiRoleSnapshot {
  const skills = buildFallbackSkills(request.role);
  return finalRoleSnapshotSchema.parse({
    role: request.role,
    definition: buildRoleDefinitionFallback(request.role),
    summary:
      "Live role intelligence is temporarily unavailable. This fallback keeps the briefing stable while the next model response is prepared.",
    countries: request.countries.map((country) => ({
      name: country,
      salary_estimate: "Unavailable",
      salary_score: 0,
      demand_level: "unknown",
    })),
    skills,
    projects: buildFallbackProjects(request.role, skills),
    insight: buildFallbackInsight(request.role),
    meta: {
      generated_at: new Date().toISOString(),
      model: "placeholder",
      degraded: true,
      requested_countries: request.countries,
      cache_status: "fallback",
    },
  });
}

export async function getAiRoleSnapshot(
  request: RoleSnapshotRequest,
  options?: { signal?: AbortSignal }
) {
  const role = normalizeText(request.role, "", 80);
  const countries = uniqueItems(request.countries, 8);

  if (!role) {
    throw new Error("Role is required to generate the briefing.");
  }

  if (countries.length < 4 || countries.length > 8) {
    throw new Error("Select between 4 and 8 markets.");
  }

  const normalizedRequest = {
    role,
    countries,
  };

  try {
    const envelope = await fetchAiRoleSnapshotEnvelope(normalizedRequest, {
      signal: options?.signal,
    });
    return buildSafeRoleSnapshot(envelope?.data, normalizedRequest);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.warn("[aiRoleSnapshot] falling back to placeholder snapshot", {
      message: error instanceof Error ? error.message : String(error),
      role,
      countries,
    });
    return buildPlaceholderSnapshot(normalizedRequest);
  }
}
