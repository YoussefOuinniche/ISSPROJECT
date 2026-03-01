const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/PublicController');

// Public dashboard data used by frontend
router.get('/dashboard', PublicController.getDashboard);

module.exports = router;
