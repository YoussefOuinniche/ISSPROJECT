const axios = require('axios');
const { ChatHistory, Profile, Skill, UserSkill, SkillGap, Recommendation } = require('../models');
const { getUserDashboardSnapshot } = require('./dashboardService');
const { buildAiContextProfile } = require('./aiProfileService');
const { ensureLocalAiRuntime } = require('./aiRuntimeService');
const {
  getRoleMarketTrendsForUser,
  isMarketRelatedQuery,
} = require('./marketIntelligenceService');
const {
  analyzeUserMarketPersonalization,
} = require('./marketPersonalizationService');

const CHAT_FALLBACK_RESPONSE =
  'The AI assistant is temporarily unavailable. Please try again in a moment.';

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeConversationSummary(value) {
  if (!value || typeof value !== 'object') {
    return {
      skills_mentioned: [],
      goals_mentioned: [],
    };
  }

  return {
    skills_mentioned: normalizeStringArray(value.skills_mentioned),
    goals_mentioned: normalizeStringArray(value.goals_mentioned),
  };
}

function normalizeSkillLevel(value) {
  const level = String(value || '').trim().toLowerCase();
  if (['beginner', 'intermediate', 'advanced', 'expert'].includes(level)) {
    return level;
  }
  return 'beginner';
}

function normalizePriority(value) {
  const priority = String(value || '').trim().toLowerCase();
  if (['high', 'medium', 'low'].includes(priority)) {
    return priority;
  }
  return 'medium';
}

function normalizeGapSeverity(value) {
  const severity = String(value || '').trim().toLowerCase();
  if (['critical', 'moderate', 'minor'].includes(severity)) {
    return severity;
  }
  return 'moderate';
}

function uniqueStrings(values) {
  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const normalized = [];
  for (const value of values) {
    const text = String(value || '').trim();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(text);
  }
  return normalized;
}

function resolvePreferredTargetRole(requestedTargetRole, profile, storedAiProfile) {
  const requested = String(requestedTargetRole || '').trim();
  if (requested) return requested;

  const explicit = String(profile?.explicit_target_role || '').trim();
  if (explicit) return explicit;

  const aiTarget = String(
    storedAiProfile?.skill_gap_analysis?.target_role ||
      storedAiProfile?.target_role ||
      ''
  ).trim();
  if (aiTarget) return aiTarget;

  const goals = Array.isArray(storedAiProfile?.goals) ? storedAiProfile.goals : [];
  return String(goals[0] || '').trim() || null;
}

function normalizeStructuredSkillGapAnalysis(value, fallbackTargetRole) {
  const payload = value && typeof value === 'object' ? value : {};
  const normalizeStrength = (item) => {
    if (!item || typeof item !== 'object') return null;
    const skill = String(item.skill || item.skill_name || '').trim();
    if (!skill) return null;
    return {
      skill,
      current_level: normalizeSkillLevel(item.current_level || item.currentLevel || item.level),
      target_level: normalizeSkillLevel(item.target_level || item.targetLevel || 'intermediate'),
      why_it_matters: String(item.why_it_matters || item.reason || '').trim(),
      category: String(item.category || 'General').trim() || 'General',
    };
  };

  const normalizeGap = (item) => {
    if (!item || typeof item !== 'object') return null;
    const skill = String(item.skill || item.skill_name || '').trim();
    if (!skill) return null;
    return {
      skill,
      current_level: item.current_level || item.currentLevel
        ? normalizeSkillLevel(item.current_level || item.currentLevel)
        : null,
      target_level: normalizeSkillLevel(item.target_level || item.targetLevel || 'intermediate'),
      priority: normalizePriority(item.priority || item.importance),
      gap_severity: normalizeGapSeverity(item.gap_severity || item.gapSeverity),
      why_it_matters: String(item.why_it_matters || item.reason || '').trim(),
      category: String(item.category || 'General').trim() || 'General',
    };
  };

  const normalizeRecommendation = (item) => {
    if (!item || typeof item !== 'object') return null;
    const title = String(item.title || '').trim();
    const action = String(item.action || item.content || '').trim();
    const reason = String(item.reason || '').trim();
    if (!title && !action) return null;
    return {
      title: title || action,
      priority: normalizePriority(item.priority),
      action,
      reason,
    };
  };

  return {
    target_role: String(payload.target_role || fallbackTargetRole || '').trim() || null,
    strengths: Array.isArray(payload.strengths) ? payload.strengths.map(normalizeStrength).filter(Boolean) : [],
    missing_skills: Array.isArray(payload.missing_skills) ? payload.missing_skills.map(normalizeGap).filter(Boolean) : [],
    partial_gaps: Array.isArray(payload.partial_gaps) ? payload.partial_gaps.map(normalizeGap).filter(Boolean) : [],
    recommendations: Array.isArray(payload.recommendations)
      ? payload.recommendations.map(normalizeRecommendation).filter(Boolean)
      : [],
    meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {},
  };
}

