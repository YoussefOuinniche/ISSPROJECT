/**
 * Curated external sources approved for trend ingestion.
 *
 * This module is intentionally static:
 * - production ingestion should use an approved source registry
 * - RSS is preferred because feed formats are more stable than raw HTML
 * - helper exports keep selection logic centralized for future workers
 */

/**
 * @typedef {'rss' | 'html'} TrendSourceType
 */

/**
 * @typedef {Object} TrendSource
 * @property {string} name
 * @property {TrendSourceType} type
 * @property {string} url
 * @property {string} homepage
 * @property {string} defaultDomain
 * @property {number} priority
 * @property {boolean} enabled
 * @property {string[]} tags
 * @property {string} notes
 */

const TREND_SOURCE_TYPES = Object.freeze({
  RSS: 'rss',
  HTML: 'html',
});

const PRIMARY_SOURCE_PRIORITY = 1;

/**
 * Build an immutable source record so ingestion code cannot mutate the base config.
 *
 * @param {TrendSource} source
 * @returns {Readonly<TrendSource>}
 */
function defineTrendSource(source) {
  return Object.freeze({
    ...source,
    tags: Object.freeze([...(source.tags || [])]),
  });
}

/**
 * @param {TrendSource[]} sources
 * @returns {TrendSource[]}
 */
function sortTrendSources(sources) {
  return [...sources].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.name.localeCompare(right.name);
  });
}

/**
 * Return a mutable copy for callers that want to enrich records at runtime.
 *
 * @param {TrendSource} source
 * @returns {TrendSource}
 */
function cloneTrendSource(source) {
  return {
    ...source,
    tags: [...source.tags],
  };
}

/** @type {ReadonlyArray<Readonly<TrendSource>>} */
const trendSources = Object.freeze([
  // InfoQ is a high-signal engineering publication with reliable coverage of
  // architecture, cloud platforms, AI engineering, and software delivery.
  defineTrendSource({
    name: 'InfoQ',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://www.infoq.com/feed/',
    homepage: 'https://www.infoq.com/',
    defaultDomain: 'Software Engineering',
    priority: 1,
    enabled: true,
    tags: ['architecture', 'devops', 'cloud', 'ai', 'engineering'],
    notes: 'Primary engineering source with strong editorial quality and consistent RSS coverage.',
  }),

  // AWS News Blog captures platform-level releases that often become immediate
  // cloud and infrastructure trends relevant to backend and DevOps teams.
  defineTrendSource({
    name: 'AWS News Blog',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://aws.amazon.com/blogs/aws/feed/',
    homepage: 'https://aws.amazon.com/blogs/aws/',
    defaultDomain: 'Cloud',
    priority: 1,
    enabled: true,
    tags: ['cloud', 'devops', 'infrastructure', 'aws'],
    notes: 'Primary cloud vendor feed for new AWS services, launches, and infrastructure updates.',
  }),

  // Google Cloud Blog complements AWS coverage and helps the pipeline capture
  // cross-vendor cloud, AI, data, and platform movement without web scraping.
  defineTrendSource({
    name: 'Google Cloud Blog',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://cloud.google.com/blog/rss/',
    homepage: 'https://cloud.google.com/blog',
    defaultDomain: 'Cloud',
    priority: 1,
    enabled: true,
    tags: ['cloud', 'ai', 'infrastructure', 'google-cloud'],
    notes: 'Primary cloud vendor feed for GCP platform, data, and AI ecosystem changes.',
  }),

  // CNCF Blog is a strong source for Kubernetes, cloud-native operations, and
  // ecosystem shifts that matter to platform engineering and DevOps roadmaps.
  defineTrendSource({
    name: 'CNCF Blog',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://www.cncf.io/blog/feed/',
    homepage: 'https://www.cncf.io/blog/',
    defaultDomain: 'DevOps',
    priority: 1,
    enabled: true,
    tags: ['kubernetes', 'cloud-native', 'devops', 'containers'],
    notes: 'Primary cloud-native source for Kubernetes, platform tooling, and operations trends.',
  }),

  // TechCrunch adds broader market and startup momentum so the ingestion layer
  // can mix engineering signals with commercial technology movement.
  defineTrendSource({
    name: 'TechCrunch',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://techcrunch.com/feed/',
    homepage: 'https://techcrunch.com/',
    defaultDomain: 'Tech',
    priority: 2,
    enabled: true,
    tags: ['startups', 'ai', 'product', 'market'],
    notes: 'Secondary technology news source for startup, product, and funding-driven trend context.',
  }),

  // The Verge contributes mainstream platform and consumer technology coverage
  // that can surface ecosystem shifts earlier than enterprise-only outlets.
  defineTrendSource({
    name: 'The Verge',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://www.theverge.com/rss/index.xml',
    homepage: 'https://www.theverge.com/',
    defaultDomain: 'Tech',
    priority: 2,
    enabled: true,
    tags: ['consumer-tech', 'ai', 'platforms', 'market'],
    notes: 'Secondary broad tech source for platform shifts, AI launches, and market-facing product movement.',
  }),

  // Hacker News front page adds community-driven discovery around tools,
  // engineering discussions, and emerging products that may not yet be formal news.
  defineTrendSource({
    name: 'Hacker News front page',
    type: TREND_SOURCE_TYPES.RSS,
    url: 'https://hnrss.org/frontpage',
    homepage: 'https://news.ycombinator.com/',
    defaultDomain: 'General Tech',
    priority: 2,
    enabled: true,
    tags: ['engineering', 'startups', 'tools', 'discussion'],
    notes: 'Secondary community signal source for emerging tools, engineering debates, and startup interest.',
  }),
]);

/**
 * Return all approved sources, sorted for deterministic ingestion.
 *
 * @returns {TrendSource[]}
 */
function getAllTrendSources() {
  return sortTrendSources(trendSources).map(cloneTrendSource);
}

/**
 * Return only sources currently enabled for ingestion.
 *
 * @returns {TrendSource[]}
 */
function getEnabledTrendSources() {
  return sortTrendSources(
    trendSources.filter((source) => source.enabled)
  ).map(cloneTrendSource);
}

/**
 * Return the highest-priority approved sources for primary ingestion runs.
 *
 * @returns {TrendSource[]}
 */
function getPrimaryTrendSources() {
  return sortTrendSources(
    trendSources.filter(
      (source) => source.enabled && source.priority <= PRIMARY_SOURCE_PRIORITY
    )
  ).map(cloneTrendSource);
}

module.exports = {
  TREND_SOURCE_TYPES,
  PRIMARY_SOURCE_PRIORITY,
  trendSources,
  getAllTrendSources,
  getEnabledTrendSources,
  getPrimaryTrendSources,
};
