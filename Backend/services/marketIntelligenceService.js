const axios = require('axios');
const { Profile } = require('../models');

const STALE_AFTER_HOURS = 24;
const DEFAULT_LIMIT = 50;

const MARKET_QUERY_PATTERNS = [
  /\btrending\b/i,
  /\bin\s+demand\b/i,
  /\bmarket\b/i,
  /\bdemand\b/i,
  /\bwhat\s+skills\s+.*\b(?:learn|next)\b/i,
  /\bwhat\s+should\s+i\s+learn\s+next\b/i,
  /\bfor\s+.*\bengineer\b/i,
];

function normalizeRole(role) {
  return String(role || '').trim().replace(/\s+/g, ' ');
}

function getAiConfig() {
  const baseUrl = (process.env.AI_SERVICE_URL || '').trim().replace(/\/$/, '');
  const token = (process.env.AI_SERVICE_TOKEN || '').trim();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 15000);

  return {
    baseUrl,
    token,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 15000,
  };
}

function createAiClient() {
  const { baseUrl, token, timeoutMs } = getAiConfig();
  if (!baseUrl) {
    throw new Error('AI service is not configured: AI_SERVICE_URL is missing');
  }

  return axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-ai-service-token': token } : {}),
    },
  });
}

async function getAi(path, params) {
  const client = createAiClient();
  try {
    const response = await client.get(path, { params });
    return response.data;
  } catch (error) {
    if (error.response) {
      const detail =
        error.response.data?.detail ||
        error.response.data?.message ||
        `AI endpoint ${path} failed with ${error.response.status}`;
      const responseError = new Error(detail);
      responseError.statusCode = error.response.status;
      throw responseError;
    }

    const networkError = new Error(error.message || `AI endpoint ${path} failed`);
    networkError.statusCode = error.statusCode || 502;
    throw networkError;
  }
}

async function postAi(path, payload) {
  const client = createAiClient();
  try {
    const response = await client.post(path, payload);
    return response.data;
  } catch (error) {
    if (error.response) {
      const detail =
        error.response.data?.detail ||
        error.response.data?.message ||
        `AI endpoint ${path} failed with ${error.response.status}`;
      const responseError = new Error(detail);
      responseError.statusCode = error.response.status;
      throw responseError;
    }

    const networkError = new Error(error.message || `AI endpoint ${path} failed`);
    networkError.statusCode = error.statusCode || 502;
    throw networkError;
  }
}

function resolvePreferredTargetRole(profile, storedAiProfile, requestedRole = null) {
  const requested = normalizeRole(requestedRole);
  if (requested) return requested;

  const explicit = normalizeRole(profile?.explicit_target_role);
  if (explicit) return explicit;

  const fromBio = extractTargetRoleFromText(profile?.bio);
  if (fromBio) return fromBio;

  const aiTarget = normalizeRole(storedAiProfile?.target_role || storedAiProfile?.skill_gap_analysis?.target_role);
  if (aiTarget) return aiTarget;

  const goals = Array.isArray(storedAiProfile?.goals) ? storedAiProfile.goals : [];
  return normalizeRole(goals[0] || null) || null;
}

function extractTargetRoleFromText(text) {
  const raw = String(text || '');
  if (!raw) return null;

  const direct = raw.match(/Target\s*Role\s*:\s*([^\n\r]+)/i);
  if (direct && direct[1]) {
    return normalizeRole(direct[1]);
  }

  const alt = raw.match(/goal\s+is\s+to\s+be(?:come)?\s+([^\n\r.,!?;]+)/i);
  if (alt && alt[1]) {
    return normalizeRole(alt[1]);
  }

  return null;
}

function isMarketRelatedQuery(message) {
  const content = String(message || '').trim();
  if (!content) return false;
  return MARKET_QUERY_PATTERNS.some((pattern) => pattern.test(content));
}

function buildMarketSummary(trends, limit = 3) {
  const rows = Array.isArray(trends) ? trends : [];
  return rows
    .slice(0, Math.max(1, Math.min(limit, 10)))
    .map((row) => ({
      skill: String(row.skill || '').trim(),
      frequency: Number(row.frequency || 0),
      category: String(row.category || 'tooling').trim() || 'tooling',
    }))
    .filter((row) => row.skill);
}

