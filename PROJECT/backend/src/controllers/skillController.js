const Skill = require('../models/skill');

// Get all skills
const getAllSkills = async (req, res) => {
  try {
    const { category_id, search } = req.query;
    const skills = await Skill.findAll({ category_id });
    
    let filtered = skills;
    if (search) {
      filtered = skills.filter(skill =>
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: filtered,
      count: filtered.length
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get skill by ID
const getSkillById = async (req, res) => {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id);
    
    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    console.error('Get skill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get skill by slug
const getSkillBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const skill = await Skill.findBySlug(slug);
    
    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    console.error('Get skill by slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get trending skills
const getTrendingSkills = async (req, res) => {
  try {
    const skills = await Skill.findAll();
    const trending = skills
      .filter(s => s.trend_score)
      .sort((a, b) => b.trend_score - a.trend_score)
      .slice(0, 10);

    res.json({
      success: true,
      data: trending,
      count: trending.length
    });
  } catch (error) {
    console.error('Get trending skills error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create skill
const createSkill = async (req, res) => {
  try {
    const { name, slug, description, category_id } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Name and slug are required'
      });
    }

    const skill = await Skill.create({
      name,
      slug,
      description,
      category_id
    });

    res.status(201).json({
      success: true,
      message: 'Skill created successfully',
      data: skill
    });
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update skill
const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, category_id } = req.body;

    const skill = await Skill.update(id, {
      name,
      slug,
      description,
      category_id
    });

    res.json({
      success: true,
      message: 'Skill updated successfully',
      data: skill
    });
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete skill
const deleteSkill = async (req, res) => {
  try {
    const { id } = req.params;
    await Skill.delete(id);

    res.json({
      success: true,
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get skills by user
const getSkillsByUser = async (req, res) => {
  try {
    const { profileId } = req.params;
    const skills = await Skill.getSkillsByUser(profileId);

    res.json({
      success: true,
      data: skills,
      count: skills.length
    });
  } catch (error) {
    console.error('Get user skills error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllSkills,
  getSkillById,
  getSkillBySlug,
  getTrendingSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillsByUser
};
