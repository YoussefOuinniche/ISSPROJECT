const { Profile } = require('../models');
const { getUserDashboardSnapshot } = require('./dashboardService');

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

async function postAi(path, payload) {
  const { baseUrl, token, timeoutMs } = getAiConfig();
  if (!baseUrl) {
    throw new Error('AI service is not configured: AI_SERVICE_URL is missing');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-ai-service-token': token } : {}),
      },
      body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.detail || body?.message || `AI endpoint ${path} failed with ${response.status}`;
      const error = new Error(detail);
      error.statusCode = response.status;
      throw error;
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestAiSkillGapAnalysis(userId, targetRole) {
  return postAi('/analyze-skill-gaps', {
    user_id: userId,
    ...(targetRole ? { target_role: targetRole } : {}),
  });
}

async function requestAiRoadmap(userId, options = {}) {
  const timeframeMonths = Number.isFinite(options.timeframeMonths)
    ? Math.max(1, Math.min(24, Number(options.timeframeMonths)))
    : 6;

  return postAi('/generate-roadmap', {
    user_id: userId,
    timeframe_months: timeframeMonths,
    ...(options.targetRole ? { target_role: options.targetRole } : {}),
  });
}

async function requestAiRecommendations(userId, count = 8) {
  const safeCount = Number.isFinite(count) ? Math.max(1, Math.min(20, Number(count))) : 8;
  return postAi('/recommend', {
    user_id: userId,
    count: safeCount,
  });
}

async function requestAiCareerAdvice(question, userId) {
  return postAi('/career-advice', {
    question,
    ...(userId ? { user_id: userId } : {}),
  });
}

async function requestAiJobDescription(role, perSourceLimit = 5) {
  const safePerSourceLimit = Number.isFinite(perSourceLimit)
    ? Math.max(1, Math.min(10, Number(perSourceLimit)))
    : 5;

  return postAi('/generate-job-description', {
    role,
    per_source_limit: safePerSourceLimit,
  });
}

async function recomputeUserAnalysis(userId, options = {}) {
  const profile = await Profile.findByUserId(userId);
  const targetRole = options.targetRole || profile?.title || profile?.domain || null;

  const ai = {
    skillGapRefresh: { status: 'skipped', detail: 'No target role available' },
    recommendationsRefresh: { status: 'skipped' },
  };

  if (targetRole) {
    try {
      await requestAiSkillGapAnalysis(userId, targetRole);
      ai.skillGapRefresh = { status: 'ok', targetRole };
    } catch (error) {
      ai.skillGapRefresh = { status: 'failed', detail: error.message, targetRole };
    }
  }

  try {
    await requestAiRecommendations(userId, 8);
    ai.recommendationsRefresh = { status: 'ok' };
  } catch (error) {
    ai.recommendationsRefresh = { status: 'failed', detail: error.message };
  }

  try {
    await Profile.updateLastAnalysis(userId);
  } catch (_error) {
    // Non-blocking: analysis artifacts may still have been persisted.
  }

  const dashboard = await getUserDashboardSnapshot(userId, {
    recentRecommendationDays: 7,
    recentRecommendationLimit: 8,
  });
  return {
    dashboard,
    analysis: {
      generatedAt: new Date().toISOString(),
      targetRole,
      ai,
    },
  };
}

module.exports = {
  recomputeUserAnalysis,
  requestAiSkillGapAnalysis,
  requestAiRoadmap,
  requestAiRecommendations,
  requestAiCareerAdvice,
  requestAiJobDescription,
};
