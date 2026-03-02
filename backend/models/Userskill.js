const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSkill = sequelize.define('UserSkill', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    skill_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'skills', key: 'id' },
    },
    proficiency_level: {
      type: DataTypes.STRING,
    },
    years_of_experience: {
      type: DataTypes.DECIMAL,
    },
  }, {
    tableName: 'user_skills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  UserSkill.associate = (models) => {
    UserSkill.belongsTo(models.User, { foreignKey: 'user_id' });
    UserSkill.belongsTo(models.Skill, { foreignKey: 'skill_id' });
  };

  // ---- static helpers -----------------------------------------------------

  UserSkill.getUserSkills = async function (userId) {
    return await this.findAll({
      where: { user_id: userId },
      include: [this.sequelize.models.Skill],
    });
  };

  UserSkill.getSkillStats = async function (skillId) {
    return await this.findAll({
      where: { skill_id: skillId },
      attributes: [
        'proficiency_level',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count'],
      ],
      group: ['proficiency_level'],
    });
  };

  UserSkill.create = async function (userId, skillId, proficiencyLevel = 'beginner', yearsOfExperience = 0) {
    return await this.sequelize.models.UserSkill.create({
      user_id: userId,
      skill_id: skillId,
      proficiency_level: proficiencyLevel,
      years_of_experience: yearsOfExperience,
    });
  };

  UserSkill.update = async function (userId, skillId, updates) {
    const [count] = await this.sequelize.models.UserSkill.update(updates, {
      where: { user_id: userId, skill_id: skillId },
    });
    if (!count) return null;
    return this.findOne({ where: { user_id: userId, skill_id: skillId } });
  };

  UserSkill.delete = async function (userId, skillId) {
    return await this.destroy({ where: { user_id: userId, skill_id: skillId } });
  };

  return UserSkill;
};