const express = require('express');
const { adminLogin, getDashboardStats } = require('../controllers/admincontroller');
const { adminAuth } = require('../middlewares/auth');

const router = express.Router();

// POST /api/admin/login
router.post('/login', adminLogin);

// GET /api/admin/stats  (protected)
router.get('/stats', adminAuth, getDashboardStats);

module.exports = router;
