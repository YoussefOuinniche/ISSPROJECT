const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const SkillController = require('../controllers/SkillController');
const { protect, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const createSkillValidation = [
  body('name').trim().notEmpty().withMessage('Skill name is required'),
  body('category').optional().trim()
];

const bulkCreateValidation = [
  body('skills').isArray({ min: 1 }).withMessage('Skills array is required')
];

// Public routes (no authentication required)
router.get('/', optionalAuth, SkillController.getAllSkills);
router.get('/search', optionalAuth, SkillController.searchSkills);
router.get('/categories', optionalAuth, SkillController.getCategories);
router.get('/:id', optionalAuth, SkillController.getSkillById);
router.get('/:id/stats', optionalAuth, SkillController.getSkillStats);

// Protected routes (admin only - you can add admin middleware here)
router.post('/', protect, createSkillValidation, validate, SkillController.createSkill);
router.post('/bulk', protect, bulkCreateValidation, validate, SkillController.bulkCreateSkills);
router.put('/:id', protect, SkillController.updateSkill);
router.delete('/:id', protect, SkillController.deleteSkill);

module.exports = router;