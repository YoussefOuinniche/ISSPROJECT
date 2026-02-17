const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

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

// Routes
router.post('/register', registerValidation, validate, AuthController.register);
router.post('/login', loginValidation, validate, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, AuthController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, AuthController.resetPassword);
router.get('/me', protect, AuthController.getCurrentUser);
router.post('/logout', protect, AuthController.logout);

module.exports = router;