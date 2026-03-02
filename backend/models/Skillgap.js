const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SkillGap = sequelize.define('SkillGap', {
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
    domain: {
      type: DataTypes.STRING,
    },
    skill_name: {
      type: DataTypes.STRING,
    },
    skill_id: {
      type: DataTypes.UUID,
      references: { model: 'skills', key: 'id' },
    },
    gap_level: {
      type: DataTypes.INTEGER,
    },
    reason: {
      type: DataTypes.TEXT,
    },
  }, {
    tableName: 'skill_gaps',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  SkillGap.associate = (models) => {
    SkillGap.belongsTo(models.User, { foreignKey: 'user_id' });
    SkillGap.belongsTo(models.Skill, { foreignKey: 'skill_id' });
  };

  return SkillGap;
};