function flattenStructuredSkillGapAnalysis(analysis) {
  if (!analysis || typeof analysis !== 'object') return [];

  const toRow = (item) => ({
    domain: item.category || 'General',
    skillName: item.skill,
    gapLevel: item.priority === 'high' ? 5 : item.priority === 'medium' ? 3 : 2,
    reason: item.why_it_matters || '',
    priority: item.priority,
    gapSeverity: item.gap_severity,
    currentLevel: item.current_level || null,
    targetLevel: item.target_level || null,
  });

  return [
    ...(Array.isArray(analysis.missing_skills) ? analysis.missing_skills.map(toRow) : []),
    ...(Array.isArray(analysis.partial_gaps) ? analysis.partial_gaps.map(toRow) : []),
  ];
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

function isRetryableAiConnectionError(error) {
  const code = String(error?.code || '').trim().toUpperCase();
  const message = String(error?.message || '').trim().toUpperCase();

  return (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    message.includes('ECONNREFUSED') ||
    message.includes('ECONNRESET')
  );
}

async function postAi(path, payload) {
  const client = createAiClient();

  try {
    const response = await client.post(path, payload);
    return response.data;
  } catch (error) {
    let currentError = error;

    if (isRetryableAiConnectionError(currentError)) {
      const didRecover = await ensureLocalAiRuntime();
      if (didRecover) {
        try {
          const retryResponse = await client.post(path, payload);
          return retryResponse.data;
        } catch (retryError) {
          currentError = retryError;
        }
      }
    }

    if (currentError.response) {
      const detail =
        currentError.response.data?.detail ||
        currentError.response.data?.message ||
        `AI endpoint ${path} failed with ${currentError.response.status}`;
      const responseError = new Error(detail);
      responseError.statusCode = currentError.response.status;
      throw responseError;
    }

    if (currentError.code === 'ECONNABORTED') {
      const timeoutError = new Error(`AI endpoint ${path} timed out`);
      timeoutError.statusCode = 504;
      throw timeoutError;
    }

    const networkError = new Error(currentError.message || `AI endpoint ${path} failed`);
    networkError.statusCode = currentError.statusCode || 502;
    throw networkError;
  }
}

async function requestAiSkillGapAnalysis(userId, targetRole) {
  const [profile, storedAiProfile, userSkills] = await Promise.all([
    Profile.getFullProfile(userId),
    Profile.getStoredAiProfile(userId),
    UserSkill.getUserSkills(userId).catch(() => []),
  ]);

  const effectiveTargetRole = resolvePreferredTargetRole(targetRole, profile, storedAiProfile);
  if (!effectiveTargetRole) {
    const missingRoleError = new Error('A target role is required before skill-gap analysis can run.');
    missingRoleError.statusCode = 400;
    throw missingRoleError;
  }

  const result = await postAi('/ai/skill-gap-analysis', {
    profile: buildAiContextProfile({
      profile,
      storedAiProfile,
      userSkills,
    }),
    target_role: effectiveTargetRole,
  });

  const normalizedAnalysis = normalizeStructuredSkillGapAnalysis(result, effectiveTargetRole);
  const flattenedGaps = flattenStructuredSkillGapAnalysis(normalizedAnalysis);
  const mergedAiProfile = {
    ...storedAiProfile,
    goals: uniqueStrings([normalizedAnalysis.target_role, ...(storedAiProfile?.goals || [])]),
    recommendations: normalizedAnalysis.recommendations.map((recommendation) => ({
      type: 'skill_gap',
      title: recommendation.title,
      content: [recommendation.action, recommendation.reason].filter(Boolean).join(' '),
      priority: recommendation.priority,
    })),
    skill_gap_analysis: normalizedAnalysis,
  };

  const persistenceResults = await Promise.allSettled([
    Profile.upsertStoredAiProfile(userId, mergedAiProfile),
    SkillGap.replaceForUser(userId, flattenedGaps),
    Profile.updateLastAnalysis(userId),
  ]);

  persistenceResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      return;
    }

    const labels = ['storedAiProfile', 'skillGapRows', 'lastAnalysisAt'];
    console.warn(`AI skill-gap analysis persistence failed for ${labels[index]}:`, result.reason?.message || result.reason);
  });

  return normalizedAnalysis;
}

