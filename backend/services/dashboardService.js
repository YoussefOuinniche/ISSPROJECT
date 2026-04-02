const { Profile, UserSkill, SkillGap, Recommendation } = require('../models');

async function getUserDashboardSnapshot(userId, options = {}) {
  const recentRecommendationDays = Number.isFinite(options.recentRecommendationDays)
    ? options.recentRecommendationDays
    : 7;
  const recentRecommendationLimit = Number.isFinite(options.recentRecommendationLimit)
    ? options.recentRecommendationLimit
    : 8;

  const [profile, skills, skillGaps, recommendations, gapStats] = await Promise.all([
    Profile.getFullProfile(userId),
    UserSkill.getUserSkills(userId),
    SkillGap.findByUserId(userId),
    Recommendation.getRecentRecommendations(userId, recentRecommendationDays, recentRecommendationLimit),
    SkillGap.getUserGapStats(userId),
  ]);

  return {
    profile,
    skills,
    skillGaps,
    recentRecommendations: recommendations,
    gapStatistics: gapStats,
  };
}

module.exports = {
  getUserDashboardSnapshot,
};