const User = require('../models/User');
const Profile = require('../models/Profile');
const UserSkill = require('../models/Userskill');
const SkillGap = require('../models/Skillgap');
const Recommendation = require('../models/Recommendation');

class UserController {
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
      const { skillId, proficiencyLevel, yearsOfExperience } = req.body;

      if (!skillId) {
        return res.status(400).json({
          success: false,
          message: 'Skill ID is required'
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
      const { skillId } = req.params;
      const updates = req.body;

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
      const { skillId } = req.params;

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

      // Fetch all user-related data in parallel
      const [profile, skills, skillGaps, recommendations, gapStats] = await Promise.all([
        Profile.getFullProfile(userId),
        UserSkill.getUserSkills(userId),
        SkillGap.findByUserId(userId),
        Recommendation.getRecentRecommendations(userId, 7, 5),
        SkillGap.getUserGapStats(userId)
      ]);

      res.status(200).json({
        success: true,
        data: {
          profile,
          skills,
          skillGaps,
          recentRecommendations: recommendations,
          gapStatistics: gapStats
        }
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