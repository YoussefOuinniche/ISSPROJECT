const { User, Profile, ChatHistory, UserSkill, SkillGap, Recommendation, RoleMarket } = require('../models');
const {
  recomputeUserAnalysis,
  requestAiSkillGapAnalysis,
  requestAiRoadmap,
  requestAiRecommendations,
  requestAiCareerAdvice,
  requestAiChat,
  requestAiJobDescription,
  triggerAiProfileExtraction,
} = require('../services/analysisService');
const {
  buildAiSummary,
  buildProfileEnvelope,
  normalizeExplicitProfile,
  normalizeAiProfile,
} = require('../services/aiProfileService');
const { getUserDashboardSnapshot } = require('../services/dashboardService');
const {
  extractTargetRoleFromText,
  getGlobalMarketTrends,
  getRoleMarketTrendsForUser,
  refreshMarketTrendsForRole,
  resolvePreferredTargetRole,
} = require('../services/marketIntelligenceService');
const {
  analyzeUserMarketPersonalization,
} = require('../services/marketPersonalizationService');

async function resolveOptional(label, operation, fallbackValue) {
  try {
    return await operation();
  } catch (error) {
    console.warn(`[UserController] Optional profile dependency failed for ${label}:`, error.message);
    return fallbackValue;
  }
}

class UserController {
  static normalizeUuid(value) {
    return String(value || '')
      .trim()
      .replace(/^"+|"+$/g, '');
  }

