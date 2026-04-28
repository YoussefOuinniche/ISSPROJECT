const express = require('express');
const { getUserProfile, upsertUserProfile } = require('../controllers/userProfileController');
const { userAuth } = require('../middlewares/userAuth');

const router = express.Router();

router.get('/',  userAuth, getUserProfile);
router.put('/',  userAuth, upsertUserProfile);
router.post('/', userAuth, upsertUserProfile);

module.exports = router;
