const {
  getEnabledTrendSources,
  getPrimaryTrendSources,
} = require('../config/trendSources');
const { Trend } = require('../models');
const { fetchRssFeed } = require('./trendsIngestion/adapters/rssFeedAdapter');
const { fetchHtmlSource } = require('./trendsIngestion/adapters/htmlSourceAdapter');
const { dedupeTrendItems } = require('./trendsIngestion/deduplication');
const { normalizeTrendItem } = require('./trendsIngestion/normalization');

const DEFAULT_ITEMS_PER_SOURCE = 25;

function resolveItemsPerSource(value) {
  if (!Number.isFinite(Number(value))) {
    return DEFAULT_ITEMS_PER_SOURCE;
  }

  return Math.max(1, Math.min(100, Number(value)));
}

function resolveSelectedSources(options = {}) {
  if (options.primaryOnly) {
    return getPrimaryTrendSources();
  }

  return getEnabledTrendSources();
}

function getSourceAdapter(sourceType) {
  if (sourceType === 'rss') {
    return fetchRssFeed;
  }

  if (sourceType === 'html') {
    return fetchHtmlSource;
  }

  const error = new Error(`Unsupported trend source type: ${sourceType}`);
  error.code = 'UNSUPPORTED_TREND_SOURCE_TYPE';
  throw error;
}

function toErrorMessage(error) {
  return String(error?.message || error || 'Unknown ingestion error').trim();
}

async function ingestSource(source, options = {}) {
  const limit = resolveItemsPerSource(options.limitPerSource);
  const adapter = getSourceAdapter(source.type);
  const scrapedAt = String(options.scrapedAt || new Date().toISOString());

  console.info('[TrendsIngestion] fetching source', {
    sourceName: source.name,
    type: source.type,
    url: source.url,
    limit,
  });

  const { feed, items } = await adapter(source, { limit });
  const normalizedItems = [];
  let skippedCount = 0;

  for (const item of items) {
    const normalized = normalizeTrendItem(item, source, { scrapedAt });
    if (!normalized) {
      skippedCount += 1;
      continue;
    }

    normalizedItems.push(normalized);
  }

  console.info('[TrendsIngestion] source fetch complete', {
    sourceName: source.name,
    feedTitle: String(feed?.title || '').trim() || null,
    fetchedCount: items.length,
    normalizedCount: normalizedItems.length,
    skippedCount,
  });

  return {
    source: {
      name: source.name,
      type: source.type,
      url: source.url,
      homepage: source.homepage,
      priority: source.priority,
    },
    fetchedCount: items.length,
    normalizedCount: normalizedItems.length,
    skippedCount,
    items: normalizedItems,
  };
}

async function ingestTrendSources(options = {}) {
  const startedAt = new Date().toISOString();
  const sources = resolveSelectedSources(options);
  const limitPerSource = resolveItemsPerSource(options.limitPerSource);
  const sourceResults = [];
  const sourceLevelErrors = [];
  const normalizedItems = [];

  if (sources.length === 0) {
    return {
      success: true,
      startedAt,
      completedAt: new Date().toISOString(),
      sourcesChecked: 0,
      totalFetched: 0,
      normalizedItemsCount: 0,
      deduplicatedItemsCount: 0,
      duplicateCount: 0,
      sourceResults: [],
      sourceLevelErrors: [],
      items: [],
    };
  }

  for (const source of sources) {
    try {
      const result = await ingestSource(source, {
        limitPerSource,
        scrapedAt: startedAt,
      });

      sourceResults.push({
        sourceName: result.source.name,
        sourceType: result.source.type,
        sourceUrl: result.source.url,
        homepage: result.source.homepage,
        priority: result.source.priority,
        fetchedCount: result.fetchedCount,
        normalizedCount: result.normalizedCount,
        skippedCount: result.skippedCount,
        status: 'ok',
        error: null,
      });

      normalizedItems.push(...result.items);
    } catch (error) {
      const message = toErrorMessage(error);
      console.error('[TrendsIngestion] source fetch failed', {
        sourceName: source.name,
        type: source.type,
        url: source.url,
        error: message,
      });

      sourceResults.push({
        sourceName: source.name,
        sourceType: source.type,
        sourceUrl: source.url,
        homepage: source.homepage,
        priority: source.priority,
        fetchedCount: 0,
        normalizedCount: 0,
        skippedCount: 0,
        status: 'failed',
        error: message,
      });

      sourceLevelErrors.push({
        sourceName: source.name,
        sourceType: source.type,
        sourceUrl: source.url,
        message,
      });
    }
  }

  const deduped = dedupeTrendItems(normalizedItems);
  const completedAt = new Date().toISOString();
  const totalFetched = sourceResults.reduce((sum, entry) => sum + Number(entry.fetchedCount || 0), 0);
  const sourcesSucceeded = sourceResults.filter((entry) => entry.status === 'ok').length;

  console.info('[TrendsIngestion] batch complete', {
    sourcesChecked: sources.length,
    sourcesSucceeded,
    sourcesFailed: sourceLevelErrors.length,
    totalFetched,
    normalizedItemsCount: normalizedItems.length,
    deduplicatedItemsCount: deduped.items.length,
    duplicateCount: deduped.duplicateCount,
  });

  return {
    success: sourceLevelErrors.length === 0,
    partialSuccess: sourceLevelErrors.length > 0 && sourcesSucceeded > 0,
    startedAt,
    completedAt,
    sourcesChecked: sources.length,
    sourcesSucceeded,
    sourcesFailed: sourceLevelErrors.length,
    totalFetched,
    normalizedItemsCount: normalizedItems.length,
    deduplicatedItemsCount: deduped.items.length,
    duplicateCount: deduped.duplicateCount,
    sourceResults,
    sourceLevelErrors,
    items: deduped.items,
  };
}

async function ingestAndUpsertTrendSources(options = {}) {
  const ingestionResult = await ingestTrendSources(options);

  let persistence = {
    success: true,
    scrapedAt: new Date().toISOString(),
    receivedCount: 0,
    deduplicatedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateInputCount: 0,
    failedRowCount: 0,
    invalidRows: [],
    failedRows: [],
  };

  if (ingestionResult.items.length > 0) {
    try {
      persistence = await Trend.upsertTrends(ingestionResult.items);
    } catch (error) {
      console.error('[TrendsIngestion] database upsert failed', {
        message: error.message,
      });
      throw new Error(`Trend ingestion persistence failed: ${error.message}`);
    }
  } else {
    console.info('[TrendsIngestion] no normalized items available for database upsert');
  }

  console.info('[TrendsIngestion] persistence complete', {
    insertedCount: persistence.insertedCount,
    updatedCount: persistence.updatedCount,
    skippedCount: persistence.skippedCount,
    duplicateInputCount: persistence.duplicateInputCount,
    failedRowCount: persistence.failedRowCount,
  });

  return {
    ...ingestionResult,
    persistence,
    success: ingestionResult.success && persistence.success,
    partialSuccess:
      ingestionResult.partialSuccess ||
      (persistence.failedRowCount > 0 &&
        persistence.insertedCount + persistence.updatedCount > 0),
  };
}

module.exports = {
  DEFAULT_ITEMS_PER_SOURCE,
  ingestSource,
  ingestTrendSources,
  ingestAndUpsertTrendSources,
};
