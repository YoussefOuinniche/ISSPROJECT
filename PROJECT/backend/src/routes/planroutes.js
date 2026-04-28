const express = require('express');
const planController = require('../controllers/plancontroller');

const router = express.Router();

// Get active plans
router.get('/active', planController.getActivePlans);

// Get all plans
router.get('/', planController.getAllPlans);

// Get plan by slug
router.get('/slug/:slug', planController.getPlanBySlug);

// Get plan by ID
router.get('/:id', planController.getPlanById);

// Create plan (admin only)
router.post('/', planController.createPlan);

// Update plan (admin only)
router.put('/:id', planController.updatePlan);

// Delete plan (admin only)
router.delete('/:id', planController.deletePlan);

module.exports = router;