function resolveCachePathLabel(data) {
  if (data?.background_refresh_triggered) {
    return 'cached_stale_background_refresh';
  }
  if (data?.stale) {
    return 'cached_stale_no_refresh';
  }
  return 'cached_fresh';
}

async function getRoleMarketTrends(role, options = {}) {
  const cleanRole = normalizeRole(role);
  if (!cleanRole) {
    return {
      success: false,
      role: '',
      count: 0,
      stale: true,
      stale_after_hours: STALE_AFTER_HOURS,
      latest_updated_at: null,
      background_refresh_triggered: false,
      trends: [],
    };
  }

  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.min(500, Number(options.limit)))
    : DEFAULT_LIMIT;

  const refreshIfStale = options.refreshIfStale !== false;

  return getAi(`/trends/role/${encodeURIComponent(cleanRole)}`, {
    limit,
    refresh_if_stale: refreshIfStale ? '1' : '0',
  });
}

async function getGlobalMarketTrends(options = {}) {
  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.min(500, Number(options.limit)))
    : DEFAULT_LIMIT;

  return getAi('/trends/global', { limit });
}

async function refreshMarketTrendsForRole(role, options = {}) {
  const cleanRole = normalizeRole(role);
  if (!cleanRole) {
    const error = new Error('Role is required to refresh trends.');
    error.statusCode = 400;
    throw error;
  }

  const searchLimit = Number.isFinite(Number(options.searchLimit))
    ? Math.max(1, Math.min(100, Number(options.searchLimit)))
    : 20;

  return postAi('/trends/refresh', {
    role: cleanRole,
    search_limit: searchLimit,
  });
}

async function runScheduledMarketRefresh(roles, options = {}) {
  const list = Array.isArray(roles) ? roles.map((item) => normalizeRole(item)).filter(Boolean) : [];
  if (list.length === 0) {
    return {
      success: false,
      roles: [],
      error: 'No roles provided for scheduled market refresh.',
    };
  }

  const searchLimit = Number.isFinite(Number(options.searchLimit))
    ? Math.max(1, Math.min(100, Number(options.searchLimit)))
    : 20;

  return postAi('/trends/refresh', {
    roles: list,
    search_limit: searchLimit,
  });
}

async function getRoleMarketTrendsForUser(userId, options = {}) {
  const [profile, storedAiProfile] = await Promise.all([
    Profile.getFullProfile(userId).catch(() => null),
    Profile.getStoredAiProfile(userId).catch(() => ({})),
  ]);

  const role = resolvePreferredTargetRole(profile, storedAiProfile, options.role || null);
  const refreshIfStale = options.refreshIfStale !== false;
  if (!role) {
    console.info('[MarketIntel] role trends skipped: target role unavailable', {
      userId,
      requestedRole: normalizeRole(options.role || null) || null,
      resolvedRole: null,
      refreshIfStale,
      cachePath: 'no_role',
      trendCount: 0,
    });
    return {
      success: true,
      role: null,
      count: 0,
      stale: true,
      stale_after_hours: STALE_AFTER_HOURS,
      latest_updated_at: null,
      background_refresh_triggered: false,
      trends: [],
      summary: [],
    };
  }

  const data = await getRoleMarketTrends(role, {
    limit: options.limit,
    refreshIfStale,
  });

  const trendCount = Array.isArray(data?.trends) ? data.trends.length : 0;
  console.info('[MarketIntel] role trends fetched', {
    userId,
    requestedRole: normalizeRole(options.role || null) || null,
    resolvedRole: role,
    refreshIfStale,
    cachePath: resolveCachePathLabel(data),
    trendCount,
  });

  return {
    ...data,
    role,
    summary: buildMarketSummary(data?.trends, options.summaryLimit || 3),
  };
}

module.exports = {
  STALE_AFTER_HOURS,
  buildMarketSummary,
  extractTargetRoleFromText,
  getGlobalMarketTrends,
  getRoleMarketTrends,
  getRoleMarketTrendsForUser,
  isMarketRelatedQuery,
  refreshMarketTrendsForRole,
  resolvePreferredTargetRole,
  runScheduledMarketRefresh,
};
