const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TrendSkill = sequelize.define('TrendSkill', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trend_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'trends', key: 'id' },
    },
    skill_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'skills', key: 'id' },
    },
    relevance_score: {
      type: DataTypes.DECIMAL,
    },
  }, {
    tableName: 'trend_skills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  TrendSkill.associate = (models) => {
    TrendSkill.belongsTo(models.Trend, { foreignKey: 'trend_id' });
    TrendSkill.belongsTo(models.Skill, { foreignKey: 'skill_id' });
  };

  return TrendSkill;
};