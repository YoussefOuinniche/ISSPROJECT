'use strict';
/**
 * qwen.js — Express router for Qwen 2.5 endpoints
 * Mounted at /api/qwen in app.js
 */

const express = require('express');
const router  = express.Router();
const { chat, score, generateRoadmap, status } = require('../controllers/qwenController');

// GET  /api/qwen/status         — check whether real API key is configured
router.get('/status', status);

// POST /api/qwen/chat           — forward a chat turn to Qwen 2.5
router.post('/chat', chat);

// POST /api/qwen/score          — score a single candidate answer
router.post('/score', score);

// POST /api/qwen/roadmap        — generate full roadmap + mountain params
router.post('/roadmap', generateRoadmap);

module.exports = router;
