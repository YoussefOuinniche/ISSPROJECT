const Plan = require('../models/plan');

// Get all plans
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll();

    res.json({
      success: true,
      data: plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get plan by ID
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await Plan.findById(id);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    const subscriptions = await Plan.getSubscriptionsCount(id);

    res.json({
      success: true,
      data: {
        ...plan,
        subscriptions_by_status: subscriptions
      }
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get plan by slug
const getPlanBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const plan = await Plan.findBySlug(slug);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    res.json({ success: true, data: plan });
  } catch (error) {
    console.error('Get plan by slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get active plans
const getActivePlans = async (req, res) => {
  try {
    const plans = await Plan.findAll();
    const active = plans.filter(p => p.is_active);

    res.json({
      success: true,
      data: active,
      count: active.length
    });
  } catch (error) {
    console.error('Get active plans error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create plan
const createPlan = async (req, res) => {
  try {
    const { name, price_usd, interval, features } = req.body;

    if (!name || price_usd === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name and price_usd are required'
      });
    }

    const plan = await Plan.create({
      name,
      price_usd,
      interval: interval || 'monthly',
      features: features || {}
    });

    res.status(201).json({
      success: true,
      message: 'Plan created',
      data: plan
    });
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update plan
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_usd, interval, features, is_active } = req.body;

    const plan = await Plan.update(id, {
      name,
      price_usd,
      interval,
      features,
      is_active
    });

    res.json({
      success: true,
      message: 'Plan updated',
      data: plan
    });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete plan
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    await Plan.delete(id);

    res.json({
      success: true,
      message: 'Plan deleted'
    });
  } catch (error) {
    if (error.message.includes('active subscriptions')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete plan with active subscriptions'
      });
    }
    console.error('Delete plan error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  getPlanBySlug,
  getActivePlans,
  createPlan,
  updatePlan,
  deletePlan
};
