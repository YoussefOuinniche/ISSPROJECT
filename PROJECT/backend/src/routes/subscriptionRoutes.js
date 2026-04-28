const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

// Get subscription stats
router.get('/stats', subscriptionController.getSubscriptionStats);

// Get expiring subscriptions
router.get('/expiring', subscriptionController.getExpiringSubscriptions);

// Get all subscriptions (admin)
router.get('/', subscriptionController.getAllSubscriptions);

// Get user subscription
router.get('/user/:profileId', subscriptionController.getUserSubscription);

// Get subscription by ID
router.get('/:id', subscriptionController.getSubscriptionById);

// Create subscription
router.post('/', subscriptionController.createSubscription);

// Cancel subscription
router.put('/:id/cancel', subscriptionController.cancelSubscription);

module.exports = router;
