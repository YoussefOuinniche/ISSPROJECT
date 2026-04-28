const JobMarketTrend = require('../models/jobMarketTrend');

// Get all trends
const getAllTrends = async (req, res) => {
  try {
    const { job_role_id, demand_index, page = 1, limit = 20 } = req.query;

    let trends = await JobMarketTrend.findAll({
      job_role_id,
      demand_index
    });

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = trends.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: trends.length,
        pages: Math.ceil(trends.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get trend by ID
const getTrendById = async (req, res) => {
  try {
    const { id } = req.params;

    const trend = await JobMarketTrend.findById(id);

    if (!trend) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }

    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('Get trend error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get trend by job role
const getTrendByJobRole = async (req, res) => {
  try {
    const { jobRoleId } = req.params;

    const trend = await JobMarketTrend.getByJobRoleId(jobRoleId);

    if (!trend) {
      return res.status(404).json({ success: false, error: 'Trend not found' });
    }

    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('Get trend by job role error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get trending roles
const getTrendingRoles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trends = await JobMarketTrend.getTrendingRoles(parseInt(limit));

    res.json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Get trending roles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get declining roles
const getDecliningRoles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trends = await JobMarketTrend.getDecliningRoles(parseInt(limit));

    res.json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Get declining roles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get stable roles
const getStableRoles = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const trends = await JobMarketTrend.getStableRoles(parseInt(limit));

    res.json({
      success: true,
      data: trends,
      count: trends.length
    });
  } catch (error) {
    console.error('Get stable roles error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create or update trend
const upsertTrend = async (req, res) => {
  try {
    const { job_role_id, growth_percentage, openings_count, demand_index } = req.body;

    if (!job_role_id) {
      return res.status(400).json({
        success: false,
        error: 'job_role_id is required'
      });
    }

    const trend = await JobMarketTrend.upsert({
      job_role_id,
      growth_percentage,
      openings_count,
      demand_index
    });

    res.status(201).json({
      success: true,
      message: 'Trend saved',
      data: trend
    });
  } catch (error) {
    console.error('Upsert trend error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get market statistics
const getMarketStats = async (req, res) => {
  try {
    const stats = await JobMarketTrend.getMarketStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get market stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllTrends,
  getTrendById,
  getTrendByJobRole,
  getTrendingRoles,
  getDecliningRoles,
  getStableRoles,
  upsertTrend,
  getMarketStats
};
