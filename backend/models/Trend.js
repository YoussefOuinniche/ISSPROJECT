const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trend = sequelize.define('Trend', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    domain: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    source: {
      type: DataTypes.STRING,
    },
  }, {
    tableName: 'trends',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Trend.associate = (models) => {
    Trend.hasMany(models.TrendSkill, { foreignKey: 'trend_id' });
    Trend.hasMany(models.Recommendation, { foreignKey: 'trend_id' });
  };

  return Trend;
};