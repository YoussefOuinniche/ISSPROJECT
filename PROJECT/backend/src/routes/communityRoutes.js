const express = require('express');
const { getShares } = require('../controllers/communityController');

const router = express.Router();

router.get('/shares', getShares);

module.exports = router;
