const { User, Profile, UserSkill, SkillGap, Recommendation } = require('../models');
const {
  recomputeUserAnalysis,
  requestAiSkillGapAnalysis,
  requestAiRoadmap,
  requestAiRecommendations,
  requestAiCareerAdvice,
  requestAiJobDescription,
} = require('../services/analysisService');
const { getUserDashboardSnapshot } = require('../services/dashboardService');

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

  // Get user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await Profile.getFullProfile(userId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Profile not found'
        });
      }

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching profile',
        error: error.message
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

      res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard data',
        error: error.message
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
      const targetRole = typeof req.body?.targetRole === 'string' ? req.body.targetRole.trim() : undefined;
      const timeframeMonths = Number(req.body?.timeframeMonths ?? 6);

      const result = await requestAiRoadmap(userId, {
        targetRole: targetRole || undefined,
        timeframeMonths,
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