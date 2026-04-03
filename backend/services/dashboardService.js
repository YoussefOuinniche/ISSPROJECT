const { Profile, UserSkill, SkillGap, Recommendation } = require('../models');
const { buildAiSummary, normalizeAiProfile } = require('./aiProfileService');

async function resolveOptional(label, operation, fallbackValue) {
  try {
    return await operation();
  } catch (error) {
    console.warn(`[dashboardService] Optional dashboard dependency failed for ${label}:`, error.message);
    return fallbackValue;
  }
}

async function getUserDashboardSnapshot(userId, options = {}) {
  const recentRecommendationDays = Number.isFinite(options.recentRecommendationDays)
    ? options.recentRecommendationDays
    : 7;
  const recentRecommendationLimit = Number.isFinite(options.recentRecommendationLimit)
    ? options.recentRecommendationLimit
    : 8;

  const [profile, storedAiProfile, skills, skillGaps, recommendations, gapStats] = await Promise.all([
    Profile.getFullProfile(userId),
    resolveOptional('storedAiProfile', () => Profile.getStoredAiProfile(userId), {}),
    resolveOptional('skills', () => UserSkill.getUserSkills(userId), []),
    resolveOptional('skillGaps', () => SkillGap.findByUserId(userId), []),
    resolveOptional(
      'recommendations',
      () => Recommendation.getRecentRecommendations(userId, recentRecommendationDays, recentRecommendationLimit),
      []
    ),
    resolveOptional(
      'gapStats',
      () => SkillGap.getUserGapStats(userId),
      { total_gaps: 0, avg_gap_level: 0, high_priority_count: 0, domains_with_gaps: 0 }
    ),
  ]);

  const ai_profile = normalizeAiProfile(storedAiProfile, {
    skillGaps,
    recommendations,
  }, profile);
  const ai_summary = buildAiSummary(ai_profile, profile);

  return {
    profile,
    skills,
    skillGaps,
    recentRecommendations: recommendations,
    gapStatistics: gapStats,
    ai_profile,
    ai_summary,
  };
}

module.exports = {
  getUserDashboardSnapshot,
};
