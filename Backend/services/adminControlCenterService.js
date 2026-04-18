const { supabase } = require('../config/database');
const { User, ChatHistory } = require('../models');
const { getUserDashboardSnapshot } = require('./dashboardService');
const { normalizeAiProfile, normalizeExplicitProfile } = require('./aiProfileService');

const DAY_MS = 24 * 60 * 60 * 1000;

function safeJson(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }

  return {};
}

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeConfidencePercent(value) {
  const numeric = safeNumber(value, 0);
  if (numeric > 1 && numeric <= 100) return clamp(Math.round(numeric), 0, 100);
  return clamp(Math.round(numeric * 100), 0, 100);
}

function percent(part, total, digits = 1) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(digits));
}

function deltaPercent(current, previous, digits = 1) {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(digits));
}

function isRecent(dateValue, sinceTs) {
  if (!dateValue) return false;
  const timestamp = new Date(dateValue).getTime();
  return Number.isFinite(timestamp) && timestamp >= sinceTs;
}

function startOfUtcDay(date = new Date()) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function toDayKey(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function formatShortDay(dayKey) {
  if (!dayKey) return '';
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    day: '2-digit',
  });
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
}

async function safeQuery(label, operation, fallback = []) {
  try {
    const result = await operation();
    if (result?.error) throw result.error;

    if (Array.isArray(result?.data)) {
      return { data: result.data, missing: false };
    }

    if (result?.data === null || result?.data === undefined) {
      return { data: fallback, missing: false };
    }

    return { data: result.data, missing: false };
  } catch (error) {
    console.warn(`[adminControlCenter] ${label} unavailable:`, error.message);
    return { data: fallback, missing: true, error };
  }
}

async function getAiServiceHealth() {
  const aiServiceUrl = process.env.AI_SERVICE_URL;
  if (!aiServiceUrl) {
    return {
      enabled: false,
      status: 'disabled',
      model: null,
    };
  }

  const token = process.env.AI_SERVICE_TOKEN;
  const timeoutMs = Number(process.env.AI_HEALTH_TIMEOUT_MS || 2500);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${aiServiceUrl.replace(/\/$/, '')}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: token ? { 'x-ai-service-token': token } : {},
    });

    const payload = await response.json().catch(() => null);
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        enabled: true,
        status: 'degraded',
        model: null,
        detail: payload?.detail || `AI health check failed with status ${response.status}`,
      };
    }

    return {
      enabled: true,
      status: payload?.success ? 'connected' : 'degraded',
      model: payload?.model || null,
      services: payload?.services || {},
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      enabled: true,
      status: 'down',
      model: null,
      detail: error.message,
    };
  }
}

function buildDailySeries(rows, getDateValue, days = 14) {
  const today = startOfUtcDay();
  const buckets = [];
  const counts = new Map();

  rows.forEach((row) => {
    const dayKey = toDayKey(getDateValue(row));
    if (!dayKey) return;
    counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
  });

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(today.getTime() - offset * DAY_MS);
    const key = current.toISOString().slice(0, 10);
    buckets.push({
      day: key,
      label: formatShortDay(key),
      value: counts.get(key) || 0,
    });
  }

  return buckets;
}

function buildHourlySeries(rows, getDateValue) {
  const counts = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHourLabel(hour),
    value: 0,
  }));

  rows.forEach((row) => {
    const date = new Date(getDateValue(row));
    if (Number.isNaN(date.getTime())) return;
    counts[date.getUTCHours()].value += 1;
  });

  return counts;
}

