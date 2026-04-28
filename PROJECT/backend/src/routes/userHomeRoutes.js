const express = require('express');
const { getHomeData } = require('../controllers/userHomeController');
const { userAuth } = require('../middlewares/userAuth');

const router = express.Router();

router.get('/', userAuth, getHomeData);

module.exports = router;
