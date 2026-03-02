const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Skill = sequelize.define('Skill', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
  }, {
    tableName: 'skills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Skill.associate = (models) => {
    Skill.hasMany(models.UserSkill, { foreignKey: 'skill_id' });
    Skill.hasMany(models.SkillGap, { foreignKey: 'skill_id' });
    Skill.hasMany(models.Recommendation, { foreignKey: 'skill_id' });
    Skill.hasMany(models.TrendSkill, { foreignKey: 'skill_id' });
  };

  return Skill;
};