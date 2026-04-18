const express = require('express');
const { body } = require('express-validator');
const UserAiController = require('../controllers/UserAiController');
const UserController = require('../controllers/UserController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const roleSnapshotValidation = [
  body('role').isString().trim().isLength({ min: 2, max: 120 }),
  body('countries').isArray({ min: 4, max: 8 }),
  body('countries.*').isString().trim().isLength({ min: 2, max: 60 }),
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
  body('sessionId').optional({ nullable: true }).isString().trim(),
];

const aiJobDescriptionValidation = [
  body('role').isString().trim().isLength({ min: 2 }),
  body('perSourceLimit').optional().isInt({ min: 1, max: 10 }),
];

// ── All routes require auth ───────────────────────────────────────────────────

router.use(protect);

// UserAiController routes
router.post('/role-snapshot', roleSnapshotValidation, validate, UserAiController.generateRoleSnapshot);

// ── Chat sessions (ai_chat_sessions table) ───────────────────────────────────
// GET /api/user/ai/chat-sessions  → list user's past sessions
router.get('/chat-sessions', UserController.getChatSessions);

// ── Chat history (ai_chat_messages table) ───────────────────────────────────
// GET /api/user/ai/history?sessionId=<uuid>  → messages for a session
router.get('/history', UserController.getAiHistory);

// ── Chat send ────────────────────────────────────────────────────────────────
// POST /api/user/ai/chat  { message, sessionId? }
router.post('/chat', aiChatValidation, validate, UserController.chatWithAi);

// ── Other AI analysis routes ─────────────────────────────────────────────────
router.post('/skill-gaps/analyze', aiSkillGapValidation, validate, UserController.analyzeSkillGapsWithAi);
router.post('/roadmap', aiRoadmapValidation, validate, UserController.generateRoadmapWithAi);
router.post('/recommendations/generate', aiRecommendationsValidation, validate, UserController.generateRecommendationsWithAi);
router.post('/career-advice', aiCareerAdviceValidation, validate, UserController.getCareerAdviceWithAi);
router.post('/job-description', aiJobDescriptionValidation, validate, UserController.generateJobDescriptionWithAi);

module.exports = router;
