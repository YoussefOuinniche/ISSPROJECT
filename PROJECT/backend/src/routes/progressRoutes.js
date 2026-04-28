const express = require('express');
const progressController = require('../controllers/progressController');

const router = express.Router();

// Get all progress (admin)
router.get('/', progressController.getAllProgress);

// Get user progress stats
router.get('/user/:profileId/stats', progressController.getUserProgressStats);

// Get user's course progress
router.get('/user/:profileId', progressController.getUserProgress);

// Get course progress by profile and course
router.get('/:profileId/:courseId', progressController.getCourseProgress);

// Start course
router.post('/:profileId/:courseId/start', progressController.startCourse);

// Update course progress
router.put('/:profileId/:courseId', progressController.updateProgress);

// Complete course
router.post('/:profileId/:courseId/complete', progressController.completeCourse);

// Delete progress
router.delete('/:id', progressController.deleteProgress);

module.exports = router;
