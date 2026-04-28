const Category = require('../models/category');

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const stats = await Category.getStatistics(id);

    res.json({
      success: true,
      data: { ...category, statistics: stats }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get category by slug
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findBySlug(slug);
    
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Get category by slug error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, icon } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and slug are required' 
      });
    }

    const category = await Category.create({
      name,
      slug,
      description,
      icon
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon } = req.body;

    const category = await Category.update(id, {
      name,
      slug,
      description,
      icon
    });

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    await Category.delete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
