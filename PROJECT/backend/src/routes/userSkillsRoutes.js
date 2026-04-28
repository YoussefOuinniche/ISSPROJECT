const express = require('express');
const { getUserSkills, addUserSkill, updateUserSkill, deleteUserSkill } = require('../controllers/userSkillsController');
const { userAuth } = require('../middlewares/userAuth');

const router = express.Router();

router.get('/',          userAuth, getUserSkills);
router.post('/',         userAuth, addUserSkill);
router.put('/:skillId',  userAuth, updateUserSkill);
router.delete('/:skillId', userAuth, deleteUserSkill);

module.exports = router;
