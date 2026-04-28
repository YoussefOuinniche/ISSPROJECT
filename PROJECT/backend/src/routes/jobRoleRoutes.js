const express = require('express');
const jobRoleController = require('../controllers/jobRoleController');

const router = express.Router();

// Get trending roles
router.get('/trending', jobRoleController.getTrendingRoles);

// Get all job roles
router.get('/', jobRoleController.getAllJobRoles);

// Get roles by category
router.get('/category/:categoryId', jobRoleController.getRolesByCategory);

// Get job role by slug
router.get('/slug/:slug', jobRoleController.getJobRoleBySlug);

// Get job role by ID
router.get('/:id', jobRoleController.getJobRoleById);

// Create job role (admin only)
router.post('/', jobRoleController.createJobRole);

// Update job role (admin only)
router.put('/:id', jobRoleController.updateJobRole);

// Delete job role (admin only)
router.delete('/:id', jobRoleController.deleteJobRole);

module.exports = router;
