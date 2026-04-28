const express = require('express');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get category by slug
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// Get category by ID
router.get('/:id', categoryController.getCategoryById);

// Create category (admin only)
router.post('/', categoryController.createCategory);

// Update category (admin only)
router.put('/:id', categoryController.updateCategory);

// Delete category (admin only)
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
