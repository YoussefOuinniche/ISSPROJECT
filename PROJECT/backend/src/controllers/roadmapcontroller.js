const Roadmap = require('../models/roadmap');
const { supabaseAdmin } = require('../config/database');

// Get all roadmaps
const getAllRoadmaps = async (req, res) => {
  try {
    const { status, profile_id, page = 1, limit = 20 } = req.query;

    let roadmaps = await Roadmap.findAll({
      status,
      user_id: profile_id
    });

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = roadmaps.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: roadmaps.length,
        pages: Math.ceil(roadmaps.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get roadmaps error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get roadmap by ID
const getRoadmapById = async (req, res) => {
  try {
    const { id } = req.params;

    const roadmap = await Roadmap.findById(id);

    if (!roadmap) {
      return res.status(404).json({ success: false, error: 'Roadmap not found' });
    }

    res.json({ success: true, data: roadmap });
  } catch (error) {
    console.error('Get roadmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get user's roadmaps
const getUserRoadmaps = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { status } = req.query;

    let roadmaps = await Roadmap.findAll({
      status,
      user_id: profileId
    });

    res.json({
      success: true,
      data: roadmaps,
      count: roadmaps.length
    });
  } catch (error) {
    console.error('Get user roadmaps error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create roadmap
const createRoadmap = async (req, res) => {
  try {
    const { profile_id, job_role_id, title, summary, estimated_weeks, ai_model } = req.body;

    if (!profile_id || !job_role_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'profile_id, job_role_id, and title are required'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('ai_roadmaps')
      .insert([{
        profile_id,
        job_role_id,
        title,
        summary,
        estimated_weeks,
        ai_model,
        status: 'generating'
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Roadmap created',
      data: data
    });
  } catch (error) {
    console.error('Create roadmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update roadmap status
const updateRoadmapStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const roadmap = await Roadmap.updateStatus(id, status);

    res.json({
      success: true,
      message: 'Roadmap status updated',
      data: roadmap
    });
  } catch (error) {
    console.error('Update roadmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get roadmap steps
const getRoadmapSteps = async (req, res) => {
  try {
    const { roadmapId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('ai_roadmap_steps')
      .select(`
        *,
        skills!left (name),
        courses!left (title, slug)
      `)
      .eq('roadmap_id', roadmapId)
      .order('step_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Get roadmap steps error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update roadmap step
const updateRoadmapStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { status, completed_at } = req.body;

    const { data, error } = await supabaseAdmin
      .from('ai_roadmap_steps')
      .update({ status, completed_at, updated_at: new Date() })
      .eq('id', stepId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Step updated',
      data: data
    });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get roadmap statistics
const getRoadmapStatistics = async (req, res) => {
  try {
    const stats = await Roadmap.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get roadmap stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete roadmap
const deleteRoadmap = async (req, res) => {
  try {
    const { id } = req.params;

    await Roadmap.delete(id);

    res.json({
      success: true,
      message: 'Roadmap deleted'
    });
  } catch (error) {
    console.error('Delete roadmap error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllRoadmaps,
  getRoadmapById,
  getUserRoadmaps,
  createRoadmap,
  updateRoadmapStatus,
  getRoadmapSteps,
  updateRoadmapStep,
  getRoadmapStatistics,
  deleteRoadmap
};
