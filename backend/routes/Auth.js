const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/AuthController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const isProduction = process.env.NODE_ENV === 'production';

const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 25 : 250,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many failed auth attempts, please try again later.'
  },
});

const tokenRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many token refresh requests, please try again later.'
  },
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim()
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const changePasswordValidation = [
  body('currentPassword').isLength({ min: 6 }).withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
];

// Routes
router.post('/register', authAttemptLimiter, registerValidation, validate, AuthController.register);
router.post('/login', authAttemptLimiter, loginValidation, validate, AuthController.login);
router.post('/refresh-token', tokenRefreshLimiter, AuthController.refreshToken);
router.post('/forgot-password', authAttemptLimiter, forgotPasswordValidation, validate, AuthController.forgotPassword);
router.post('/reset-password', authAttemptLimiter, resetPasswordValidation, validate, AuthController.resetPassword);
router.post('/change-password', protect, changePasswordValidation, validate, AuthController.changePassword);
router.get('/me', protect, AuthController.getCurrentUser);
router.post('/logout', protect, AuthController.logout);

module.exports = router;