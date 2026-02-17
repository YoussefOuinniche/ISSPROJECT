const Skill = require('../models/Skill');
const UserSkill = require('../models/Userskill');

class SkillController {
  // Get all skills
  static async getAllSkills(req, res) {
    try {
      const { limit, offset, category } = req.query;

      let skills;
      if (category) {
        skills = await Skill.findByCategory(
          category,
          parseInt(limit) || 100,
          parseInt(offset) || 0
        );
      } else {
        skills = await Skill.findAll(
          parseInt(limit) || 100,
          parseInt(offset) || 0
        );
      }

      res.status(200).json({
        success: true,
        data: skills
      });
    } catch (error) {
      console.error('Get all skills error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching skills',
        error: error.message
      });
    }
  }

  // Get skill by ID
  static async getSkillById(req, res) {
    try {
      const { id } = req.params;
      const skill = await Skill.findById(id);

      if (!skill) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found'
        });
      }

      res.status(200).json({
        success: true,
        data: skill
      });
    } catch (error) {
      console.error('Get skill error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching skill',
        error: error.message
      });
    }
  }

  // Search skills
  static async searchSkills(req, res) {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const skills = await Skill.search(q, parseInt(limit) || 20);

      res.status(200).json({
        success: true,
        data: skills
      });
    } catch (error) {
      console.error('Search skills error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching skills',
        error: error.message
      });
    }
  }

  // Get skill categories
  static async getCategories(req, res) {
    try {
      const categories = await Skill.getCategories();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message
      });
    }
  }

  // Get skill statistics
  static async getSkillStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await UserSkill.getSkillStats(id);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get skill stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching skill statistics',
        error: error.message
      });
    }
  }

  // Create new skill (admin only)
  static async createSkill(req, res) {
    try {
      const { name, category } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Skill name is required'
        });
      }

      // Check if skill already exists
      const existingSkill = await Skill.findByName(name);
      if (existingSkill) {
        return res.status(400).json({
          success: false,
          message: 'Skill already exists'
        });
      }

      const skill = await Skill.create(name, category);

      res.status(201).json({
        success: true,
        message: 'Skill created successfully',
        data: skill
      });
    } catch (error) {
      console.error('Create skill error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating skill',
        error: error.message
      });
    }
  }

  // Update skill (admin only)
  static async updateSkill(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const skill = await Skill.update(id, updates);

      if (!skill) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Skill updated successfully',
        data: skill
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

  // Delete skill (admin only)
  static async deleteSkill(req, res) {
    try {
      const { id } = req.params;

      const deletedSkill = await Skill.delete(id);

      if (!deletedSkill) {
        return res.status(404).json({
          success: false,
          message: 'Skill not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Skill deleted successfully'
      });
    } catch (error) {
      console.error('Delete skill error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting skill',
        error: error.message
      });
    }
  }

  // Bulk create skills (admin only)
  static async bulkCreateSkills(req, res) {
    try {
      const { skills } = req.body;

      if (!Array.isArray(skills) || skills.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Skills array is required'
        });
      }

      const createdSkills = await Skill.bulkCreate(skills);

      res.status(201).json({
        success: true,
        message: `${createdSkills.length} skills created successfully`,
        data: createdSkills
      });
    } catch (error) {
      console.error('Bulk create skills error:', error);
      res.status(500).json({
        success: false,
        message: 'Error bulk creating skills',
        error: error.message
      });
    }
  }
}

module.exports = SkillController;
