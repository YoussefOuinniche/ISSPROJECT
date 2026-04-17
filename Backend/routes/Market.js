const express = require('express');
const { body } = require('express-validator');
const MarketController = require('../controllers/MarketController');
const { protect, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const ingestMarketValidation = [
  body('roleSlugs').optional().isArray().withMessage('roleSlugs must be an array'),
  body('roleSlugs.*').optional().isString().trim().notEmpty(),
  body('countryCode').optional().isString().trim().isLength({ min: 2, max: 3 }),
  body('countryCodes').optional().isArray().withMessage('countryCodes must be an array'),
  body('countryCodes.*').optional().isString().trim().isLength({ min: 2, max: 3 }),
  body('sourceNames').optional().isArray().withMessage('sourceNames must be an array'),
  body('sourceNames.*').optional().isString().trim().notEmpty(),
  body('includeSalaries').optional().isBoolean().withMessage('includeSalaries must be a boolean'),
  body('includeDemand').optional().isBoolean().withMessage('includeDemand must be a boolean'),
  body('limitRoles').optional().isInt({ min: 1, max: 200 }).withMessage('limitRoles must be between 1 and 200'),
  body('limitCountries')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('limitCountries must be between 1 and 200'),
];

router.post('/ingest', protect, requireAdmin, ingestMarketValidation, validate, MarketController.ingestRoleMarket);

module.exports = router;
