const express = require('express');
const { register, login, refreshToken, getMe, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/me', getMe);
router.post('/logout', logout);

module.exports = router;
