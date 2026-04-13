const axios = require('axios');
const { Profile } = require('../models');

const DEFAULT_MODEL = 'qwen2.5:3b';
const DEFAULT_TIMEOUT_MS = 40_000;
const SNAPSHOT_CACHE_TTL_MS = 1000 * 60 * 12;
const FALLBACK_CACHE_TTL_MS = 1000 * 60 * 2;
const MAX_CACHE_ENTRIES = 120;
const MAX_SKILLS_PER_GROUP = 8;
const MIN_PROJECTS = 7;
const MAX_PROJECTS = 7;
const MAX_PROJECT_TAGS = 4;
const DEMAND_LEVELS = new Set([
  'very-high',
  'high',
  'medium-high',
  'medium',
  'medium-low',
  'low',
  'unknown',
]);

const SNAPSHOT_CACHE = new Map();
const INFLIGHT_REQUESTS = new Map();

const ROLE_BLUEPRINTS = {
  backend: {
    definition:
      'A Backend Engineer builds and maintains the APIs, data systems, and service logic that power applications.',
    skills: {
      core: ['APIs', 'Databases', 'System Design'],
      frequent: ['Node.js', 'SQL', 'Docker'],
      bonus: ['Redis', 'Kubernetes', 'AWS'],
    },
    projects: [
      {
        title: 'Authentication API',
        description: 'Ship login, session, and permission flows for secure product access.',
        tags: ['JWT', 'RBAC', 'PostgreSQL'],
      },
      {
        title: 'Payments Service',
        description: 'Handle billing events, subscriptions, and transaction reconciliation.',
        tags: ['Billing', 'Webhooks', 'Queues'],
      },
      {
        title: 'Analytics Backend',
        description: 'Ingest events and expose reporting endpoints for product teams.',
        tags: ['ETL', 'SQL', 'REST'],
      },
      {
        title: 'Search Platform',
        description: 'Index product data and serve low-latency search results.',
        tags: ['Search', 'Caching', 'Elasticsearch'],
      },
      {
        title: 'Notifications Service',
        description: 'Coordinate email, push, and messaging delivery with retries.',
        tags: ['Queues', 'Retries', 'Observability'],
      },
      {
        title: 'Admin Operations API',
        description: 'Expose internal workflows, audit trails, and moderation tools.',
        tags: ['Admin', 'Audit', 'Permissions'],
      },
      {
        title: 'Job Scheduler',
        description: 'Run asynchronous workloads and timed maintenance tasks reliably.',
        tags: ['Cron', 'Workers', 'Resilience'],
      },
    ],
  },
  frontend: {
    definition:
      'A Frontend Engineer designs and builds the interfaces, state flows, and client experiences users interact with directly.',
    skills: {
      core: ['UI Architecture', 'State Management', 'Accessibility'],
      frequent: ['React', 'TypeScript', 'Testing'],
      bonus: ['Animation', 'Performance', 'Design Systems'],
    },
    projects: [
      {
        title: 'Design System Library',
        description: 'Create reusable components, tokens, and interaction patterns for teams.',
        tags: ['Components', 'Tokens', 'Storybook'],
      },
      {
        title: 'Analytics Dashboard',
        description: 'Build dense, filterable reporting views with responsive layouts.',
        tags: ['Charts', 'Tables', 'UX'],
      },
      {
        title: 'Checkout Flow',
        description: 'Implement high-conversion purchase steps with clear validation states.',
        tags: ['Forms', 'Validation', 'Payments'],
      },
      {
        title: 'Customer Portal',
        description: 'Ship authenticated account management and settings experiences.',
        tags: ['Auth', 'Routing', 'Profile'],
      },
      {
        title: 'Content Editor',
        description: 'Support rich editing workflows with autosave and preview modes.',
        tags: ['Editor', 'Autosave', 'Preview'],
      },
      {
        title: 'Mobile Performance Pass',
        description: 'Improve render speed, skeletons, and perceived responsiveness.',
        tags: ['Performance', 'Caching', 'Profiling'],
      },
      {
        title: 'Experimentation Surface',
        description: 'Deliver feature flags and A/B test experiences without regressions.',
        tags: ['Flags', 'Metrics', 'QA'],
      },
    ],
  },
  ai: {
    definition:
      'An AI Engineer builds systems that integrate models, data pipelines, evaluation loops, and product workflows.',
    skills: {
      core: ['LLM Integration', 'Prompt Design', 'Evaluation'],
      frequent: ['Python', 'Embeddings', 'APIs'],
      bonus: ['Fine-tuning', 'Agents', 'Vector Search'],
    },
    projects: [
      {
        title: 'RAG Assistant',
        description: 'Ground model answers in indexed knowledge with retrieval and citations.',
        tags: ['RAG', 'Embeddings', 'Vector DB'],
      },
      {
        title: 'Support Copilot',
        description: 'Assist agents with summaries, suggested replies, and next actions.',
        tags: ['LLM', 'Summaries', 'Workflow'],
      },
      {
        title: 'Prompt Evaluation Suite',
        description: 'Measure output quality, drift, and failure modes before release.',
        tags: ['Eval', 'Benchmarks', 'QA'],
      },
      {
        title: 'Document Extraction Pipeline',
        description: 'Transform messy files into structured data for downstream systems.',
        tags: ['OCR', 'Parsing', 'Classification'],
      },
      {
        title: 'Recommendation Engine',
        description: 'Blend user behavior signals with model reasoning for relevance.',
        tags: ['Ranking', 'Features', 'ML'],
      },
      {
        title: 'Voice Automation Flow',
        description: 'Orchestrate speech, intent, and action handling for voice use cases.',
        tags: ['Speech', 'Intent', 'Automation'],
      },
      {
        title: 'AI Guardrails Layer',
        description: 'Add safety checks, policy filters, and confidence-based routing.',
        tags: ['Safety', 'Moderation', 'Policy'],
      },
    ],
  },
  data: {
    definition:
      'A Data Analyst turns raw operational data into business insight through reporting, modeling, and decision support.',
    skills: {
      core: ['SQL', 'Analytics', 'Data Modeling'],
      frequent: ['Dashboards', 'Excel', 'Stakeholder Reporting'],
      bonus: ['Python', 'Experimentation', 'Forecasting'],
    },
    projects: [
      {
        title: 'Executive KPI Dashboard',
        description: 'Track revenue, retention, and funnel trends for leadership decisions.',
        tags: ['BI', 'KPIs', 'Dashboards'],
      },
      {
        title: 'Cohort Retention Study',
        description: 'Identify churn patterns and segment retention by acquisition source.',
        tags: ['Retention', 'Cohorts', 'SQL'],
      },
      {
        title: 'Revenue Attribution Model',
        description: 'Map marketing and product events to reliable revenue signals.',
        tags: ['Attribution', 'Modeling', 'Metrics'],
      },
      {
        title: 'Experiment Readout Pack',
        description: 'Summarize test outcomes and explain business impact clearly.',
        tags: ['A/B Testing', 'Stats', 'Narrative'],
      },
      {
        title: 'Pipeline Quality Monitor',
        description: 'Catch stale sources, schema drift, and reporting anomalies early.',
        tags: ['Monitoring', 'ETL', 'QA'],
      },
      {
        title: 'Forecast Review Model',
        description: 'Estimate short-term demand and compare actuals against forecast assumptions.',
        tags: ['Forecasting', 'Time Series', 'Variance'],
      },
      {
        title: 'Operations Scorecard',
        description: 'Surface delivery, SLA, and productivity indicators for business teams.',
        tags: ['Ops', 'Reporting', 'SLA'],
      },
    ],
  },
  devops: {
    definition:
      'A DevOps Engineer automates delivery, infrastructure, observability, and reliability across software systems.',
    skills: {
      core: ['CI/CD', 'Infrastructure', 'Observability'],
      frequent: ['Docker', 'Cloud', 'Terraform'],
      bonus: ['Kubernetes', 'Security', 'Cost Optimization'],
    },
    projects: [
      {
        title: 'Deployment Pipeline',
        description: 'Automate build, test, and release promotion across environments.',
        tags: ['CI/CD', 'GitHub Actions', 'Quality Gates'],
      },
      {
        title: 'Infrastructure as Code Stack',
        description: 'Provision repeatable services and environment baselines with policy controls.',
        tags: ['Terraform', 'Cloud', 'IAM'],
      },
      {
        title: 'Observability Platform',
        description: 'Unify logs, metrics, and traces for faster incident response.',
        tags: ['Metrics', 'Tracing', 'Alerts'],
      },
      {
        title: 'Auto-Scaling Runtime',
        description: 'Tune workload scaling to match traffic spikes without waste.',
        tags: ['Kubernetes', 'Scaling', 'SRE'],
      },
      {
        title: 'Secrets Management Flow',
        description: 'Centralize credentials and rotate sensitive config safely.',
        tags: ['Secrets', 'Security', 'Compliance'],
      },
      {
        title: 'Disaster Recovery Drill',
        description: 'Validate backup, failover, and restoration procedures under pressure.',
        tags: ['Backups', 'Failover', 'Recovery'],
      },
      {
        title: 'Cost Visibility Layer',
        description: 'Track spend drivers and highlight optimization opportunities by service.',
        tags: ['FinOps', 'Cloud', 'Reporting'],
      },
    ],
  },
  default: {
    definition:
      'This role combines technical delivery, system understanding, and collaboration to ship reliable software outcomes.',
    skills: {
      core: ['Problem Solving', 'System Thinking', 'Delivery'],
      frequent: ['APIs', 'Data', 'Testing'],
      bonus: ['Automation', 'Architecture', 'Cloud'],
    },
    projects: [
      {
        title: 'Internal Operations Tool',
        description: 'Reduce manual work with a tailored workflow for internal teams.',
        tags: ['Workflow', 'Automation', 'UI'],
      },
      {
        title: 'Reporting Platform',
        description: 'Expose reliable metrics and drilldowns for business stakeholders.',
        tags: ['Reporting', 'Dashboards', 'Data'],
      },
      {
        title: 'Customer Self-Serve Flow',
        description: 'Let users manage setup, settings, and support tasks independently.',
        tags: ['Self-Serve', 'UX', 'Accounts'],
      },
      {
        title: 'Integration Hub',
        description: 'Connect product data with third-party systems through stable interfaces.',
        tags: ['Integrations', 'APIs', 'Reliability'],
      },
      {
        title: 'Monitoring Console',
        description: 'Track health, incidents, and usage across core services.',
        tags: ['Monitoring', 'Alerts', 'Ops'],
      },
      {
        title: 'Workflow Automation Engine',
        description: 'Trigger structured actions from events and business rules.',
        tags: ['Automation', 'Rules', 'Jobs'],
      },
      {
        title: 'Experiment Delivery Layer',
        description: 'Ship controlled releases and measure user impact safely.',
        tags: ['Experiments', 'Flags', 'Metrics'],
      },
    ],
  },
};

