const JobRole = require('../models/jobRole');

// Get all job roles
const getAllJobRoles = async (req, res) => {
  try {
    const { category_id, seniority_level, search, page = 1, limit = 20 } = req.query;

    let roles = await JobRole.findAll({
      category_id,
      seniority_level,
      is_active: true
    });

    if (search) {
      roles = roles.filter(role =>
        role.title.toLowerCase().includes(search.toLowerCase()) ||
        role.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRoles = roles.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginatedRoles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: roles.length,
        pages: Math.ceil(roles.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get job roles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get job role by ID
const getJobRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await JobRole.findById(id);
    
    if (!role) {
      return res.status(404).json({ success: false, error: 'Job role not found' });
    }

    const roleWithSkills = await JobRole.getRoleWithSkills(id);
    res.json({ success: true, data: roleWithSkills });
  } catch (error) {
    console.error('Get job role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get job role by slug
const getJobRoleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const role = await JobRole.findBySlug(slug);
    
    if (!role) {
      return res.status(404).json({ success: false, error: 'Job role not found' });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Get job role by slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get trending job roles
const getTrendingRoles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const roles = await JobRole.getTrendingRoles(parseInt(limit));

    res.json({
      success: true,
      data: roles,
      count: roles.length
    });
  } catch (error) {
    console.error('Get trending roles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get roles by category
const getRolesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const roles = await JobRole.getByCategory(categoryId);

    res.json({
      success: true,
      data: roles,
      count: roles.length
    });
  } catch (error) {
    console.error('Get roles by category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create job role
const createJobRole = async (req, res) => {
  try {
    const { title, slug, description, category_id, seniority_level, avg_salary_usd } = req.body;

    if (!title || !slug || !category_id) {
      return res.status(400).json({
        success: false,
        error: 'Title, slug, and category_id are required'
      });
    }

    const role = await JobRole.create({
      title,
      slug,
      description,
      category_id,
      seniority_level,
      avg_salary_usd
    });

    res.status(201).json({
      success: true,
      message: 'Job role created successfully',
      data: role
    });
  } catch (error) {
    console.error('Create job role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update job role
const updateJobRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, slug, description, seniority_level, avg_salary_usd, is_active } = req.body;

    const role = await JobRole.update(id, {
      title,
      slug,
      description,
      seniority_level,
      avg_salary_usd,
      is_active
    });

    res.json({
      success: true,
      message: 'Job role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Update job role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete job role
const deleteJobRole = async (req, res) => {
  try {
    const { id } = req.params;
    await JobRole.delete(id);

    res.json({
      success: true,
      message: 'Job role deleted successfully'
    });
  } catch (error) {
    console.error('Delete job role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllJobRoles,
  getJobRoleById,
  getJobRoleBySlug,
  getTrendingRoles,
  getRolesByCategory,
  createJobRole,
  updateJobRole,
  deleteJobRole
};
