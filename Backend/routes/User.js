const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const UserController = require('../controllers/Usercontroller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const profileValidation = [
  body('domain').optional().trim(),
  body('title').optional().trim(),
  body('experienceLevel').optional().isIn(['student', 'junior', 'mid', 'senior']),
  body('bio').optional().trim()
];

const addSkillValidation = [
  body('skillId').isUUID().withMessage('Valid skill ID is required'),
  body('proficiencyLevel').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
  body('yearsOfExperience').optional().isFloat({ min: 0 })
];

// Protected routes (require authentication)
router.use(protect);

// Profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', profileValidation, validate, UserController.upsertProfile);
router.post('/profile', profileValidation, validate, UserController.upsertProfile);

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

// Dashboard route
router.get('/dashboard', UserController.getDashboard);

module.exports = router;