function clampNumber(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeText(value, options = {}) {
  const {
    fallback = '',
    maxLength = 280,
  } = options;

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallback;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function uniqueStrings(values, maxItems) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const normalized = [];

  for (const item of values) {
    const text = normalizeText(String(item || ''), { maxLength: 40 });
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);

    if (normalized.length >= maxItems) {
      break;
    }
  }

  return normalized;
}

function normalizeDemandLevel(value) {
  const normalized = normalizeText(String(value || '').toLowerCase(), {
    maxLength: 20,
  }).replace(/\s+/g, '-');

  return DEMAND_LEVELS.has(normalized) ? normalized : 'unknown';
}

function parseJsonObject(rawText) {
  const direct = normalizeText(rawText, { maxLength: 24_000 });
  if (!direct) return null;

  const candidates = [
    direct,
    direct.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim(),
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');

      if (start === -1 || end === -1 || end <= start) {
        continue;
      }

      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch (_nestedError) {
        continue;
      }
    }
  }

  return null;
}

function normalizeOllamaBaseUrl(rawUrl) {
  const cleaned = String(rawUrl || 'http://localhost:11434')
    .trim()
    .replace(/\/$/, '')
    .replace(/\/v1$/, '');

  return cleaned || 'http://localhost:11434';
}

