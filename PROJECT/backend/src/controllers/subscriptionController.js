const Subscription = require('../models/subscription');
const Plan = require('../models/plan');
const { supabaseAdmin } = require('../config/database');

// Get all subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const { status, plan_id, profile_id, page = 1, limit = 20 } = req.query;

    let subscriptions = await Subscription.findAll({
      status,
      plan_id,
      profile_id
    });

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = subscriptions.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: subscriptions.length,
        pages: Math.ceil(subscriptions.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get subscription by ID
const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found' });
    }

    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get user's active subscription
const getUserSubscription = async (req, res) => {
  try {
    const { profileId } = req.params;

    const subscriptions = await Subscription.getActiveByUser(profileId);

    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    console.error('Get user subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create subscription
const createSubscription = async (req, res) => {
  try {
    const { profile_id, plan_id, status, current_period_end } = req.body;

    if (!profile_id || !plan_id || !current_period_end) {
      return res.status(400).json({
        success: false,
        error: 'profile_id, plan_id, and current_period_end are required'
      });
    }

    const subscription = await Subscription.create({
      profile_id,
      plan_id,
      status: status || 'active',
      current_period_end
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created',
      data: subscription
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.update(id, {
      status: 'cancelled',
      cancelled_at: new Date()
    });

    res.json({
      success: true,
      message: 'Subscription cancelled',
      data: subscription
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get expiring subscriptions
const getExpiringSubscriptions = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .in('status', ['active', 'trialing'])
      .lte('current_period_end', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
      .gte('current_period_end', new Date().toISOString());

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      count: data.length
    });
  } catch (error) {
    console.error('Get expiring subscriptions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get subscription statistics
const getSubscriptionStats = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('status');

    if (error) throw error;

    const stats = {
      total_subscriptions: data.length,
      by_status: {
        active: 0,
        cancelled: 0,
        expired: 0,
        past_due: 0,
        trialing: 0
      }
    };

    data.forEach(sub => {
      stats.by_status[sub.status] = (stats.by_status[sub.status] || 0) + 1;
    });

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllSubscriptions,
  getSubscriptionById,
  getUserSubscription,
  createSubscription,
  cancelSubscription,
  getExpiringSubscriptions,
  getSubscriptionStats
};
