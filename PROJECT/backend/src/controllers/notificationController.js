const Notification = require('../models/notification');

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { is_read, type, page = 1, limit = 20 } = req.query;

    let notifications = await Notification.getUserNotifications(profileId, {
      is_read: is_read !== undefined ? is_read === 'true' : undefined,
      type
    });

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginated = notifications.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: notifications.length,
        pages: Math.ceil(notifications.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const { profileId } = req.params;

    const count = await Notification.getUnreadCount(profileId);

    res.json({
      success: true,
      data: { unread_count: count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get notification by ID
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.getById(id);

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Mark as read
    if (!notification.is_read) {
      await Notification.markAsRead(id);
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create notification
const createNotification = async (req, res) => {
  try {
    const { profile_id, type, title, body } = req.body;

    if (!profile_id || !type || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'profile_id, type, title, and body are required'
      });
    }

    const notification = await Notification.create({
      profile_id,
      type,
      title,
      body
    });

    res.status(201).json({
      success: true,
      message: 'Notification created',
      data: notification
    });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.markAsRead(id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    const { profileId } = req.params;

    const notifications = await Notification.markAllAsRead(profileId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: { updated_count: notifications.length }
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await Notification.delete(id);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete all read notifications
const deleteAllRead = async (req, res) => {
  try {
    const { profileId } = req.params;

    const deleted = await Notification.deleteAllRead(profileId);

    res.json({
      success: true,
      message: 'All read notifications deleted',
      data: { deleted_count: deleted.length }
    });
  } catch (error) {
    console.error('Delete all read error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get notification statistics
const getNotificationStats = async (req, res) => {
  try {
    const { profileId } = req.params;

    const stats = await Notification.getUserNotificationStats(profileId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationStats
};