function getRoleSnapshotConfig() {
  const timeoutMs = Number(process.env.OLLAMA_ROLE_SNAPSHOT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  return {
    baseUrl: normalizeOllamaBaseUrl(process.env.OLLAMA_URL),
    model:
      normalizeText(process.env.OLLAMA_MODEL_ROLE_SNAPSHOT, { maxLength: 120 }) ||
      normalizeText(process.env.OLLAMA_MODEL_CHAT, { maxLength: 120 }) ||
      normalizeText(process.env.OLLAMA_MODEL, { maxLength: 120 }) ||
      DEFAULT_MODEL,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    apiKey: normalizeText(process.env.OLLAMA_API_KEY, { maxLength: 200 }) || 'ollama',
  };
}

function getRoleFamily(role) {
  const normalized = normalizeText(role, { maxLength: 80 }).toLowerCase();

  if (normalized.includes('backend')) return 'backend';
  if (
    normalized.includes('frontend') ||
    normalized.includes('front-end') ||
    normalized.includes('mobile') ||
    normalized.includes('ios') ||
    normalized.includes('android')
  ) {
    return 'frontend';
  }
  if (
    normalized.includes('ai') ||
    normalized.includes('ml') ||
    normalized.includes('machine learning') ||
    normalized.includes('llm')
  ) {
    return 'ai';
  }
  if (
    normalized.includes('data') ||
    normalized.includes('analytics') ||
    normalized.includes('analyst') ||
    normalized.includes('bi')
  ) {
    return 'data';
  }
  if (
    normalized.includes('devops') ||
    normalized.includes('platform') ||
    normalized.includes('sre') ||
    normalized.includes('infra')
  ) {
    return 'devops';
  }

  return 'default';
}

function getRoleBlueprint(role) {
  return ROLE_BLUEPRINTS[getRoleFamily(role)] || ROLE_BLUEPRINTS.default;
}

function buildUserContext(profile) {
  if (!profile || typeof profile !== 'object') {
    return 'User context: none';
  }

  const explicitSkills = Array.isArray(profile.explicit_skills)
    ? profile.explicit_skills
        .map((item) => normalizeText(item?.name, { maxLength: 30 }))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return [
    `Target role: ${normalizeText(profile.explicit_target_role, { maxLength: 64 }) || 'unknown'}`,
    `Experience: ${normalizeText(profile.experience_level, { maxLength: 32 }) || 'unknown'}`,
    `Domain: ${normalizeText(profile.explicit_preferences?.domain, { maxLength: 48 }) || 'unspecified'}`,
    `Stack: ${normalizeText(profile.explicit_preferences?.stack, { maxLength: 64 }) || 'unspecified'}`,
    `Skills: ${explicitSkills.length > 0 ? explicitSkills.join(', ') : 'none listed'}`,
  ].join('\n');
}

function buildRoleDefinitionFallback(role) {
  const normalizedRole = normalizeText(role, { fallback: 'This role', maxLength: 80 }) || 'This role';
  const blueprint = getRoleBlueprint(normalizedRole);

  if (
    normalizedRole.toLowerCase().includes('engineer') ||
    normalizedRole.toLowerCase().includes('analyst')
  ) {
    return blueprint.definition;
  }

  return `${normalizedRole} focuses on shipping technical outcomes, shaping execution quality, and improving system reliability.`;
}

function buildFallbackSummary(role, countries) {
  return [
    `${role} hiring stays active across ${countries.length} selected markets,`,
    'with pay levels and stack expectations shifting by product scale and platform complexity.',
  ].join(' ');
}

function buildFallbackInsight(role) {
  return `${role} profiles that combine delivery speed with operational reliability remain easier to position across competitive markets.`;
}

function buildFallbackSkills(role) {
  const blueprint = getRoleBlueprint(role);
  return {
    core: uniqueStrings(blueprint.skills.core, MAX_SKILLS_PER_GROUP),
    frequent: uniqueStrings(blueprint.skills.frequent, MAX_SKILLS_PER_GROUP),
    bonus: uniqueStrings(blueprint.skills.bonus, MAX_SKILLS_PER_GROUP),
  };
}

function buildFallbackProjects(role, skills) {
  const blueprint = getRoleBlueprint(role);
  const fallbackTags = uniqueStrings(
    [
      ...(skills?.core || []),
      ...(skills?.frequent || []),
      ...(skills?.bonus || []),
      ...blueprint.skills.core,
      ...blueprint.skills.frequent,
      ...blueprint.skills.bonus,
    ],
    MAX_PROJECT_TAGS
  );

  return blueprint.projects.slice(0, MIN_PROJECTS).map((project, index) => {
    const mergedTags = uniqueStrings(
      [
        ...(project.tags || []),
        ...fallbackTags.slice(
          index % Math.max(fallbackTags.length, 1),
          (index % Math.max(fallbackTags.length, 1)) + 2
        ),
      ],
      MAX_PROJECT_TAGS
    );

    return {
      title: normalizeText(project.title, { maxLength: 56 }),
      description: normalizeText(project.description, {
        maxLength: 96,
        fallback: `Build a production-ready ${role.toLowerCase()} workflow with clear business value.`,
      }),
      tags: mergedTags.length > 0 ? mergedTags : fallbackTags,
    };
  });
}

function createFallbackSnapshot(role, countries, model, fallbackReason) {
  const definition = buildRoleDefinitionFallback(role);
  const skills = buildFallbackSkills(role);

  return {
    role,
    definition,
    summary: buildFallbackSummary(role, countries),
    countries: countries.map((country) => ({
      name: country,
      salary_estimate: 'Unavailable',
      salary_score: 0,
      demand_level: 'unknown',
    })),
    skills,
    projects: buildFallbackProjects(role, skills),
    insight: buildFallbackInsight(role),
    meta: {
      generated_at: new Date().toISOString(),
      model: model || getRoleSnapshotConfig().model,
      degraded: true,
      cache_status: 'fallback',
      fallback_reason: fallbackReason || 'generation_failed',
    },
  };
}

function getSchemaSnippet() {
  return '{"role":"string","definition":"string","summary":"string","countries":[{"name":"string","salary_estimate":"string","demand_level":"very-high|high|medium-high|medium|medium-low|low"}],"skills":{"core":["string"],"frequent":["string"],"bonus":["string"]},"projects":[{"title":"string","description":"string","tags":["string"]}],"insight":"string"}';
}

function buildRoleSnapshotPrompt({ role, countries, profile }) {
  return [
    'Return valid JSON only.',
    `Role: ${role}`,
    `Countries: ${countries.join(', ')}`,
    'Requirements:',
    '- Focus on one role only.',
    '- definition: one concise sentence.',
    '- summary: one to two sentences.',
    '- include every requested country exactly once.',
    '- use annual salary ranges in local currency.',
    '- demand_level must be one of: very-high, high, medium-high, medium, medium-low, low.',
    '- skills groups must stay short and useful.',
    '- projects: exactly 7 items, each with title, description, and 2-4 tags.',
    '- insight: one concise strategic note.',
    '- no markdown, no commentary, no code fences.',
    'User context:',
    buildUserContext(profile),
    `Schema: ${getSchemaSnippet()}`,
  ].join('\n');
}

function buildRepairPrompt(rawContent) {
  return [
    'Repair this into valid JSON only.',
    'Preserve the same meaning but remove invalid formatting.',
    `Schema: ${getSchemaSnippet()}`,
    'Text:',
    normalizeText(rawContent, { maxLength: 6000 }),
  ].join('\n');
}

function createOllamaClient() {
  const config = getRoleSnapshotConfig();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    headers,
  });
}

