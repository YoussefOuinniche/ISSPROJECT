const Chat = require('../models/chat');

// Get user's chat sessions
const getUserSessions = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { status } = req.query;

    const sessions = await Chat.getUserSessions(profileId, { status });

    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get chat session by ID
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Chat.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const messages = await Chat.getSessionMessages(sessionId);
    const stats = await Chat.getSessionStatistics(sessionId);

    res.json({
      success: true,
      data: {
        ...session,
        messages,
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create chat session
const createSession = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { title } = req.body;

    const session = await Chat.createSession(profileId, title);

    res.status(201).json({
      success: true,
      message: 'Chat session created',
      data: session
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get session messages
const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await Chat.getSessionMessages(sessionId);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add message to session
const addMessage = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, content, metadata } = req.body;

    if (!role || !content) {
      return res.status(400).json({
        success: false,
        error: 'Role and content are required'
      });
    }

    const message = await Chat.addMessage(sessionId, role, content, metadata);

    res.status(201).json({
      success: true,
      message: 'Message added',
      data: message
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update session
const updateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, status } = req.body;

    const updated = await Chat.updateSession(sessionId, { title, status });

    res.json({
      success: true,
      message: 'Session updated',
      data: updated
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Archive session
const archiveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const updated = await Chat.archiveSession(sessionId);

    res.json({
      success: true,
      message: 'Session archived',
      data: updated
    });
  } catch (error) {
    console.error('Archive session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete session
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Chat.deleteSession(sessionId);

    res.json({
      success: true,
      message: 'Session deleted'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Search messages
const searchMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const messages = await Chat.searchMessages(sessionId, query);

    res.json({
      success: true,
      data: messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUserSessions,
  getSessionById,
  createSession,
  getSessionMessages,
  addMessage,
  updateSession,
  archiveSession,
  deleteSession,
  searchMessages
};
