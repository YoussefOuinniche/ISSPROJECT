const express = require('express');
const courseController = require('../controllers/courseController');

const router = express.Router();

// Get all courses
router.get('/', courseController.getAllCourses);

// Get course stats
router.get('/stats', courseController.getCourseStats);

// Get course by slug
router.get('/slug/:slug', courseController.getCourseBySlug);

// Get courses by category
router.get('/category/:categoryId', courseController.getCoursesByCategory);

// Get course by ID
router.get('/:id', courseController.getCourseById);

// Create course (admin only)
router.post('/', courseController.createCourse);

// Update course (admin only)
router.put('/:id', courseController.updateCourse);

// Delete course (admin only)
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