async function requestOllamaJson(prompt) {
  const config = getRoleSnapshotConfig();
  const client = createOllamaClient();

  const response = await client.post('/api/chat', {
    model: config.model,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.15,
      top_p: 0.9,
    },
    messages: [
      {
        role: 'system',
        content: 'You generate compact IT labor-market snapshots. Return JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = normalizeText(response?.data?.message?.content, {
    maxLength: 24_000,
  });

  if (!content) {
    throw new Error('Ollama returned an empty role snapshot response.');
  }

  return {
    content,
    model: normalizeText(response?.data?.model, { maxLength: 120 }) || config.model,
  };
}

function deriveSalaryMidpoint(estimate) {
  const text = normalizeText(estimate, { maxLength: 60 });
  if (!text) return null;

  const matches = text.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const values = matches
    .map((entry) => Number(entry.replace(',', '.')))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  if (values.length === 1) {
    return values[0];
  }

  return (values[0] + values[1]) / 2;
}

function applyDerivedSalaryScores(rows) {
  const midpoints = rows.map((row) => deriveSalaryMidpoint(row.salary_estimate));
  const validMidpoints = midpoints.filter((value) => Number.isFinite(value));

  if (validMidpoints.length === 0) {
    return rows;
  }

  const min = Math.min(...validMidpoints);
  const max = Math.max(...validMidpoints);

  return rows.map((row, index) => {
    if (row.salary_score > 0) {
      return row;
    }

    const midpoint = midpoints[index];
    if (!Number.isFinite(midpoint)) {
      return row;
    }

    const derivedScore =
      max === min
        ? 68
        : Math.round(40 + ((midpoint - min) / (max - min)) * 60);

    return {
      ...row,
      salary_score: clampNumber(derivedScore, 0, 100),
    };
  });
}

function normalizeCountryRows(value, requestedCountries) {
  const rawRows = Array.isArray(value) ? value : [];
  const byName = new Map();

  for (const item of rawRows) {
    if (!item || typeof item !== 'object') continue;

    const name = normalizeText(item.name, { maxLength: 40 });
    if (!name) continue;

    byName.set(name.toLowerCase(), {
      name,
      salary_estimate:
        normalizeText(item.salary_estimate, {
          maxLength: 40,
          fallback: 'Unavailable',
        }) || 'Unavailable',
      salary_score: clampNumber(item.salary_score, 0, 100),
      demand_level: normalizeDemandLevel(item.demand_level),
    });
  }

  const orderedRows = requestedCountries.map((country) => {
    return (
      byName.get(String(country).toLowerCase()) || {
        name: country,
        salary_estimate: 'Unavailable',
        salary_score: 0,
        demand_level: 'unknown',
      }
    );
  });

  return applyDerivedSalaryScores(orderedRows);
}

function normalizeSkills(rawSkills, requestedRole) {
  const fallbackSkills = buildFallbackSkills(requestedRole);
  const core = uniqueStrings(rawSkills?.core, MAX_SKILLS_PER_GROUP);
  const frequent = uniqueStrings(rawSkills?.frequent, MAX_SKILLS_PER_GROUP);
  const bonus = uniqueStrings(rawSkills?.bonus, MAX_SKILLS_PER_GROUP);

  return {
    skills: {
      core: core.length > 0 ? core : fallbackSkills.core,
      frequent: frequent.length > 0 ? frequent : fallbackSkills.frequent,
      bonus: bonus.length > 0 ? bonus : fallbackSkills.bonus,
    },
    supplemented: core.length === 0 || frequent.length === 0 || bonus.length === 0,
  };
}

function normalizeProjects(value, requestedRole, skills) {
  const projects = [];
  const seen = new Set();

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;

      const title = normalizeText(item.title, {
        maxLength: 56,
      });

      if (!title) continue;

      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      projects.push({
        title,
        description: normalizeText(item.description, {
          maxLength: 96,
          fallback: `Build a production-ready ${requestedRole.toLowerCase()} workflow with clear delivery value.`,
        }),
        tags: uniqueStrings(item.tags, MAX_PROJECT_TAGS),
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

  const fallbackProjects = buildFallbackProjects(requestedRole, skills);
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

function normalizeRoleSnapshot(raw, requestedRole, requestedCountries, model, metaOptions = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const normalizedRole =
    normalizeText(source.role, {
      fallback: requestedRole,
      maxLength: 80,
    }) || requestedRole;

  const skillsBundle = normalizeSkills(source.skills, normalizedRole);
  const projectsBundle = normalizeProjects(source.projects, normalizedRole, skillsBundle.skills);
  const definition = normalizeText(source.definition, {
    fallback: buildRoleDefinitionFallback(normalizedRole),
    maxLength: 150,
  });
  const summary = normalizeText(source.summary, {
    fallback: buildFallbackSummary(normalizedRole, requestedCountries),
    maxLength: 220,
  });
  const insight = normalizeText(source.insight, {
    fallback: buildFallbackInsight(normalizedRole),
    maxLength: 180,
  });

  const snapshot = {
    role: normalizedRole,
    definition,
    summary,
    countries: normalizeCountryRows(source.countries, requestedCountries),
    skills: skillsBundle.skills,
    projects: projectsBundle.projects,
    insight,
    meta: {
      generated_at: new Date().toISOString(),
      model,
      degraded: Boolean(metaOptions.degraded),
      cache_status: metaOptions.cacheStatus || 'miss',
      fallback_reason: metaOptions.fallbackReason || null,
    },
  };

  const missingSignals =
    !normalizeText(source.definition, { maxLength: 150 }) ||
    !normalizeText(source.summary, { maxLength: 220 }) ||
    !normalizeText(source.insight, { maxLength: 180 }) ||
    skillsBundle.supplemented ||
    projectsBundle.supplemented ||
    snapshot.countries.every((country) => country.salary_estimate === 'Unavailable');

  if (missingSignals) {
    snapshot.meta.degraded = true;
  }

  return snapshot;
}

function hasMeaningfulSnapshot(snapshot) {
  if (!snapshot) return false;

  const hasSalarySignals = snapshot.countries.some(
    (country) => country.salary_estimate !== 'Unavailable' || country.salary_score > 0
  );
  const hasSkills =
    snapshot.skills.core.length + snapshot.skills.frequent.length + snapshot.skills.bonus.length > 0;

  return (
    Boolean(snapshot.role) &&
    Boolean(snapshot.definition) &&
    Boolean(snapshot.summary) &&
    Boolean(snapshot.insight) &&
    snapshot.projects.length >= MIN_PROJECTS &&
    (hasSalarySignals || hasSkills)
  );
}

function cloneSnapshot(snapshot, cacheStatus) {
  const cloned = JSON.parse(JSON.stringify(snapshot));
  if (cloned?.meta && cacheStatus) {
    cloned.meta.cache_status = cacheStatus;
  }
  return cloned;
}

function buildCacheKey(userId, role, countries) {
  return [String(userId || 'anonymous').trim(), role.toLowerCase(), ...countries.map((country) => country.toLowerCase())].join('::');
}

function pruneCache() {
  const now = Date.now();

  for (const [key, entry] of SNAPSHOT_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      SNAPSHOT_CACHE.delete(key);
    }
  }

  if (SNAPSHOT_CACHE.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const keysByAge = [...SNAPSHOT_CACHE.entries()]
    .sort((left, right) => left[1].createdAt - right[1].createdAt)
    .map(([key]) => key);

  while (keysByAge.length > 0 && SNAPSHOT_CACHE.size > MAX_CACHE_ENTRIES) {
    SNAPSHOT_CACHE.delete(keysByAge.shift());
  }
}

function getCachedSnapshot(cacheKey) {
  const cached = SNAPSHOT_CACHE.get(cacheKey);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    SNAPSHOT_CACHE.delete(cacheKey);
    return null;
  }

  return cloneSnapshot(cached.snapshot, 'hit');
}

function setCachedSnapshot(cacheKey, snapshot) {
  pruneCache();

  SNAPSHOT_CACHE.set(cacheKey, {
    snapshot: cloneSnapshot(snapshot),
    createdAt: Date.now(),
    expiresAt:
      Date.now() + (snapshot?.meta?.degraded ? FALLBACK_CACHE_TTL_MS : SNAPSHOT_CACHE_TTL_MS),
  });
}

async function generateSnapshot(userId, role, countries) {
  const profile = await Profile.getFullProfile(userId).catch(() => null);
  const basePrompt = buildRoleSnapshotPrompt({ role, countries, profile });

  let rawPayload = null;
  let model = getRoleSnapshotConfig().model;
  let degraded = false;

  try {
    const result = await requestOllamaJson(basePrompt);
    rawPayload = parseJsonObject(result.content);
    model = result.model;

    if (!rawPayload) {
      degraded = true;
      const repaired = await requestOllamaJson(buildRepairPrompt(result.content));
      rawPayload = parseJsonObject(repaired.content);
      model = repaired.model || model;
    }
  } catch (error) {
    console.warn('[roleSnapshotService] Falling back after Ollama request failure:', error?.message || error);
    return createFallbackSnapshot(
      role,
      countries,
      model,
      error?.code === 'ECONNABORTED' ? 'timeout' : 'request_failed'
    );
  }

  if (!rawPayload) {
    return createFallbackSnapshot(role, countries, model, 'invalid_json');
  }

  const snapshot = normalizeRoleSnapshot(rawPayload, role, countries, model, {
    degraded,
    cacheStatus: 'miss',
  });

  if (!hasMeaningfulSnapshot(snapshot)) {
    return createFallbackSnapshot(role, countries, model, 'incomplete_snapshot');
  }

  return snapshot;
}

async function requestAiRoleSnapshot(userId, options = {}) {
  const role = normalizeText(options.role, { maxLength: 80 });
  const countries = uniqueStrings(options.countries, 8);

  if (!role) {
    const missingRoleError = new Error('Role is required to generate the AI role snapshot.');
    missingRoleError.statusCode = 400;
    throw missingRoleError;
  }

  if (countries.length < 4 || countries.length > 8) {
    const countryError = new Error('Select between 4 and 8 countries for the AI role snapshot.');
    countryError.statusCode = 400;
    throw countryError;
  }

  const cacheKey = buildCacheKey(userId, role, countries);
  const cachedSnapshot = getCachedSnapshot(cacheKey);
  if (cachedSnapshot) {
    return cachedSnapshot;
  }

  if (INFLIGHT_REQUESTS.has(cacheKey)) {
    return INFLIGHT_REQUESTS.get(cacheKey);
  }

  const generationPromise = generateSnapshot(userId, role, countries)
    .then((snapshot) => {
      setCachedSnapshot(cacheKey, snapshot);
      return cloneSnapshot(snapshot, snapshot?.meta?.cache_status || 'miss');
    })
    .finally(() => {
      INFLIGHT_REQUESTS.delete(cacheKey);
    });

  INFLIGHT_REQUESTS.set(cacheKey, generationPromise);

  return generationPromise;
}

module.exports = {
  requestAiRoleSnapshot,
};
