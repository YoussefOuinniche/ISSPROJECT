const { DataTypes, Op } = require('sequelize');

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

  // static helpers
  Recommendation.findByUserAndType = async function (userId, type, limit = 20) {
    return await this.findAll({ where: { user_id: userId, type }, limit });
  };

  Recommendation.findByUserId = async function (userId, limit = 50, offset = 0) {
    return await this.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
  };

  Recommendation.getRecentRecommendations = async function (userId, days = 7, limit = 10) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.findAll({
      where: { user_id: userId, created_at: { [Op.gte]: cutoff } },
      order: [['created_at', 'DESC']],
      limit,
    });
  };

  return Recommendation;
};