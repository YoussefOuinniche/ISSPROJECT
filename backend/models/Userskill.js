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

  return UserSkill;
};