  static isUuid(value) {
    // PostgreSQL uuid accepts any canonical 8-4-4-4-12 hex format, not only RFC versioned values.
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  static extractTargetRoleFromProfilePayload(profileData = {}) {
    const directFields = [
      profileData.target_role,
      profileData.targetRole,
      profileData.explicitTargetRole,
    ];

    for (const candidate of directFields) {
      const cleaned = String(candidate || '').trim();
      if (cleaned) {
        return cleaned;
      }
    }

    return extractTargetRoleFromText(profileData.bio || '');
  }

  static triggerMarketRefreshInBackground(role) {
    const cleanRole = String(role || '').trim();
    if (!cleanRole) {
      return;
    }

    setImmediate(() => {
      void refreshMarketTrendsForRole(cleanRole).catch((error) => {
        console.warn('Market trends background refresh failed:', error.message || error);
      });
    });
  }

  static async buildDegradedProfilePayload(userId) {
    const [user, profile] = await Promise.all([
      resolveOptional('fallbackUser', () => User.findById(userId), null),
      resolveOptional('fallbackProfile', () => Profile.getFullProfile(userId), null),
    ]);

    return buildProfileEnvelope({
      user,
      profile,
      storedAiProfile: {},
      skillGaps: [],
      recommendations: [],
    });
  }

  static async buildDegradedDashboardPayload(userId) {
    const [profile, skills] = await Promise.all([
      resolveOptional('fallbackDashboardProfile', () => Profile.getFullProfile(userId), null),
      resolveOptional('fallbackDashboardSkills', () => UserSkill.getUserSkills(userId), []),
    ]);

    const ai_profile = normalizeAiProfile({}, {
      skillGaps: [],
      recommendations: [],
    }, profile);
    const ai_summary = buildAiSummary(ai_profile, profile);

    return {
      profile,
      skills,
      skillGaps: [],
      recentRecommendations: [],
      gapStatistics: {
        total_gaps: 0,
        avg_gap_level: 0,
        high_priority_count: 0,
        domains_with_gaps: 0,
      },
      ai_profile,
      ai_summary,
    };
  }

  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const [user, profile, storedAiProfile, skillGaps, recommendations] = await Promise.all([
        User.findById(userId),
        Profile.getFullProfile(userId),
        resolveOptional('storedAiProfile', () => Profile.getStoredAiProfile(userId), {}),
        resolveOptional('skillGaps', () => SkillGap.findByUserId(userId), []),
        resolveOptional('recommendations', () => Recommendation.getRecentRecommendations(userId, 30, 8), []),
      ]);

      const payload = buildProfileEnvelope({
        user,
        profile,
        storedAiProfile,
        skillGaps,
        recommendations,
      });

      const market = await resolveOptional(
        'marketTrends',
        () =>
          getRoleMarketTrendsForUser(userId, {
            limit: 16,
            summaryLimit: 3,
            refreshIfStale: true,
          }),
        {
          success: true,
          role: null,
          stale: true,
          latest_updated_at: null,
          trends: [],
          summary: [],
        }
      );

      const marketPersonalization = await resolveOptional(
        'marketPersonalizationProfile',
        () =>
          analyzeUserMarketPersonalization(userId, {
            role: market.role || null,
            marketData: market,
            profile,
            storedAiProfile,
          }),
        {
          role: market.role || null,
          stale: Boolean(market.stale),
          latest_updated_at: market.latest_updated_at || null,
          missing_skills: [],
          high_priority_skills: [],
          market_summary: 'Personalized market insights are temporarily unavailable.',
          recommended_next_step: 'Refresh trends to regenerate personalized guidance.',
          missing_skill_names: [],
          high_priority_skill_names: [],
        }
      );

      payload.market_intelligence = {
        role: market.role || null,
        stale: Boolean(market.stale),
        updated_at: market.latest_updated_at || null,
        summary: Array.isArray(market.summary) ? market.summary : [],
        trends: Array.isArray(market.trends) ? market.trends : [],
        personalization: marketPersonalization,
      };

      payload.market_personalization = marketPersonalization;

      payload.ai_summary = {
        ...payload.ai_summary,
        market_role: market.role || null,
        market_stale: Boolean(market.stale),
        market_updated_at: market.latest_updated_at || null,
        market_short_summary: Array.isArray(market.summary) ? market.summary : [],
        market_summary: marketPersonalization.market_summary || null,
        recommended_next_step: marketPersonalization.recommended_next_step || null,
        high_priority_skills: Array.isArray(marketPersonalization.high_priority_skill_names)
          ? marketPersonalization.high_priority_skill_names
          : [],
        missing_skills: Array.isArray(marketPersonalization.missing_skill_names)
          ? marketPersonalization.missing_skill_names
          : [],
        missing_market_skills: Array.isArray(marketPersonalization.missing_skill_names)
          ? marketPersonalization.missing_skill_names
          : [],
      };

      res.status(200).json({
        success: true,
        data: payload
      });
    } catch (error) {
      console.error('Get profile error:', error);
      const fallbackPayload = await UserController.buildDegradedProfilePayload(req.user.id);
      res.status(200).json({
        success: true,
        data: fallbackPayload,
        meta: {
          degraded: true,
          message: 'Profile insights are temporarily unavailable.',
          error: error.message,
        }
      });
    }
  }

  // Create or update profile
  static async upsertProfile(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;

      // Check if profile exists
      const existingProfile = await Profile.findByUserId(userId);

      let profile;
      if (existingProfile) {
        // Update existing profile
        profile = await Profile.update(userId, profileData);
      } else {
        // Create new profile
        profile = await Profile.create(userId, profileData);
      }

      const previousTargetRole = extractTargetRoleFromText(existingProfile?.bio || '');
      const newTargetRole = UserController.extractTargetRoleFromProfilePayload({
        ...profileData,
        bio: profile?.bio || profileData?.bio,
      });

      if (
        newTargetRole &&
        newTargetRole.toLowerCase() !== String(previousTargetRole || '').toLowerCase()
      ) {
        UserController.triggerMarketRefreshInBackground(newTargetRole);
      }

      res.status(200).json({
        success: true,
        message: existingProfile ? 'Profile updated' : 'Profile created',
        data: profile
      });
    } catch (error) {
      console.error('Upsert profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error saving profile',
        error: error.message
      });
    }
  }

  // Update user information
  static async updateUser(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated this way
      delete updates.password_hash;
      delete updates.refresh_token;
      delete updates.reset_password_token;

      const user = await User.update(userId, updates);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user',
        error: error.message
      });
    }
  }

  // Get user skills
  static async getUserSkills(req, res) {
    try {
      const userId = req.user.id;
      const skills = await UserSkill.getUserSkills(userId);

      res.status(200).json({
        success: true,
        data: skills
      });
    } catch (error) {
      console.error('Get user skills error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user skills',
        error: error.message
      });
    }
  }

  // Add skill to user
  static async addSkill(req, res) {
    try {
      const userId = req.user.id;
      const { proficiencyLevel, yearsOfExperience } = req.body;
      const skillId = UserController.normalizeUuid(req.body.skillId);

      if (!skillId) {
        return res.status(400).json({
          success: false,
          message: 'Skill ID is required'
        });
      }

      if (!UserController.isUuid(skillId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid skill ID format'
        });
      }

      const userSkill = await UserSkill.create(
        userId,
        skillId,
        proficiencyLevel || 'beginner',
        yearsOfExperience || 0
      );

      res.status(201).json({
        success: true,
        message: 'Skill added successfully',
        data: userSkill
      });
    } catch (error) {
      console.error('Add skill error:', error);
      res.status(500).json({
        success: false,
        message: 'Error adding skill',
        error: error.message
      });
    }
  }

  // Update user skill
  static async updateSkill(req, res) {
    try {
      const userId = req.user.id;
      const skillId = UserController.normalizeUuid(req.params.skillId);

      if (!UserController.isUuid(skillId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid skill ID format',
          received: req.params.skillId
        });
      }

      const updates = {};
      if (req.body.proficiencyLevel !== undefined) {
        const allowed = ['beginner', 'intermediate', 'advanced', 'expert'];
        if (!allowed.includes(req.body.proficiencyLevel)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid proficiency level'
          });
        }
        updates.proficiencyLevel = req.body.proficiencyLevel;
      }

      if (req.body.yearsOfExperience !== undefined) {
        const years = Number(req.body.yearsOfExperience);
        if (!Number.isFinite(years) || years < 0) {
          return res.status(400).json({
            success: false,
            message: 'yearsOfExperience must be a non-negative number'
          });
        }
        updates.yearsOfExperience = years;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update. Use proficiencyLevel and/or yearsOfExperience.'
        });
      }

      const userSkill = await UserSkill.update(userId, skillId, updates);

      if (!userSkill) {
        return res.status(404).json({
          success: false,
          message: 'User skill not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Skill updated successfully',
        data: userSkill
      });
    } catch (error) {
      console.error('Update skill error:', error);
      if (error && error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Invalid skill ID format'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error updating skill',
        error: error.message
      });
    }
  }

  // Remove skill from user
  static async removeSkill(req, res) {
    try {
      const userId = req.user.id;
      const skillId = UserController.normalizeUuid(req.params.skillId);

      if (!UserController.isUuid(skillId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid skill ID format',
          received: req.params.skillId
        });
      }

      const deletedSkill = await UserSkill.delete(userId, skillId);

      if (!deletedSkill) {
        return res.status(404).json({
          success: false,
          message: 'User skill not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Skill removed successfully'
      });
    } catch (error) {
      console.error('Remove skill error:', error);
      if (error && error.code === '22P02') {
        return res.status(400).json({
          success: false,
          message: 'Invalid skill ID format'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Error removing skill',
        error: error.message
      });
    }
  }

  // Get user skill gaps
  static async getSkillGaps(req, res) {
    try {
      const userId = req.user.id;
      const { domain } = req.query;

      let skillGaps;
      if (domain) {
        skillGaps = await SkillGap.findByUserAndDomain(userId, domain);
      } else {
        skillGaps = await SkillGap.findByUserId(userId);
      }

      res.status(200).json({
        success: true,
        data: skillGaps
      });
    } catch (error) {
      console.error('Get skill gaps error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching skill gaps',
        error: error.message
      });
    }
  }

  // Get recommendations
  static async getRecommendations(req, res) {
    try {
      const userId = req.user.id;
      const { type, limit, offset } = req.query;

      let recommendations;
      if (type) {
        recommendations = await Recommendation.findByUserAndType(userId, type, parseInt(limit) || 20);
      } else {
        recommendations = await Recommendation.findByUserId(
          userId,
          parseInt(limit) || 50,
          parseInt(offset) || 0
        );
      }

      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Get recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recommendations',
        error: error.message
      });
    }
  }

  // Get dashboard data (comprehensive user overview)
  static async getDashboard(req, res) {
    try {
      const userId = req.user.id;

      const dashboard = await getUserDashboardSnapshot(userId, {
        recentRecommendationDays: 7,
        recentRecommendationLimit: 5,
      });

      const market = await resolveOptional(
        'marketTrendsDashboard',
        () =>
          getRoleMarketTrendsForUser(userId, {
            limit: 20,
            summaryLimit: 3,
            refreshIfStale: true,
          }),
        {
          success: true,
          role: null,
          stale: true,
          latest_updated_at: null,
          trends: [],
          summary: [],
        }
      );

      const marketPersonalization = await resolveOptional(
        'marketPersonalizationDashboard',
        () =>
          analyzeUserMarketPersonalization(userId, {
            role: market.role || null,
            marketData: market,
            profile: dashboard.profile,
            storedAiProfile: dashboard.ai_profile,
          }),
        {
          role: market.role || null,
          stale: Boolean(market.stale),
          latest_updated_at: market.latest_updated_at || null,
          missing_skills: [],
          high_priority_skills: [],
          market_summary: 'Personalized market insights are temporarily unavailable.',
          recommended_next_step: 'Refresh trends to regenerate personalized guidance.',
          missing_skill_names: [],
          high_priority_skill_names: [],
        }
      );

      dashboard.marketInsights = {
        role: market.role || null,
        stale: Boolean(market.stale),
        updated_at: market.latest_updated_at || null,
        short_summary: Array.isArray(market.summary) ? market.summary : [],
        trends: Array.isArray(market.trends) ? market.trends : [],
        rising_skills: (Array.isArray(market.summary) ? market.summary : []).map((item) => item.skill).filter(Boolean),
        personalization: marketPersonalization,
      };

      if (dashboard.ai_summary && typeof dashboard.ai_summary === 'object') {
        dashboard.ai_summary = {
          ...dashboard.ai_summary,
          market_role: market.role || null,
          market_stale: Boolean(market.stale),
          market_updated_at: market.latest_updated_at || null,
          market_short_summary: Array.isArray(market.summary) ? market.summary : [],
          market_summary: marketPersonalization.market_summary || null,
          recommended_next_step: marketPersonalization.recommended_next_step || null,
          high_priority_skills: Array.isArray(marketPersonalization.high_priority_skill_names)
            ? marketPersonalization.high_priority_skill_names
            : [],
          missing_skills: Array.isArray(marketPersonalization.missing_skill_names)
            ? marketPersonalization.missing_skill_names
            : [],
          missing_market_skills: Array.isArray(marketPersonalization.missing_skill_names)
            ? marketPersonalization.missing_skill_names
            : [],
        };
      }

      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      const fallbackDashboard = await UserController.buildDegradedDashboardPayload(req.user.id);
      res.status(200).json({
        success: true,
        data: fallbackDashboard,
        meta: {
          degraded: true,
          message: 'Dashboard insights are temporarily unavailable.',
          error: error.message,
        }
      });
    }
  }

  static async getRolesCatalog(req, res) {
    try {
      const countryCode = String(req.query?.country || req.query?.countryCode || '').trim().toUpperCase();
      const search = String(req.query?.search || '').trim();
      const limit = Number(req.query?.limit);

      const roles = await RoleMarket.getRolesCatalog({
        countryCode: countryCode || undefined,
        search: search || undefined,
        limit: Number.isFinite(limit) ? limit : undefined,
      });

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('Get roles catalog error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching roles catalog',
        error: error.message,
      });
    }
  }

  static async getRoleBySlug(req, res) {
    try {
      const slug = String(req.params?.slug || '').trim().toLowerCase();
      const role = await RoleMarket.findRoleBySlug(slug);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }

      res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      console.error('Get role by slug error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching role',
        error: error.message,
      });
    }
  }

  static async getCountriesCatalog(req, res) {
    try {
      const countries = await RoleMarket.getCountriesCatalog();

      res.status(200).json({
        success: true,
        data: countries,
      });
    } catch (error) {
      console.error('Get countries catalog error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching countries catalog',
        error: error.message,
      });
    }
  }

  static async getRoleMarketOverview(req, res) {
    try {
      const slug = String(req.params?.slug || '').trim().toLowerCase();
      const countryCode = String(req.query?.country || req.query?.countryCode || '').trim().toUpperCase();

      const payload = await RoleMarket.getRoleMarketOverview(slug, countryCode || undefined);

      if (!payload) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }

      res.status(200).json({
        success: true,
        data: payload,
      });
    } catch (error) {
      console.error('Get role market overview error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching role market overview',
        error: error.message,
      });
    }
  }

  static async getRoleMarketTrends(req, res) {
    try {
      const userId = req.user.id;
      const requestedRole = String(req.params?.role || req.query?.role || '').trim();
      const requestedLimit = Number(req.query?.limit);
      const refreshIfStaleRaw = String(req.query?.refreshIfStale ?? '1').trim().toLowerCase();
      const refreshIfStale = !['0', 'false', 'off', 'no'].includes(refreshIfStaleRaw);

      const data = await getRoleMarketTrendsForUser(userId, {
        role: requestedRole || null,
        limit: Number.isFinite(requestedLimit) ? requestedLimit : 50,
        summaryLimit: 3,
        refreshIfStale,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get role market trends error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error fetching role market trends',
        error: error.message,
      });
    }
  }

  static async getGlobalMarketTrends(req, res) {
    try {
      const requestedLimit = Number(req.query?.limit);
      const data = await getGlobalMarketTrends({
        limit: Number.isFinite(requestedLimit) ? requestedLimit : 50,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get global market trends error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error fetching global market trends',
        error: error.message,
      });
    }
  }

  static async getPersonalizedMarketInsights(req, res) {
    try {
      const userId = req.user.id;
      const requestedRole = String(req.query?.role || '').trim();
      const requestedLimit = Number(req.query?.limit);
      const refreshIfStaleRaw = String(req.query?.refreshIfStale ?? '1').trim().toLowerCase();
      const refreshIfStale = !['0', 'false', 'off', 'no'].includes(refreshIfStaleRaw);

      const data = await analyzeUserMarketPersonalization(userId, {
        role: requestedRole || null,
        limit: Number.isFinite(requestedLimit) ? requestedLimit : 80,
        refreshIfStale,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get personalized market insights error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error fetching personalized market insights',
        error: error.message,
      });
    }
  }

  static async refreshRoleMarketTrends(req, res) {
    try {
      const userId = req.user.id;
      let requestedRole = String(req.body?.role || '').trim();

      if (!requestedRole) {
        const [profile, storedAiProfile] = await Promise.all([
          Profile.getFullProfile(userId).catch(() => null),
          Profile.getStoredAiProfile(userId).catch(() => ({})),
        ]);
        requestedRole = resolvePreferredTargetRole(profile, storedAiProfile, null);
      }

      if (!requestedRole) {
        return res.status(400).json({
          success: false,
          message: 'Target role is required to refresh market trends.',
        });
      }

      const searchLimit = Number(req.body?.searchLimit ?? 20);
      const refreshed = await refreshMarketTrendsForRole(requestedRole, { searchLimit });
      const cached = await getRoleMarketTrendsForUser(userId, {
        role: requestedRole,
        limit: 50,
        summaryLimit: 3,
        refreshIfStale: false,
      });

      res.status(200).json({
        success: true,
        data: {
          refresh: refreshed,
          cached,
        },
      });
    } catch (error) {
      console.error('Refresh role market trends error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error refreshing role market trends',
        error: error.message,
      });
    }
  }

  static async updateExplicitProfile(req, res) {
    try {
      const userId = req.user.id;
      const existingProfileBefore = await resolveOptional(
        'existingProfileBeforeExplicitUpdate',
        () => Profile.getFullProfile(userId),
        null
      );
      const explicitPayload = {
        explicitSkills: Array.isArray(req.body?.skills) ? req.body.skills : [],
        explicitTargetRole: typeof req.body?.target_role === 'string' ? req.body.target_role.trim() : null,
        explicitEducation: typeof req.body?.education === 'string' ? req.body.education.trim() : null,
        explicitExperience: typeof req.body?.experience === 'string' ? req.body.experience.trim() : null,
        explicitPreferences:
          req.body?.preferences && typeof req.body.preferences === 'object'
            ? {
                domain:
                  typeof req.body.preferences.domain === 'string'
                    ? req.body.preferences.domain.trim()
                    : '',
                stack:
                  typeof req.body.preferences.stack === 'string'
                    ? req.body.preferences.stack.trim()
                    : '',
              }
            : {},
      };

      await Profile.upsertExplicitProfile(userId, explicitPayload);

      const [user, profile, storedAiProfile, skillGaps, recommendations] = await Promise.all([
        User.findById(userId),
        Profile.getFullProfile(userId),
        resolveOptional('storedAiProfile', () => Profile.getStoredAiProfile(userId), {}),
        resolveOptional('skillGaps', () => SkillGap.findByUserId(userId), []),
        resolveOptional('recommendations', () => Recommendation.getRecentRecommendations(userId, 30, 8), []),
      ]);

      const envelope = buildProfileEnvelope({
        user,
        profile,
        storedAiProfile,
        skillGaps,
        recommendations,
      });

      if (explicitPayload.explicitTargetRole) {
        const previousTargetRole = String(existingProfileBefore?.explicit_target_role || '').trim();
        if (
          explicitPayload.explicitTargetRole.toLowerCase() !== previousTargetRole.toLowerCase()
        ) {
          UserController.triggerMarketRefreshInBackground(explicitPayload.explicitTargetRole);
        }

        setImmediate(() => {
          void Promise.allSettled([
            requestAiSkillGapAnalysis(userId, explicitPayload.explicitTargetRole),
            requestAiRoadmap(userId, { role: explicitPayload.explicitTargetRole }),
          ]).then((results) => {
            const [gapResult, roadmapResult] = results;
            if (gapResult.status === 'rejected') {
              console.warn('Explicit profile update could not refresh skill-gap analysis:', gapResult.reason?.message || gapResult.reason);
            }
            if (roadmapResult.status === 'rejected') {
              console.warn('Explicit profile update could not refresh roadmap:', roadmapResult.reason?.message || roadmapResult.reason);
            }
          });
        });
      }

      res.status(200).json({
        success: true,
        message: 'Explicit profile updated successfully',
        data: {
          explicit_profile: normalizeExplicitProfile(profile),
          profile: envelope,
        },
      });
    } catch (error) {
      console.error('Update explicit profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating explicit profile',
        error: error.message,
      });
    }
  }

  // Recompute AI-backed analysis and return persisted dashboard data
  static async recomputeProfileAnalysis(req, res) {
    try {
      const userId = req.user.id;
      const targetRole = typeof req.body?.targetRole === 'string' ? req.body.targetRole.trim() : undefined;

      const result = await recomputeUserAnalysis(userId, {
        targetRole: targetRole || undefined,
      });

      res.status(200).json({
        success: true,
        message: 'Profile analysis recomputed from AI and persisted',
        data: result,
      });
    } catch (error) {
      console.error('Recompute profile analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Error recomputing profile analysis',
        error: error.message,
      });
    }
  }

  // Trigger AI skill-gap analysis for the current user.
  static async analyzeSkillGapsWithAi(req, res) {
    try {
      const userId = req.user.id;
      const targetRole = typeof req.body?.targetRole === 'string' ? req.body.targetRole.trim() : undefined;

      const result = await requestAiSkillGapAnalysis(userId, targetRole || undefined);
      res.status(200).json({
        success: true,
        message: 'AI skill-gap analysis completed',
        data: result,
      });
    } catch (error) {
      console.error('Analyze skill gaps with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error running AI skill-gap analysis',
        error: error.message,
      });
    }
  }

  // Generate a roadmap from AI for the current user.
  static async generateRoadmapWithAi(req, res) {
    try {
      const userId = req.user.id;
      const role =
        typeof req.body?.role === 'string' && req.body.role.trim()
          ? req.body.role.trim()
          : (typeof req.body?.targetRole === 'string' ? req.body.targetRole.trim() : undefined);

      const result = await requestAiRoadmap(userId, {
        role: role || undefined,
      });

      res.status(200).json({
        success: true,
        message: 'AI roadmap generated',
        data: result,
      });
    } catch (error) {
      console.error('Generate roadmap with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error generating AI roadmap',
        error: error.message,
      });
    }
  }

  // Generate and persist AI recommendations for the current user.
  static async generateRecommendationsWithAi(req, res) {
    try {
      const userId = req.user.id;
      const count = Number(req.body?.count ?? 8);
      const result = await requestAiRecommendations(userId, count);

      res.status(200).json({
        success: true,
        message: 'AI recommendations generated',
        data: result,
      });
    } catch (error) {
      console.error('Generate recommendations with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error generating AI recommendations',
        error: error.message,
      });
    }
  }

  // Return AI career advice based on a user question.
  static async getCareerAdviceWithAi(req, res) {
    try {
      const userId = req.user.id;
      const question = String(req.body?.question || '').trim();
      const result = await requestAiCareerAdvice(question, userId);

      res.status(200).json({
        success: true,
        message: 'AI career advice generated',
        data: result,
      });
    } catch (error) {
      console.error('Get career advice with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error getting AI career advice',
        error: error.message,
      });
    }
  }

  // Return AI chat advice immediately and trigger profile extraction asynchronously.
  static async chatWithAi(req, res) {
    try {
      const userId = req.user.id;
      const message = String(req.body?.message || '').trim();

      const result = await requestAiChat(userId, message);
      if (!result.degraded) {
        triggerAiProfileExtraction(userId, message);
      }

      const payload = {
        response: result.response,
        message_id: result.messageId,
        conversation_summary: result.conversationSummary,
      };

      res.status(200).json({
        success: true,
        ...payload,
        data: payload,
        ...(result.degraded ? { meta: { degraded: true } } : {}),
      });
    } catch (error) {
      console.error('Chat with AI error:', error);
      res.status(200).json({
        success: true,
        response: 'The AI assistant is temporarily unavailable. Please try again in a moment.',
        message_id: null,
        conversation_summary: {
          skills_mentioned: [],
          goals_mentioned: [],
        },
        data: {
          response: 'The AI assistant is temporarily unavailable. Please try again in a moment.',
          message_id: null,
          conversation_summary: {
            skills_mentioned: [],
            goals_mentioned: [],
          },
        },
        meta: {
          degraded: true,
        },
      });
    }
  }

  static async getAiHistory(req, res) {
    try {
      const userId = req.user.id;
      const requestedLimit = Number(req.query?.limit);
      const limit = Number.isFinite(requestedLimit)
        ? Math.max(1, Math.min(200, requestedLimit))
        : 100;

      const messages = await ChatHistory.findByUserId(userId, limit);

      res.status(200).json({
        success: true,
        messages,
      });
    } catch (error) {
      console.error('Get AI history error:', error);
      res.status(200).json({
        success: true,
        messages: [],
        meta: {
          degraded: true,
          message: 'AI chat history is temporarily unavailable.',
          error: error.message,
        },
      });
    }
  }

  // Generate IT job description content from AI.
  static async generateJobDescriptionWithAi(req, res) {
    try {
      const role = String(req.body?.role || '').trim();
      const perSourceLimit = Number(req.body?.perSourceLimit ?? 5);
      const result = await requestAiJobDescription(role, perSourceLimit);

      res.status(200).json({
        success: true,
        message: 'AI job description generated',
        data: result,
      });
    } catch (error) {
      console.error('Generate job description with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error generating AI job description',
        error: error.message,
      });
    }
  }

  // Delete user account
  static async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      // Delete user (cascades to related tables)
      await User.delete(userId);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting account',
        error: error.message
      });
    }
  }
}

module.exports = UserController;
