const express = require('express');
const { getChatHistory, sendChatMessage, searchJobs, getTrendingJobs, generateRoadmap, ollamaComplete } = require('../controllers/userAiController');
const { userAuth } = require('../middlewares/userAuth');

const router = express.Router();

router.get('/history',       userAuth, getChatHistory);
router.post('/chat',         userAuth, sendChatMessage);
router.get('/jobs/search',   userAuth, searchJobs);
router.get('/jobs/trending',  userAuth, getTrendingJobs);
router.post('/roadmap',       userAuth, generateRoadmap);
router.post('/complete',      userAuth, ollamaComplete);

module.exports = router;
