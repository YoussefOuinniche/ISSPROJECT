const express = require('express');
const jobMarketTrendController = require('../controllers/jobMarketTrendController');

const router = express.Router();

// Get market statistics
router.get('/market/stats', jobMarketTrendController.getMarketStats);

// Get trending roles
router.get('/trending', jobMarketTrendController.getTrendingRoles);

// Get declining roles
router.get('/declining', jobMarketTrendController.getDecliningRoles);

// Get stable roles
router.get('/stable', jobMarketTrendController.getStableRoles);

// Get all trends
router.get('/', jobMarketTrendController.getAllTrends);

// Get trend by job role
router.get('/role/:jobRoleId', jobMarketTrendController.getTrendByJobRole);

// Get trend by ID
router.get('/:id', jobMarketTrendController.getTrendById);

// Create or update trend (admin only)
router.post('/', jobMarketTrendController.upsertTrend);

module.exports = router;
