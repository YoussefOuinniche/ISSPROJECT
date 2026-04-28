const express = require('express');
const roadmapController = require('../controllers/roadmapcontroller');

const router = express.Router();

// Get roadmap statistics
router.get('/stats', roadmapController.getRoadmapStatistics);

// Get all roadmaps (admin)
router.get('/', roadmapController.getAllRoadmaps);

// Get user roadmaps
router.get('/user/:profileId', roadmapController.getUserRoadmaps);

// Get roadmap steps
router.get('/:roadmapId/steps', roadmapController.getRoadmapSteps);

// Get roadmap by ID
router.get('/:id', roadmapController.getRoadmapById);

// Create roadmap
router.post('/', roadmapController.createRoadmap);

// Update roadmap status
router.put('/:id/status', roadmapController.updateRoadmapStatus);

// Update roadmap step
router.put('/steps/:stepId', roadmapController.updateRoadmapStep);

// Delete roadmap
router.delete('/:id', roadmapController.deleteRoadmap);

module.exports = router;