async function requestAiRoadmap(userId, options = {}) {
  const [profile, storedAiProfile, userSkills, skillGaps, recommendations] = await Promise.all([
    Profile.getFullProfile(userId),
    Profile.getStoredAiProfile(userId).catch(() => ({})),
    UserSkill.getUserSkills(userId).catch(() => []),
    SkillGap.findByUserId(userId).catch(() => []),
    Recommendation.getRecentRecommendations(userId, 30, 6).catch(() => []),
  ]);

  const effectiveRole = resolvePreferredTargetRole(
    options.role || options.targetRole,
    profile,
    storedAiProfile
  );

  if (!effectiveRole) {
    const missingRoleError = new Error('A role is required before roadmap generation can run.');
    missingRoleError.statusCode = 400;
    throw missingRoleError;
  }

  const result = await postAi('/ai/generate-roadmap', {
    role: effectiveRole,
    user_profile: buildAiContextProfile({
      profile,
      storedAiProfile,
      skillGaps,
      recommendations,
      userSkills,
    }),
  });

  const mergedAiProfile = {
    ...storedAiProfile,
    goals: uniqueStrings([effectiveRole, ...(storedAiProfile?.goals || [])]),
    learning_roadmap: result,
  };

  const persistenceResults = await Promise.allSettled([
    Profile.upsertStoredAiProfile(userId, mergedAiProfile),
    Profile.updateLastAnalysis(userId),
  ]);

  persistenceResults.forEach((entry, index) => {
    if (entry.status === 'fulfilled') {
      return;
    }

    const labels = ['storedAiProfile', 'lastAnalysisAt'];
    console.warn(`AI roadmap persistence failed for ${labels[index]}:`, entry.reason?.message || entry.reason);
  });

  return result;
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

async function requestAiChat(userId, message) {
  const [recentMessages, profile, storedAiProfile, skillCatalog, userSkills, skillGaps, recommendations] = await Promise.all([
    ChatHistory.findByUserId(userId, 12),
    Profile.getFullProfile(userId),
    Profile.getStoredAiProfile(userId),
    Skill.findAll(250, 0),
    UserSkill.getUserSkills(userId).catch(() => []),
    SkillGap.findByUserId(userId).catch(() => []),
    Recommendation.getRecentRecommendations(userId, 30, 6).catch(() => []),
  ]);

  const profilePayload = buildAiContextProfile({
    profile,
    storedAiProfile,
    skillGaps,
    recommendations,
    userSkills,
  });

  const marketQueryTriggered = isMarketRelatedQuery(message);
  if (marketQueryTriggered) {
    console.info('[AIChat] market-query trigger detected', {
      userId,
      triggered: true,
      messagePreview: String(message || '').slice(0, 120),
    });

    try {
      const marketData = await getRoleMarketTrendsForUser(userId, {
        limit: 24,
        summaryLimit: 6,
        refreshIfStale: true,
      });
      const personalization = await analyzeUserMarketPersonalization(userId, {
        role: marketData.role || null,
        marketData,
        profile,
        storedAiProfile,
        userSkills,
      });

      console.info('[AIChat] market context attached', {
        userId,
        role: marketData.role || null,
        cachePath: marketData?.background_refresh_triggered
          ? 'cached_stale_background_refresh'
          : marketData?.stale
          ? 'cached_stale_no_refresh'
          : 'cached_fresh',
        trendCount: Array.isArray(marketData?.trends) ? marketData.trends.length : 0,
        missingSkillsCount: Array.isArray(personalization?.missing_skills)
          ? personalization.missing_skills.length
          : 0,
      });

      profilePayload.market_intelligence = {
        role: marketData.role,
        stale: Boolean(marketData.stale),
        updated_at: marketData.latest_updated_at || null,
        summary: Array.isArray(marketData.summary) ? marketData.summary : [],
        top_trends: Array.isArray(marketData.trends)
          ? marketData.trends.slice(0, 12)
          : [],
        missing_skills: Array.isArray(personalization?.missing_skills)
          ? personalization.missing_skills.slice(0, 8)
          : [],
        high_priority_skills: Array.isArray(personalization?.high_priority_skills)
          ? personalization.high_priority_skills.slice(0, 8)
          : [],
        market_summary: personalization?.market_summary || null,
        recommended_next_step: personalization?.recommended_next_step || null,
      };
    } catch (marketError) {
      console.warn('Unable to load market context for AI chat:', marketError.message);
    }
  } else {
    console.info('[AIChat] non-market query path', {
      userId,
      triggered: false,
      messagePreview: String(message || '').slice(0, 120),
    });
  }

  try {
    const result = await postAi('/ai/chat', {
      user_id: userId,
      message,
      recent_messages: recentMessages,
      profile: profilePayload,
      skill_catalog: (skillCatalog || []).map((skill) => skill?.name).filter(Boolean),
    });

    let userMessageId =
      typeof result?.message_id === 'string' && result.message_id.trim()
        ? result.message_id.trim()
        : null;

    if (!userMessageId) {
      const userMessageRow = await ChatHistory.create(userId, 'user', message);
      await ChatHistory.create(
        userId,
        'assistant',
        String(result?.response || '').trim() || CHAT_FALLBACK_RESPONSE
      );
      userMessageId =
        typeof userMessageRow?.id === 'string' && userMessageRow.id.trim()
          ? userMessageRow.id.trim()
          : null;
    }

    return {
      response: String(result?.response || '').trim() || CHAT_FALLBACK_RESPONSE,
      messageId: userMessageId,
      conversationSummary: normalizeConversationSummary(result?.conversation_summary),
      degraded: Boolean(result?.degraded),
    };
  } catch (error) {
    console.error('AI chat request failed:', error.message);
    return {
      response: CHAT_FALLBACK_RESPONSE,
      messageId: null,
      conversationSummary: {
        skills_mentioned: [],
        goals_mentioned: [],
      },
      degraded: true,
      error,
    };
  }
}

async function requestAiProfileExtraction(userId, message) {
  const existingProfile = await Profile.getStoredAiProfile(userId);
  const result = await postAi('/ai/extract-profile', {
    user_id: userId,
    message,
    existing_profile: existingProfile,
  });

  const mergedProfile = {
    ...existingProfile,
    ...(result?.extracted || {}),
    confidence: Number.isFinite(Number(result?.confidence)) ? Number(result.confidence) : 0,
  };
  await Profile.upsertStoredAiProfile(userId, mergedProfile);
  return result;
}

function triggerAiProfileExtraction(userId, message) {
  setImmediate(() => {
    void (async () => {
      try {
        await requestAiProfileExtraction(userId, message);
        await Profile.updateLastAnalysis(userId);
        await requestAiSkillGapAnalysis(userId).catch(() => null);
        await requestAiRoadmap(userId).catch(() => null);
      } catch (error) {
        console.warn('AI profile extraction failed asynchronously:', error.message);
      }
    })();
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
  const storedAiProfile = await Profile.getStoredAiProfile(userId).catch(() => ({}));
  const targetRole = resolvePreferredTargetRole(options.targetRole, profile, storedAiProfile);

  const ai = {
    skillGapRefresh: { status: 'skipped', detail: 'No target role available' },
    roadmapRefresh: { status: 'skipped', detail: 'No target role available' },
    recommendationsRefresh: { status: 'skipped' },
  };

  if (targetRole) {
    try {
      await requestAiSkillGapAnalysis(userId, targetRole);
      ai.skillGapRefresh = { status: 'ok', targetRole };
    } catch (error) {
      ai.skillGapRefresh = { status: 'failed', detail: error.message, targetRole };
    }

    try {
      await requestAiRoadmap(userId, { role: targetRole });
      ai.roadmapRefresh = { status: 'ok', targetRole };
    } catch (error) {
      ai.roadmapRefresh = { status: 'failed', detail: error.message, targetRole };
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
  requestAiChat,
  requestAiProfileExtraction,
  triggerAiProfileExtraction,
  requestAiJobDescription,
};
