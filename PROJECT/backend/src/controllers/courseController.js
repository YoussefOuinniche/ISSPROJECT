const Course = require('../models/course');
const { supabaseAdmin } = require('../config/database');

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const { category_id, difficulty, is_active, search, page = 1, limit = 20 } = req.query;
    
    const filters = {};
    if (category_id) filters.category_id = category_id;
    if (difficulty) filters.difficulty_level = difficulty;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    let courses = await Course.findAll(filters);

    if (search) {
      courses = courses.filter(course =>
        course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedCourses = courses.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginatedCourses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: courses.length,
        pages: Math.ceil(courses.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get course by slug
const getCourseBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const course = await Course.findBySlug(slug);
    
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Get course by slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get courses by category
const getCoursesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 20 } = req.query;
    
    const courses = await Course.getByCategory(categoryId, parseInt(limit));

    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Get courses by category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create course
const createCourse = async (req, res) => {
  try {
    const { title, slug, description, provider, url, thumbnail_url, duration_hours, difficulty, category_id } = req.body;

    if (!title || !slug) {
      return res.status(400).json({
        success: false,
        error: 'Title and slug are required'
      });
    }

    // Create course
    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .insert([{
        title,
        slug,
        description,
        provider,
        url,
        thumbnail_url,
        duration_hours,
        difficulty,
        category_id,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: course, error } = await supabaseAdmin
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get course statistics
const getCourseStats = async (req, res) => {
  try {
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, is_active, difficulty');

    if (coursesError) throw coursesError;

    const stats = {
      total_courses: courses.length,
      active_courses: courses.filter(c => c.is_active).length,
      by_difficulty: {
        beginner: courses.filter(c => c.difficulty === 'beginner').length,
        intermediate: courses.filter(c => c.difficulty === 'intermediate').length,
        advanced: courses.filter(c => c.difficulty === 'advanced').length
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  getCourseBySlug,
  getCoursesByCategory,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStats
};
