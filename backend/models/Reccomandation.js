const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recommendation = sequelize.define('Recommendation', {
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
    type: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
    },
    skill_name: {
      type: DataTypes.STRING,
    },
    skill_id: {
      type: DataTypes.UUID,
      references: { model: 'skills', key: 'id' },
    },
    trend_title: {
      type: DataTypes.STRING,
    },
    trend_id: {
      type: DataTypes.UUID,
      references: { model: 'trends', key: 'id' },
    },
  }, {
    tableName: 'recommendations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Recommendation.associate = (models) => {
    Recommendation.belongsTo(models.User, { foreignKey: 'user_id' });
    Recommendation.belongsTo(models.Skill, { foreignKey: 'skill_id' });
    Recommendation.belongsTo(models.Trend, { foreignKey: 'trend_id' });
  };

  return Recommendation;
};