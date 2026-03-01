const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const TrendController = require('../controllers/TrendController');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const createTrendValidation = [
  body('title').trim().notEmpty().withMessage('Trend title is required'),
  body('domain').optional().trim(),
  body('description').optional().trim(),
  body('source').optional().trim()
];

const bulkCreateValidation = [
  body('trends').isArray({ min: 1 }).withMessage('Trends array is required')
];

// Public routes (no authentication required)
router.get('/', optionalAuth, TrendController.getAllTrends);
router.get('/recent', optionalAuth, TrendController.getRecentTrends);
router.get('/search', optionalAuth, TrendController.searchTrends);
router.get('/domains', optionalAuth, TrendController.getDomains);
router.get('/:id', optionalAuth, TrendController.getTrendById);

// Protected routes (admin only - you can add admin middleware here)
router.post('/', protect, createTrendValidation, validate, TrendController.createTrend);
router.post('/bulk', protect, bulkCreateValidation, validate, TrendController.bulkCreateTrends);
router.put('/:id', protect, TrendController.updateTrend);
router.delete('/:id', protect, TrendController.deleteTrend);

module.exports = router;