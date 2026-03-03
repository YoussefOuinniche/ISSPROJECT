const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/PublicController');
const { protect, requireAdmin } = require('../middleware/auth');

// Public dashboard data used by frontend
router.get('/dashboard', PublicController.getDashboard);

// Admin-only: list all users for admin Users page
router.get('/admin/users', protect, requireAdmin, PublicController.listUsers);

// Admin-only: dashboard tab data
router.get('/admin/content', protect, requireAdmin, PublicController.getContentData);
router.get('/admin/analytics', protect, requireAdmin, PublicController.getAnalyticsData);
router.get('/admin/settings', protect, requireAdmin, PublicController.getSettingsData);

module.exports = router;
