const Progress = require('../models/progress');

// Get all progress
const getAllProgress = async (req, res) => {
  try {
    const { profile_id, course_id, status, page = 1, limit = 20 } = req.query;

    let progress = await Progress.findAll({
      profile_id,
      course_id,
      status
    });

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = progress.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: progress.length,
        pages: Math.ceil(progress.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get user's course progress
const getUserProgress = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { status } = req.query;

    const progress = await Progress.getUserProgress(profileId, { status });

    res.json({
      success: true,
      data: progress,
      count: progress.length
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get user progress statistics
const getUserProgressStats = async (req, res) => {
  try {
    const { profileId } = req.params;

    const stats = await Progress.getUserStatistics(profileId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get course progress by profile and course
const getCourseProgress = async (req, res) => {
  try {
    const { profileId, courseId } = req.params;

    const progress = await Progress.getUserCourseProgress(profileId, courseId);

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Progress not found' });
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get course progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Start course
const startCourse = async (req, res) => {
  try {
    const { profileId, courseId } = req.params;

    const progress = await Progress.startCourse(profileId, courseId);

    res.status(201).json({
      success: true,
      message: 'Course started',
      data: progress
    });
  } catch (error) {
    console.error('Start course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update course progress
const updateProgress = async (req, res) => {
  try {
    const { profileId, courseId } = req.params;
    const { progress_pct, status } = req.body;

    const existing = await Progress.getUserCourseProgress(profileId, courseId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Progress not found' });
    }

    const updated = await Progress.update(existing.id, {
      progress_pct,
      status
    });

    res.json({
      success: true,
      message: 'Progress updated',
      data: updated
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Complete course
const completeCourse = async (req, res) => {
  try {
    const { profileId, courseId } = req.params;

    const progress = await Progress.completeCourse(profileId, courseId);

    res.json({
      success: true,
      message: 'Course completed',
      data: progress
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete progress
const deleteProgress = async (req, res) => {
  try {
    const { id } = req.params;

    await Progress.delete(id);

    res.json({
      success: true,
      message: 'Progress deleted'
    });
  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProgress,
  getUserProgress,
  getUserProgressStats,
  getCourseProgress,
  startCourse,
  updateProgress,
  completeCourse,
  deleteProgress
};
