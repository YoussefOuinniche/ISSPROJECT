const express = require('express');
const { body } = require('express-validator');
const UserAiController = require('../controllers/UserAiController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const roleSnapshotValidation = [
  body('role').isString().trim().isLength({ min: 2, max: 120 }),
  body('countries').isArray({ min: 4, max: 8 }),
  body('countries.*').isString().trim().isLength({ min: 2, max: 60 }),
];

router.use(protect);

router.post('/role-snapshot', roleSnapshotValidation, validate, UserAiController.generateRoleSnapshot);

module.exports = router;
