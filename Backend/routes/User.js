const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/UserController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const profileValidation = [
  body('domain').optional().trim(),
  body('title').optional().trim(),
  body('experienceLevel').optional().isIn(['student', 'junior', 'mid', 'senior']),
  body('bio').optional().trim()
];

const explicitProfileValidation = [
  body('skills').optional().isArray({ max: 50 }),
  body('skills.*.name').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('skills.*.level').optional().isIn(['beginner', 'intermediate', 'advanced']),
  body('target_role').optional().isString().trim().isLength({ max: 255 }),
  body('education').optional().isString().trim().isLength({ max: 2000 }),
  body('experience').optional().isString().trim().isLength({ max: 2000 }),
  body('preferences').optional().isObject(),
  body('preferences.domain').optional().isString().trim().isLength({ max: 100 }),
  body('preferences.stack').optional().isString().trim().isLength({ max: 255 }),
];

const addSkillValidation = [
  body('skillId')
    .customSanitizer((value) => String(value ?? '').trim().replace(/^"+|"+$/g, ''))
    .matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    .withMessage('Valid skill ID is required'),
  body('proficiencyLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('yearsOfExperience').optional().isFloat({ min: 0 })
];

const aiSkillGapValidation = [
  body('targetRole').optional().isString().trim(),
];

const aiRoadmapValidation = [
  body('role').optional().isString().trim(),
  body('targetRole').optional().isString().trim(),
  body('timeframeMonths').optional().isInt({ min: 1, max: 24 }),
];

const aiRecommendationsValidation = [
  body('count').optional().isInt({ min: 1, max: 20 }),
];

const aiCareerAdviceValidation = [
  body('question').isString().trim().isLength({ min: 5 }),
];

const aiChatValidation = [
  body('message').isString().trim().isLength({ min: 1, max: 4000 }),
];

const aiJobDescriptionValidation = [
  body('role').isString().trim().isLength({ min: 2 }),
  body('perSourceLimit').optional().isInt({ min: 1, max: 10 }),
];

// Protected routes (require authentication)
router.use(protect);

// Profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', profileValidation, validate, UserController.upsertProfile);
router.post('/profile', profileValidation, validate, UserController.upsertProfile);
router.post('/profile/update', explicitProfileValidation, validate, UserController.updateExplicitProfile);
router.post('/profile/recompute', UserController.recomputeProfileAnalysis);

// User info routes
router.put('/update', UserController.updateUser);
router.delete('/account', UserController.deleteAccount);

// User skills routes
router.get('/skills', UserController.getUserSkills);
router.post('/skills', addSkillValidation, validate, UserController.addSkill);
router.put('/skills/:skillId', UserController.updateSkill);
router.delete('/skills/:skillId', UserController.removeSkill);

// Skill gaps routes
router.get('/skill-gaps', UserController.getSkillGaps);

// Recommendations routes
router.get('/recommendations', UserController.getRecommendations);

// AI routes
router.post('/ai/skill-gaps/analyze', aiSkillGapValidation, validate, UserController.analyzeSkillGapsWithAi);
router.post('/ai/roadmap', aiRoadmapValidation, validate, UserController.generateRoadmapWithAi);
router.post('/ai/recommendations/generate', aiRecommendationsValidation, validate, UserController.generateRecommendationsWithAi);
router.post('/ai/career-advice', aiCareerAdviceValidation, validate, UserController.getCareerAdviceWithAi);
router.get('/ai/history', UserController.getAiHistory);
router.post('/ai/chat', aiChatValidation, validate, UserController.chatWithAi);
router.post('/ai/job-description', aiJobDescriptionValidation, validate, UserController.generateJobDescriptionWithAi);
// Dashboard route
router.get('/dashboard', UserController.getDashboard);

// Market intelligence routes (cached-first, backend-driven)
router.get('/market-trends/role/:role', UserController.getRoleMarketTrends);
router.get('/market-trends/role', UserController.getRoleMarketTrends);
router.get('/market-trends/global', UserController.getGlobalMarketTrends);
router.get('/market-trends/personalized', UserController.getPersonalizedMarketInsights);
router.post('/market-trends/refresh', UserController.refreshRoleMarketTrends);

module.exports = router;
