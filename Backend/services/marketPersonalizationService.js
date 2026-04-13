const { Profile, UserSkill } = require('../models');
const {
  getRoleMarketTrendsForUser,
  resolvePreferredTargetRole,
} = require('./marketIntelligenceService');

const LEVEL_RANK = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeSkillKey(value) {
  return normalizeText(value)
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[\\/,+:&|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLevel(value) {
  const normalized = normalizeText(value);
  if (Object.prototype.hasOwnProperty.call(LEVEL_RANK, normalized)) {
    return normalized;
  }
  return 'intermediate';
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function collectUserSkillMap(profile, storedAiProfile, userSkills) {
  const map = new Map();

  const upsert = (skillName, level, source) => {
    const rawName = String(skillName || '').trim();
    if (!rawName) return;

    const key = normalizeSkillKey(rawName);
    if (!key) return;

    const normalizedLevel = normalizeLevel(level);
    const rank = LEVEL_RANK[normalizedLevel] || 2;
    const existing = map.get(key);

    if (!existing || rank > existing.level_rank) {
      map.set(key, {
        skill: rawName,
        normalized_skill: key,
        level: normalizedLevel,
        level_rank: rank,
        source,
      });
    }
  };

  if (Array.isArray(profile?.explicit_skills)) {
    profile.explicit_skills.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      upsert(item.name || item.skill_name, item.level || item.proficiency_level, 'explicit_profile');
    });
  }

  if (Array.isArray(storedAiProfile?.skills)) {
    storedAiProfile.skills.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      upsert(item.name || item.skill_name, item.level || item.proficiency_level, 'ai_profile');
    });
  }

  if (Array.isArray(userSkills)) {
    userSkills.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      upsert(item.skill_name || item.name, item.proficiency_level || item.level, 'user_skills');
    });
  }

  return map;
}

function buildSummary(role, trendsCount, knownSkillCount, topMissing, topPriority, stale) {
  if (!role) {
    return 'Add a target role to receive personalized market guidance.';
  }

  if (!trendsCount) {
    return `Recent ${role} market signals are limited. Refresh trends again shortly.`;
  }

  if (!knownSkillCount) {
    return `Market demand for ${role} is available. Add your current skills to make recommendations more accurate.`;
  }

  if (!topPriority.length) {
    return `Your skills are well aligned with recent ${role} market demand.`;
  }

  const highlighted = topPriority
    .slice(0, 3)
    .map((item) => item.skill)
    .join(', ');

  const missingCount = topMissing.length;
  const missingSuffix = missingCount === 1 ? 'skill' : 'skills';
  const staleSuffix = stale ? ' Data is stale and refreshing in the background.' : '';

  return `Demand for ${role} currently emphasizes ${highlighted}. You are missing ${missingCount} priority ${missingSuffix}.${staleSuffix}`;
}

function buildNextStep(topPriority, role, trendsCount, knownSkillCount) {
  if (!topPriority.length) {
    if (role && !trendsCount) {
      return `Refresh ${role} trends, then focus on one foundational skill from the latest snapshot.`;
    }

    if (role && !knownSkillCount) {
      return `Add your current skills first, then prioritize one high-demand ${role} skill this week.`;
    }

    return role
      ? `Maintain your ${role} strengths and review market signals weekly.`
      : 'Set a target role, then run a trends refresh to get a market-specific next step.';
  }

  const [first, second] = topPriority;
  if (second) {
    return `Prioritize ${first.skill}, then ${second.skill}. Complete one practical project using both.`;
  }

  return `Prioritize ${first.skill} and complete one role-relevant project milestone.`;
}

function toList(items) {
  return items.map((item) => item.skill);
}

async function analyzeUserMarketPersonalization(userId, options = {}) {
  const [profile, storedAiProfile, userSkills] = await Promise.all([
    options.profile ? Promise.resolve(options.profile) : Profile.getFullProfile(userId).catch(() => null),
    options.storedAiProfile
      ? Promise.resolve(options.storedAiProfile)
      : Profile.getStoredAiProfile(userId).catch(() => ({})),
    options.userSkills
      ? Promise.resolve(options.userSkills)
      : UserSkill.getUserSkills(userId).catch(() => []),
  ]);

  const targetRole = resolvePreferredTargetRole(
    profile,
    storedAiProfile,
    options.role || null
  );

  console.info('[MarketPersonalization] resolving personalization context', {
    userId,
    requestedRole: String(options.role || '').trim() || null,
    targetRole: targetRole || null,
    usedProvidedMarketData: Boolean(options.marketData),
  });

  if (!targetRole) {
    return {
      role: null,
      stale: true,
      latest_updated_at: null,
      missing_skills: [],
      high_priority_skills: [],
      market_summary: 'Add a target role to unlock personalized market insights.',
      recommended_next_step: 'Set your target role and refresh trends to generate role-specific guidance.',
      missing_skill_names: [],
      high_priority_skill_names: [],
    };
  }

  const market =
    options.marketData ||
    (await getRoleMarketTrendsForUser(userId, {
      role: targetRole,
      limit: Number.isFinite(Number(options.limit)) ? Number(options.limit) : 80,
      summaryLimit: 5,
      refreshIfStale: options.refreshIfStale !== false,
    }));

  const trends = Array.isArray(market?.trends) ? market.trends : [];
  const skillMap = collectUserSkillMap(profile, storedAiProfile, userSkills);
  const knownSkillCount = skillMap.size;

  const ranked = trends
    .map((row) => {
      const skill = String(row.skill || '').trim();
      if (!skill) return null;

      const key = normalizeSkillKey(skill);
      const frequency = safeNumber(row.frequency, 0);
      const category = String(row.category || 'tooling').trim() || 'tooling';
      const existing = skillMap.get(key) || null;
      const isMissing = !existing;
      const isDeveloping = Boolean(existing && (existing.level_rank || 0) <= 2);

      return {
        skill,
        normalized_skill: key,
        frequency,
        category,
        user_level: existing?.level || null,
        user_skill_source: existing?.source || null,
        status: isMissing ? 'missing' : isDeveloping ? 'developing' : 'aligned',
        demand_score: Math.max(1, Math.min(100, Math.round(35 + frequency * 6))),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.frequency - a.frequency);

  const missing = ranked
    .filter((item) => item.status === 'missing')
    .slice(0, 8);

  const highPriority = [
    ...ranked.filter((item) => item.status === 'missing').slice(0, 5),
    ...ranked.filter((item) => item.status === 'developing').slice(0, 3),
  ]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8);

  console.info('[MarketPersonalization] personalization computed', {
    userId,
    targetRole,
    trendsFound: trends.length,
    knownSkillCount,
    missingSkillsCount: missing.length,
    highPrioritySkillsCount: highPriority.length,
    stale: Boolean(market?.stale),
  });

  return {
    role: targetRole,
    stale: Boolean(market?.stale),
    latest_updated_at: market?.latest_updated_at || null,
    missing_skills: missing,
    high_priority_skills: highPriority,
    market_summary: buildSummary(
      targetRole,
      trends.length,
      knownSkillCount,
      missing,
      highPriority,
      Boolean(market?.stale)
    ),
    recommended_next_step: buildNextStep(highPriority, targetRole, trends.length, knownSkillCount),
    missing_skill_names: toList(missing),
    high_priority_skill_names: toList(highPriority),
  };
}

module.exports = {
  analyzeUserMarketPersonalization,
};
