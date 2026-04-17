const ALLOWED_TREND_DOMAINS = Object.freeze([
  'AI/ML',
  'Web Development',
  'DevOps',
  'Security',
  'Data Science',
  'Cloud',
  'Software Engineering',
  'Tech',
  'General Tech',
]);

const DOMAIN_KEYWORDS = Object.freeze({
  'AI/ML': [
    'ai',
    'artificial intelligence',
    'machine learning',
    'deep learning',
    'neural network',
    'neural nets',
    'llm',
    'large language model',
    'generative ai',
    'genai',
    'agentic',
    'rag',
    'inference',
    'prompt engineering',
    'fine tuning',
    'fine-tuning',
    'model training',
  ],
  'Web Development': [
    'frontend',
    'front-end',
    'backend',
    'back-end',
    'full stack',
    'full-stack',
    'javascript',
    'typescript',
    'react',
    'next.js',
    'node.js',
    'nodejs',
    'api',
    'graphql',
    'rest',
    'web app',
    'web development',
    'css',
    'html',
    'browser',
  ],
  DevOps: [
    'devops',
    'kubernetes',
    'k8s',
    'container',
    'containers',
    'docker',
    'ci/cd',
    'ci cd',
    'deployment',
    'platform engineering',
    'platform ops',
    'sre',
    'site reliability',
    'observability',
    'terraform',
    'infrastructure as code',
    'iac',
    'cloud-native',
  ],
  Security: [
    'security',
    'cybersecurity',
    'cyber security',
    'zero trust',
    'authentication',
    'authorization',
    'identity',
    'vulnerability',
    'threat',
    'ransomware',
    'encryption',
    'iam',
    'compliance',
    'attack',
    'breach',
    'malware',
  ],
  'Data Science': [
    'data science',
    'analytics',
    'data engineering',
    'data pipeline',
    'etl',
    'elt',
    'sql',
    'postgres',
    'postgresql',
    'warehouse',
    'lakehouse',
    'bigquery',
    'snowflake',
    'spark',
    'databricks',
    'flink',
    'kafka',
    'business intelligence',
  ],
  Cloud: [
    'cloud',
    'aws',
    'amazon web services',
    'google cloud',
    'gcp',
    'azure',
    'serverless',
    'lambda',
    'cloud run',
    'compute',
    'storage',
    'multi-cloud',
    'finops',
    'infrastructure',
  ],
  'Software Engineering': [
    'software engineering',
    'architecture',
    'system design',
    'distributed systems',
    'microservices',
    'engineering',
    'testing',
    'developer productivity',
    'refactoring',
    'code quality',
    'runtime',
    'framework',
    'performance',
    'release engineering',
  ],
  Tech: [
    'startup',
    'startups',
    'product',
    'funding',
    'acquisition',
    'launch',
    'consumer tech',
    'devices',
    'platform',
    'market',
    'marketplace',
    'tech industry',
  ],
  'General Tech': [
    'developer',
    'tooling',
    'tools',
    'open source',
    'oss',
    'community',
    'discussion',
    'hn',
    'technology',
    'tech',
  ],
});

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+/.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCategoryList(categories) {
  if (Array.isArray(categories)) {
    return categories
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  const single = String(categories || '').trim();
  return single ? [single] : [];
}

function addKeywordScores(scores, text, weight) {
  if (!text) return;

  Object.entries(DOMAIN_KEYWORDS).forEach(([domain, keywords]) => {
    keywords.forEach((keyword) => {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = /[a-z0-9]/i.test(keyword)
        ? new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i')
        : new RegExp(escapedKeyword, 'i');

      if (pattern.test(text)) {
        scores[domain] += weight;
      }
    });
  });
}

function createDomainScoreMap() {
  return ALLOWED_TREND_DOMAINS.reduce((accumulator, domain) => {
    accumulator[domain] = 0;
    return accumulator;
  }, {});
}

function pickBestDomain(scores) {
  let selectedDomain = 'General Tech';
  let selectedScore = 0;

  ALLOWED_TREND_DOMAINS.forEach((domain) => {
    const score = Number(scores[domain] || 0);
    if (score > selectedScore) {
      selectedDomain = domain;
      selectedScore = score;
    }
  });

  return {
    domain: selectedDomain,
    score: selectedScore,
  };
}

function resolveSourceFallbackDomain(source) {
  const defaultDomain = String(source?.defaultDomain || '').trim();
  if (ALLOWED_TREND_DOMAINS.includes(defaultDomain)) {
    return defaultDomain;
  }

  return 'General Tech';
}

function inferTrendDomain({ title, description, categories, source }) {
  const scores = createDomainScoreMap();
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const normalizedCategories = normalizeCategoryList(categories).map(normalizeText);

  normalizedCategories.forEach((category) => addKeywordScores(scores, category, 6));
  addKeywordScores(scores, normalizedTitle, 5);
  addKeywordScores(scores, normalizedDescription, 3);

  const best = pickBestDomain(scores);
  if (best.score > 0) {
    return best.domain;
  }

  return resolveSourceFallbackDomain(source);
}

module.exports = {
  ALLOWED_TREND_DOMAINS,
  inferTrendDomain,
  normalizeCategoryList,
};
