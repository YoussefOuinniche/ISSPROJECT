const express = require('express');
const skillController = require('../controllers/skillController');

const router = express.Router();

// Get trending skills
router.get('/trending', skillController.getTrendingSkills);

// Get all skills
router.get('/', skillController.getAllSkills);

// Get skill by slug
router.get('/slug/:slug', skillController.getSkillBySlug);

// Get skill by ID
router.get('/:id', skillController.getSkillById);

// Get skills for a user
router.get('/user/:profileId', skillController.getSkillsByUser);

// Create skill (admin only)
router.post('/', skillController.createSkill);

// Update skill (admin only)
router.put('/:id', skillController.updateSkill);

// Delete skill (admin only)
router.delete('/:id', skillController.deleteSkill);

module.exports = router;
