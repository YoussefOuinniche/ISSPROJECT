const express = require('express');
const chatController = require('../controllers/chatController');

const router = express.Router();

// Get user's chat sessions
router.get('/sessions/:profileId', chatController.getUserSessions);

// Get latest session (or create new)
router.post('/sessions/:profileId', chatController.createSession);

// Get session messages
router.get('/:sessionId/messages', chatController.getSessionMessages);

// Get session by ID
router.get('/:sessionId', chatController.getSessionById);

// Add message to session
router.post('/:sessionId/messages', chatController.addMessage);

// Update session
router.put('/:sessionId', chatController.updateSession);

// Archive session
router.post('/:sessionId/archive', chatController.archiveSession);

// Search messages
router.get('/:sessionId/search', chatController.searchMessages);

// Delete session
router.delete('/:sessionId', chatController.deleteSession);

module.exports = router;
