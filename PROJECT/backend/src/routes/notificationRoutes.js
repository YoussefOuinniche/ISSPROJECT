const express = require('express');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Get user notifications
router.get('/:profileId', notificationController.getUserNotifications);

// Get unread count
router.get('/:profileId/unread', notificationController.getUnreadCount);

// Get notification stats
router.get('/:profileId/stats', notificationController.getNotificationStats);

// Get notification by ID
router.get('/:id', notificationController.getNotificationById);

// Create notification
router.post('/', notificationController.createNotification);

// Mark as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/:profileId/mark-all-read', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Delete all read
router.delete('/:profileId/delete-read', notificationController.deleteAllRead);

module.exports = router;