function pickLatestSignals(rows) {
  const latestBySkill = new Map();
  const sorted = [...rows].sort((a, b) => {
    const aTime = new Date(a.window_start || a.created_at || 0).getTime();
    const bTime = new Date(b.window_start || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  sorted.forEach((row) => {
    const name = asText(row.skill);
    const key = name.toLowerCase();
    if (!name || latestBySkill.has(key)) return;
    latestBySkill.set(key, row);
  });

  return Array.from(latestBySkill.values());
}

function deriveSkillTrendSignals({ trendSkillRows = [], trends = [], skills = [], previousSignals = [] }) {
  const previousMap = new Map(
    previousSignals.map((row) => [asText(row.skill).toLowerCase(), safeNumber(row.demand_score)])
  );
  const signalMap = new Map();

  const pushSignal = ({ skill, category, source, title, rawScore, createdAt }) => {
    const name = asText(skill);
    if (!name) return;

    const key = name.toLowerCase();
    const current = signalMap.get(key) || {
      skill: name,
      category: asText(category, 'General'),
      rawScore: 0,
      mentions: 0,
      sources: new Set(),
      relatedTrends: new Set(),
      latestCreatedAt: createdAt || null,
    };

    current.rawScore += rawScore;
    current.mentions += 1;
    if (source) current.sources.add(source);
    if (title) current.relatedTrends.add(title);
    if (createdAt) {
      const currentTime = current.latestCreatedAt ? new Date(current.latestCreatedAt).getTime() : 0;
      const nextTime = new Date(createdAt).getTime();
      if (nextTime > currentTime) current.latestCreatedAt = createdAt;
    }

    signalMap.set(key, current);
  };

  if (Array.isArray(trendSkillRows) && trendSkillRows.length > 0) {
    trendSkillRows.forEach((row) => {
      pushSignal({
        skill: row.skills?.name,
        category: row.skills?.category || row.trends?.domain || 'General',
        source: row.trends?.source,
        title: row.trends?.title,
        rawScore: clamp(Math.round(safeNumber(row.relevance_score, 1) * 28), 10, 100),
        createdAt: row.trends?.created_at || null,
      });
    });
  } else {
    const catalog = skills
      .map((skill) => ({
        name: asText(skill.name),
        category: asText(skill.category, 'General'),
        token: asText(skill.name).toLowerCase(),
      }))
      .filter((skill) => skill.name);

    trends.forEach((trend) => {
      const text = `${trend.title || ''} ${trend.description || ''} ${trend.domain || ''}`.toLowerCase();
      catalog.forEach((skill) => {
        if (!skill.token || !text.includes(skill.token)) return;

        pushSignal({
          skill: skill.name,
          category: skill.category || trend.domain || 'General',
          source: trend.source,
          title: trend.title,
          rawScore: 22,
          createdAt: trend.created_at,
        });
      });
    });
  }

  const rawSignals = Array.from(signalMap.values());
  const maxScore = Math.max(1, ...rawSignals.map((signal) => signal.rawScore));

  return rawSignals
    .map((signal) => {
      const demandScore = Math.round((signal.rawScore / maxScore) * 100);
      const previousScore = previousMap.get(signal.skill.toLowerCase());
      const diff = previousScore === undefined ? null : demandScore - previousScore;

      let trend = 'stable';
      if (diff === null) {
        trend = demandScore >= 65 ? 'up' : demandScore <= 25 ? 'down' : 'stable';
      } else if (diff >= 8) {
        trend = 'up';
      } else if (diff <= -8) {
        trend = 'down';
      }

      return {
        skill: signal.skill,
        category: signal.category,
        demandScore,
        trend,
        sourceCount: signal.sources.size,
        signalCount: signal.mentions,
        relatedTrends: Array.from(signal.relatedTrends).slice(0, 3),
        windowStart: signal.latestCreatedAt || new Date().toISOString(),
      };
    })
    .sort((a, b) => b.demandScore - a.demandScore);
}

async function refreshSkillTrendSignals() {
  const [skillsRes, trendsRes, trendSkillsRes, storedSignalsRes] = await Promise.all([
    safeQuery('skills', () => supabase.from('skills').select('id, name, category')),
    safeQuery('trends', () => supabase.from('trends').select('id, domain, title, description, source, created_at')),
    safeQuery(
      'trend_skills',
      () =>
        supabase
          .from('trend_skills')
          .select('relevance_score, skills(name, category), trends(title, source, domain, created_at)'),
      []
    ),
    safeQuery('skill_trends', () => supabase.from('skill_trends').select('skill, demand_score, trend, window_start, source_count, created_at'), []),
  ]);

  const latestSignals = pickLatestSignals(storedSignalsRes.data || []);
  const signals = deriveSkillTrendSignals({
    trendSkillRows: trendSkillsRes.data || [],
    trends: trendsRes.data || [],
    skills: skillsRes.data || [],
    previousSignals: latestSignals,
  });

  const refreshTimestamp = new Date().toISOString();
  const windowStart = startOfUtcDay(refreshTimestamp).toISOString();
  let persisted = false;

  if (signals.length > 0) {
    try {
      const { error } = await supabase.from('skill_trends').upsert(
        signals.map((signal) => ({
          skill: signal.skill,
          demand_score: signal.demandScore,
          trend: signal.trend,
          window_start: windowStart,
          source_count: signal.sourceCount,
        })),
        { onConflict: 'skill,window_start' }
      );

      if (error) throw error;
      persisted = true;
    } catch (error) {
      console.warn('[adminControlCenter] skill_trends refresh could not be persisted:', error.message);
    }
  }

  return {
    refreshedAt: refreshTimestamp,
    persisted,
    signals: signals.slice(0, 12),
  };
}

function buildProfileCompletion(profile, aiProfile) {
  const explicit = normalizeExplicitProfile(profile || {});
  let score = 0;
  const total = 8;

  if (profile?.domain || explicit.preferences.domain) score += 1;
  if (profile?.title || profile?.experience_level) score += 1;
  if (profile?.bio || explicit.experience) score += 1;
  if (explicit.skills.length || (aiProfile?.skills || []).length) score += 1;
  if (explicit.target_role || aiProfile?.target_role || (aiProfile?.goals || []).length) score += 1;
  if (explicit.education || (aiProfile?.education || []).length) score += 1;
  if ((aiProfile?.confidence || 0) > 0) score += 1;
  if (profile?.last_analysis_at || aiProfile?.learning_roadmap) score += 1;

  const percentage = Math.round((score / total) * 100);
  return {
    value: percentage,
    status: percentage >= 76 ? 'complete' : percentage >= 46 ? 'progress' : 'low',
  };
}

function resolveUserRoleLabel(user, profile, aiProfile) {
  return (
    asText(profile?.explicit_target_role) ||
    asText(aiProfile?.learning_roadmap?.role) ||
    asText(aiProfile?.target_role) ||
    asText(profile?.title) ||
    asText(user?.role, 'user')
  );
}

function buildRoleComposition(roleName, userIds, userSkillsRows) {
  const skillMap = new Map();
  userSkillsRows.forEach((row) => {
    if (!userIds.has(row.user_id)) return;

    const skillName = asText(row.skills?.name || row.skill_name, 'Unknown');
    const category = asText(row.skills?.category, 'General');
    const current = skillMap.get(skillName) || { name: skillName, category, count: 0 };
    current.count += 1;
    skillMap.set(skillName, current);
  });

  const total = Array.from(skillMap.values()).reduce((sum, item) => sum + item.count, 0);
  const topSkills = Array.from(skillMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((item) => ({
      name: item.name,
      share: total ? Math.round((item.count / total) * 100) : 0,
      count: item.count,
      category: item.category,
    }));

  return {
    name: roleName,
    count: userIds.size,
    skills: topSkills,
  };
}

function pickHeadline(topGap, topSignal, totalUsers) {
  if (topGap?.skill) {
    return {
      headline: `${topGap.skill} is the highest-pressure skill gap across ${topGap.userCount} SkillPulse profiles.`,
      subheadline: topSignal?.skill
        ? `${topSignal.skill} currently carries the strongest market signal at ${topSignal.demandScore}/100 demand intensity.`
        : `The admin workspace is monitoring ${totalUsers} registered users and surfacing the most urgent intervention points.`,
    };
  }

  if (topSignal?.skill) {
    return {
      headline: `${topSignal.skill} is leading the latest SkillPulse trend signal map.`,
      subheadline: `Demand intensity is currently ${topSignal.demandScore}/100 across tracked trend sources and user journeys.`,
    };
  }

  return {
    headline: `SkillPulse is monitoring ${totalUsers} registered users across skills, AI activity, and learning journeys.`,
    subheadline: 'The control center is ready to surface stronger live signals as more platform activity lands in the backend.',
  };
}

function buildInsightActions({ urgentCount, roadmaps, topSignal, aiHealth }) {
  return [
    {
      id: 'urgent-gaps',
      title: 'Skill gap intervention',
      description: urgentCount > 0 ? `${urgentCount} urgent gaps need review` : 'No high-severity gaps are currently flagged',
      action: 'Open Talent Pool',
      tone: urgentCount > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'trend-refresh',
      title: 'Trend intelligence',
      description: topSignal?.skill
        ? `${topSignal.skill} is the current lead demand signal`
        : 'Refresh persisted trend signals to populate the heat map',
      action: 'Refresh signals',
      tone: topSignal?.trend === 'up' ? 'success' : 'neutral',
    },
    {
      id: 'ai-health',
      title: 'AI system oversight',
      description: aiHealth?.enabled
        ? `${asText(aiHealth.status, 'unknown')} on ${asText(aiHealth.model, 'configured model')}`
        : 'AI service is not configured in this environment',
      action: roadmaps > 0 ? `${roadmaps} active journeys` : 'Inspect journeys',
      tone: aiHealth?.status === 'connected' ? 'success' : aiHealth?.status === 'down' ? 'danger' : 'neutral',
    },
  ];
}

async function getAdminControlCenterData() {
  const [
    usersRes,
    profilesRes,
    skillsRes,
    userSkillsRes,
    gapsRes,
    trendsRes,
    recommendationsRes,
    aiProfilesRes,
    chatHistoryRes,
    skillTrendsRes,
    trendSkillsRes,
  ] = await Promise.all([
    safeQuery('users', () => supabase.from('users').select('id, email, full_name, role, created_at, updated_at')),
    safeQuery(
      'profiles',
      () =>
        supabase
          .from('profiles')
          .select(
            'user_id, domain, title, experience_level, bio, explicit_skills, explicit_target_role, explicit_education, explicit_experience, explicit_preferences, last_analysis_at, created_at, updated_at'
          )
    ),
    safeQuery('skills', () => supabase.from('skills').select('id, name, category, created_at')),
    safeQuery(
      'user_skills',
      () =>
        supabase
          .from('user_skills')
          .select('user_id, skill_id, proficiency_level, years_of_experience, created_at, skills(name, category)')
    ),
    safeQuery('skill_gaps', () => supabase.from('skill_gaps').select('id, user_id, domain, skill_name, gap_level, reason, created_at')),
    safeQuery('trends', () => supabase.from('trends').select('id, domain, title, description, source, created_at')),
    safeQuery('recommendations', () => supabase.from('recommendations').select('id, user_id, type, title, content, created_at')),
    safeQuery('user_ai_profile', () => supabase.from('user_ai_profile').select('user_id, profile_json')),
    safeQuery('ai_chat_sessions', () => supabase.from('ai_chat_sessions').select('user_id, created_at, updated_at')),
    safeQuery('skill_trends', () => supabase.from('skill_trends').select('skill, demand_score, trend, window_start, source_count, created_at'), []),
    safeQuery(
      'trend_skills',
      () =>
        supabase
          .from('trend_skills')
          .select('relevance_score, skills(name, category), trends(title, source, domain, created_at)'),
      []
    ),
  ]);

  const users = usersRes.data || [];
  const profiles = profilesRes.data || [];
  const skills = skillsRes.data || [];
  const userSkills = userSkillsRes.data || [];
  const gaps = gapsRes.data || [];
  const trends = trendsRes.data || [];
  const recommendations = recommendationsRes.data || [];
  const aiProfileRows = aiProfilesRes.data || [];
  const chatSessions = chatHistoryRes.data || [];

  const userMap = new Map(users.map((user) => [user.id, user]));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const normalizedAiProfiles = new Map();
  const rawAiSkillCounts = new Map();
  const aiConfidenceValues = [];

  aiProfileRows.forEach((row) => {
    const rawProfile = safeJson(row.profile_json);
    const profile = profileMap.get(row.user_id) || null;
    const normalized = normalizeAiProfile(rawProfile, {}, profile);

    normalizedAiProfiles.set(row.user_id, normalized);

    const confidence = normalizeConfidencePercent(rawProfile.confidence ?? normalized.confidence);
    if (confidence > 0) aiConfidenceValues.push(confidence);

    const rawSkills = Array.isArray(rawProfile.skills) ? rawProfile.skills : [];
    rawSkills.forEach((skill) => {
      const name = asText(skill?.name || skill?.skill_name);
      if (!name) return;
      rawAiSkillCounts.set(name, (rawAiSkillCounts.get(name) || 0) + 1);
    });
  });

  const completionRows = users.map((user) => {
    const profile = profileMap.get(user.id) || null;
    const aiProfile = normalizedAiProfiles.get(user.id) || normalizeAiProfile({}, {}, profile);
    const completion = buildProfileCompletion(profile, aiProfile);
    const explicit = normalizeExplicitProfile(profile || {});
    const hasExplicit =
      Boolean(profile?.domain || profile?.title || profile?.experience_level || profile?.bio) ||
      explicit.skills.length > 0 ||
      Boolean(explicit.target_role || explicit.education || explicit.experience || explicit.preferences.domain || explicit.preferences.stack);
    const hasAi =
      Boolean(aiProfile?.learning_roadmap) ||
      Boolean(aiProfile?.target_role) ||
      (aiProfile?.skills || []).length > 0 ||
      (aiProfile?.goals || []).length > 0 ||
      (aiProfile?.confidence || 0) > 0;

    return {
      user,
      profile,
      aiProfile,
      completion,
      hasExplicit,
      hasAi,
      roleLabel: resolveUserRoleLabel(user, profile, aiProfile),
    };
  });

  const now = Date.now();
  const last7Days = now - 7 * DAY_MS;
  const last14Days = now - 14 * DAY_MS;
  const last30Days = now - 30 * DAY_MS;
  const usersLast30 = users.filter((user) => isRecent(user.created_at, last30Days)).length;
  const usersLast7 = users.filter((user) => isRecent(user.created_at, last7Days)).length;
  const usersPrev7 = users.filter((user) => {
    const timestamp = new Date(user.created_at).getTime();
    return Number.isFinite(timestamp) && timestamp >= last14Days && timestamp < last7Days;
  }).length;

  const activeUserIds = new Set();
  chatSessions.forEach((row) => {
    if (isRecent(row.updated_at || row.created_at, last30Days)) activeUserIds.add(row.user_id);
  });
  profiles.forEach((profile) => {
    if (isRecent(profile.last_analysis_at || profile.updated_at, last30Days)) activeUserIds.add(profile.user_id);
  });
  userSkills.forEach((row) => {
    if (isRecent(row.created_at, last30Days)) activeUserIds.add(row.user_id);
  });
  recommendations.forEach((row) => {
    if (isRecent(row.created_at, last30Days)) activeUserIds.add(row.user_id);
  });
  users.forEach((user) => {
    if (isRecent(user.created_at, last30Days)) activeUserIds.add(user.id);
  });

  // Since we only query chat sessions now for overall app-usage metrics, we map "requests" conceptually by active sessions.
  const aiRequestsLast7 = chatSessions.filter((row) => isRecent(row.updated_at || row.created_at, last7Days)).length;
  const aiRequestsPrev7 = chatSessions.filter((row) => {
    const timestamp = new Date(row.updated_at || row.created_at).getTime();
    return Number.isFinite(timestamp) && timestamp >= last14Days && timestamp < last7Days;
  }).length;
  const activeChatUsers = new Set(chatSessions.map((row) => row.user_id));
  const hourlyRequests = buildHourlySeries(chatSessions, (row) => row.updated_at || row.created_at);
  const peakHour = [...hourlyRequests].sort((a, b) => b.value - a.value)[0] || { label: '00:00', value: 0 };

  const skillUsageMap = new Map();
  const proficiencyMap = new Map();
  const categoryUsageMap = new Map();
  const clusterMap = new Map();

  userSkills.forEach((row) => {
    const skillName = asText(row.skills?.name || row.skill_name, 'Unknown');
    const category = asText(row.skills?.category, 'General');
    const level = asText(row.proficiency_level, 'intermediate');
    const key = skillName.toLowerCase();
    const current = skillUsageMap.get(key) || {
      name: skillName,
      category,
      count: 0,
      users: new Set(),
      levelMix: {},
    };

    current.count += 1;
    current.users.add(row.user_id);
    current.levelMix[level] = (current.levelMix[level] || 0) + 1;
    skillUsageMap.set(key, current);

    proficiencyMap.set(level, (proficiencyMap.get(level) || 0) + 1);
    categoryUsageMap.set(category, (categoryUsageMap.get(category) || 0) + 1);

    const categoryBucket = clusterMap.get(category) || { name: category, count: 0, skills: new Map() };
    categoryBucket.count += 1;
    categoryBucket.skills.set(skillName, (categoryBucket.skills.get(skillName) || 0) + 1);
    clusterMap.set(category, categoryBucket);
  });

  const topSkills = Array.from(skillUsageMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => ({
      name: item.name,
      category: item.category,
      count: item.count,
      users: item.users.size,
      levelMix: item.levelMix,
    }));

  const proficiencyDistribution = Array.from(proficiencyMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const categoryShares = Array.from(categoryUsageMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const clusters = Array.from(clusterMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((cluster) => ({
      name: cluster.name,
      count: cluster.count,
      skills: Array.from(cluster.skills.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count })),
    }));

  const topAiDetectedSkills = Array.from(rawAiSkillCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const gapMap = new Map();
  const gapSeverityMap = new Map();
  const gapRoleMap = new Map();
  let urgentGapCount = 0;
  let gapLevelSum = 0;

  gaps.forEach((gap) => {
    const skill = asText(gap.skill_name);
    const domain = asText(gap.domain, 'General');
    const level = clamp(Math.round(safeNumber(gap.gap_level, 3)), 1, 5);
    const key = skill.toLowerCase();
    const current = gapMap.get(key) || {
      skill,
      domain,
      count: 0,
      gapLevelTotal: 0,
      userIds: new Set(),
      reasons: new Set(),
    };

    current.count += 1;
    current.gapLevelTotal += level;
    current.userIds.add(gap.user_id);
    if (gap.reason) current.reasons.add(gap.reason);
    gapMap.set(key, current);

    gapSeverityMap.set(String(level), (gapSeverityMap.get(String(level)) || 0) + 1);
    if (level >= 4) urgentGapCount += 1;
    gapLevelSum += level;

    const roleLabel = resolveUserRoleLabel(
      userMap.get(gap.user_id),
      profileMap.get(gap.user_id),
      normalizedAiProfiles.get(gap.user_id)
    );
    gapRoleMap.set(roleLabel, (gapRoleMap.get(roleLabel) || 0) + 1);
  });

  const topGapRows = Array.from(gapMap.values())
    .map((row) => ({
      skill: row.skill,
      domain: row.domain,
      count: row.count,
      userCount: row.userIds.size,
      avgGapLevel: Number((row.gapLevelTotal / row.count).toFixed(1)),
      reason: Array.from(row.reasons)[0] || '',
    }))
    .sort((a, b) => {
      if (b.avgGapLevel !== a.avgGapLevel) return b.avgGapLevel - a.avgGapLevel;
      return b.userCount - a.userCount;
    });

  const maxGapUsers = Math.max(1, ...topGapRows.map((row) => row.userCount));
  const gapHeatmap = topGapRows.slice(0, 12).map((row) => ({
    ...row,
    intensity: Math.round((row.avgGapLevel / 5) * 70 + (row.userCount / maxGapUsers) * 30),
  }));

  const severityDistribution = ['1', '2', '3', '4', '5'].map((level) => ({
    name: `Level ${level}`,
    count: gapSeverityMap.get(level) || 0,
  }));

  const gapDistributionByRole = Array.from(gapRoleMap.entries())
    .map(([role, count]) => ({ name: role, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const latestStoredSignals = pickLatestSignals(skillTrendsRes.data || []);
  const activeTrendSignals =
    latestStoredSignals.length > 0
      ? latestStoredSignals
          .map((row) => ({
            skill: asText(row.skill),
            demandScore: Math.round(safeNumber(row.demand_score)),
            trend: asText(row.trend, 'stable'),
            sourceCount: safeNumber(row.source_count),
          }))
          .sort((a, b) => b.demandScore - a.demandScore)
      : deriveSkillTrendSignals({
          trendSkillRows: trendSkillsRes.data || [],
          trends,
          skills,
          previousSignals: [],
        });

  const trendDirections = ['up', 'stable', 'down'].map((direction) => ({
    name: direction,
    count: activeTrendSignals.filter((signal) => signal.trend === direction).length,
  }));

  const trendSources = Array.from(
    trends.reduce((map, trend) => {
      const key = asText(trend.source, 'Unknown');
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map())
  )
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const roleBuckets = new Map();
  completionRows.forEach((row) => {
    const roleName = row.roleLabel;
    if (!roleName) return;

    const bucket = roleBuckets.get(roleName) || { name: roleName, userIds: new Set() };
    bucket.userIds.add(row.user.id);
    roleBuckets.set(roleName, bucket);
  });

  const roleDemand = Array.from(roleBuckets.values())
    .map((bucket) => buildRoleComposition(bucket.name, bucket.userIds, userSkills))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const completedCareerProfiles = completionRows.filter((row) => row.completion.value >= 75).length;
  const explicitOnly = completionRows.filter((row) => row.hasExplicit && !row.hasAi).length;
  const aiOnly = completionRows.filter((row) => !row.hasExplicit && row.hasAi).length;
  const hybridProfiles = completionRows.filter((row) => row.hasExplicit && row.hasAi).length;
  const avgProfileCompletion = users.length
    ? Number(
        (
          completionRows.reduce((sum, row) => sum + row.completion.value, 0) /
          Math.max(users.length, 1)
        ).toFixed(1)
      )
    : 0;
  const avgAiConfidence = aiConfidenceValues.length
    ? Number((aiConfidenceValues.reduce((sum, value) => sum + value, 0) / aiConfidenceValues.length).toFixed(1))
    : 0;

  const journeyRows = completionRows
    .filter((row) => row.aiProfile?.learning_roadmap && Array.isArray(row.aiProfile.learning_roadmap.stages))
    .map((row) => {
      const roadmap = row.aiProfile.learning_roadmap;
      const nextStage = (roadmap.stages || []).find((stage) => stage.items?.length || stage.projects?.length);
      return {
        userId: row.user.id,
        userName: asText(row.user.full_name || row.user.email, 'Unknown user'),
        targetRole: asText(roadmap?.role || row.aiProfile?.target_role || row.profile?.explicit_target_role || row.profile?.title, 'Unassigned'),
        stageCount: Array.isArray(roadmap?.stages) ? roadmap.stages.length : 0,
        nextStage: nextStage?.title || null,
        confidence: normalizeConfidencePercent(row.aiProfile?.confidence),
        updatedAt: row.profile?.last_analysis_at || row.profile?.updated_at || row.user.updated_at || row.user.created_at,
      };
    })
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

  const journeyRoleMap = new Map();
  const stageDistributionMap = new Map();
  journeyRows.forEach((journey) => {
    journeyRoleMap.set(journey.targetRole, (journeyRoleMap.get(journey.targetRole) || 0) + 1);
    const roadmap = normalizedAiProfiles.get(journey.userId)?.learning_roadmap;
    (roadmap?.stages || []).forEach((stage) => {
      const title = asText(stage.title, 'Stage');
      stageDistributionMap.set(title, (stageDistributionMap.get(title) || 0) + 1);
    });
  });

  const topJourneyRoles = Array.from(journeyRoleMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const stageDistribution = Array.from(stageDistributionMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const signupsSeries = buildDailySeries(users, (user) => user.created_at, 14);
  const requestSeries = buildDailySeries(chatRequests, (row) => row.created_at, 14);
  const aiHealth = await getAiServiceHealth();
  const topGap = topGapRows[0] || null;
  const topSignal = activeTrendSignals[0] || null;
  const headline = pickHeadline(topGap, topSignal, users.length);

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      activeUsers: activeUserIds.size,
      admins: users.filter((user) => user.role === 'admin').length,
      newUsersLast30Days: usersLast30,
      totalSkills: skills.length,
      totalSkillMappings: userSkills.length,
      totalSkillGaps: gaps.length,
      urgentSkillGaps: urgentGapCount,
      totalTrends: trends.length,
      totalRecommendations: recommendations.length,
      totalAiRequests: chatRequests.length,
      totalAiConversations: activeChatUsers.size,
      roadmapCount: journeyRows.length,
      activeJourneys: journeyRows.filter((row) => row.stageCount > 0).length,
      avgAiConfidence,
      avgProfileCompletion,
      completedCareerProfiles,
    },
    hero: {
      ...headline,
      insights: buildInsightActions({
        urgentCount: urgentGapCount,
        roadmaps: journeyRows.length,
        topSignal,
        aiHealth,
      }),
    },
    kpis: [
      {
        id: 'users',
        label: 'Registered users',
        value: users.length,
        delta: deltaPercent(usersLast7, usersPrev7),
        deltaLabel: `${usersLast30} new signups in the last 30 days`,
        icon: 'group',
        tone: usersLast7 >= usersPrev7 ? 'primary' : 'warning',
      },
      {
        id: 'ai-requests',
        label: 'AI requests',
        value: chatRequests.length,
        delta: deltaPercent(aiRequestsLast7, aiRequestsPrev7),
        deltaLabel: `${activeChatUsers.size} users have interacted with AI`,
        icon: 'smart_toy',
        tone: aiRequestsLast7 >= aiRequestsPrev7 ? 'primary' : 'warning',
      },
      {
        id: 'profile-completion',
        label: 'Profile completion',
        value: `${avgProfileCompletion}%`,
        delta: avgAiConfidence,
        deltaLabel: `${completedCareerProfiles} users have high-completion career profiles`,
        icon: 'account_circle',
        tone: avgProfileCompletion >= 65 ? 'success' : 'warning',
      },
      {
        id: 'learning-journeys',
        label: 'Learning journeys',
        value: journeyRows.length,
        delta: percent(journeyRows.filter((row) => row.stageCount > 0).length, Math.max(journeyRows.length, 1)),
        deltaLabel: `${topJourneyRoles[0]?.name || 'No target role'} is the most selected destination`,
        icon: 'route',
        tone: journeyRows.length > 0 ? 'success' : 'warning',
      },
    ],
    users: {
      growthSeries: signupsSeries,
      recentUsers: users
        .slice()
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 8)
        .map((user) => ({
          id: user.id,
          name: asText(user.full_name || user.email, 'Unknown'),
          email: user.email,
          role: user.role || 'user',
          created_at: user.created_at,
          completion: completionRows.find((row) => row.user.id === user.id)?.completion.value || 0,
        })),
      targetRoles: topJourneyRoles,
    },
    aiActivity: {
      totalRequests: chatRequests.length,
      totalConversations: activeChatUsers.size,
      avgRequestsPerUser: activeChatUsers.size ? Number((chatRequests.length / activeChatUsers.size).toFixed(2)) : 0,
      requestsSeries: requestSeries,
      hourlyRequests,
      peakHour,
      health: aiHealth,
    },
    skills: {
      topSkills,
      proficiencyDistribution,
      categoryShares,
      clusters,
      topAiDetectedSkills,
    },
    gaps: {
      topUrgent: topGapRows.slice(0, 6),
      heatmap: gapHeatmap,
      severityDistribution,
      distributionByRole: gapDistributionByRole,
      avgSeverity: gaps.length ? Number((gapLevelSum / gaps.length).toFixed(1)) : 0,
    },
    trends: {
      topSignals: activeTrendSignals.slice(0, 8),
      directionMix: trendDirections,
      sources: trendSources,
      refreshedFromPersistence: latestStoredSignals.length > 0,
      topRoles: topJourneyRoles,
    },
    profiles: {
      averageCompletion: avgProfileCompletion,
      averageAiConfidence: avgAiConfidence,
      completedCareerProfiles,
      profileCoverage: Number(percent(profiles.length, Math.max(users.length, 1), 1).toFixed(1)),
      explicitVsAi: [
        { name: 'Hybrid', count: hybridProfiles },
        { name: 'Explicit only', count: explicitOnly },
        { name: 'AI inferred only', count: aiOnly },
      ],
      evolutionStages: [
        {
          id: 'registered',
          title: 'Registered',
          time: 'Users',
          metrics: {
            skill: Number(percent(profiles.length, Math.max(users.length, 1), 0)),
            ai: Number(percent(aiConfidenceValues.length, Math.max(users.length, 1), 0)),
          },
          count: users.length,
        },
        {
          id: 'profiled',
          title: 'Profiled',
          time: 'Signals',
          metrics: {
            skill: Math.round(avgProfileCompletion),
            ai: Math.round(avgAiConfidence),
          },
          count: completedCareerProfiles,
        },
        {
          id: 'journeys',
          title: 'Journeys',
          time: 'Roadmaps',
          metrics: {
            skill: Number(percent(journeyRows.length, Math.max(users.length, 1), 0)),
            ai: Number(percent(journeyRows.filter((row) => row.confidence >= 50).length, Math.max(journeyRows.length, 1), 0)),
          },
          count: journeyRows.length,
        },
      ],
    },
    learningJourneys: {
      total: journeyRows.length,
      active: journeyRows.filter((row) => row.stageCount > 0).length,
      topRoles: topJourneyRoles,
      stageDistribution,
      recentJourneys: journeyRows.slice(0, 6),
    },
    roleDemand,
  };
}

async function getAdminUserDetailData(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const snapshot = await getUserDashboardSnapshot(userId, {
    recentRecommendationDays: 30,
    recentRecommendationLimit: 10,
  });
  const activityRows = await ChatHistory.findByUserId(userId, 200).catch(() => []);
  const aiProfile = snapshot.ai_profile || normalizeAiProfile({}, {}, snapshot.profile);
  const completion = buildProfileCompletion(snapshot.profile, aiProfile);
  const explicit = normalizeExplicitProfile(snapshot.profile || {});

  return {
    user,
    profile: snapshot.profile,
    explicitProfile: explicit,
    aiProfile,
    aiSummary: snapshot.ai_summary,
    skills: snapshot.skills || [],
    skillGaps: snapshot.skillGaps || [],
    recommendations: snapshot.recentRecommendations || [],
    gapStatistics: snapshot.gapStatistics || {
      total_gaps: 0,
      avg_gap_level: 0,
      high_priority_count: 0,
      domains_with_gaps: 0,
    },
    activity: {
      totalMessages: activityRows.length,
      totalRequests: activityRows.filter((row) => row.role === 'user').length,
      lastActiveAt: activityRows[activityRows.length - 1]?.created_at || snapshot.profile?.updated_at || user.updated_at || user.created_at,
    },
    completion,
  };
}

module.exports = {
  getAiServiceHealth,
  getAdminControlCenterData,
  getAdminUserDetailData,
  refreshSkillTrendSignals,
};
