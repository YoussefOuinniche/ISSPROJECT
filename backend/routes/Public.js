const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/PublicController');
const { protect, requireAdmin } = require('../middleware/auth');

// Public dashboard data used by frontend
router.get('/dashboard', PublicController.getDashboard);

// Admin-only: list all users for admin Users page
router.get('/admin/users', protect, requireAdmin, PublicController.listUsers);
router.patch('/admin/users/:id', protect, requireAdmin, PublicController.updateAdminUser);
router.delete('/admin/users/:id', protect, requireAdmin, PublicController.deleteAdminUser);

// Admin-only: dashboard tab data
router.get('/admin/content', protect, requireAdmin, PublicController.getContentData);
router.get('/admin/analytics', protect, requireAdmin, PublicController.getAnalyticsData);
router.get('/admin/overview', protect, requireAdmin, PublicController.getAdminOverview);
router.post('/admin/profile/recompute', protect, requireAdmin, PublicController.recomputeAdminProfileAnalysis);
router.get('/admin/settings', protect, requireAdmin, PublicController.getSettingsData);
router.patch('/admin/settings', protect, requireAdmin, PublicController.updateAdminSettings);
router.get('/admin/account', protect, requireAdmin, PublicController.getAdminAccount);
router.patch('/admin/account', protect, requireAdmin, PublicController.updateAdminAccount);
router.get('/admin/notifications', protect, requireAdmin, PublicController.getNotifications);
router.post('/admin/notifications/read-all', protect, requireAdmin, PublicController.markAllNotificationsRead);

module.exports = router;
