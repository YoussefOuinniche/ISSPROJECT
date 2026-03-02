const { DataTypes, Op } = require('sequelize');

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

  // --- static helpers --------------------------------------------------------

  Trend.findAll = async function (limit = 50, offset = 0) {
    return await this.findAll({ limit, offset });
  };

  Trend.findByDomain = async function (domain, limit = 50, offset = 0) {
    return await this.findAll({
      where: { domain },
      limit,
      offset,
    });
  };

  Trend.getTrendWithSkills = async function (id) {
    return await this.findOne({
      where: { id },
      include: [
        {
          model: this.sequelize.models.TrendSkill,
          include: [this.sequelize.models.Skill],
        },
      ],
    });
  };

  Trend.search = async function (q, limit = 20) {
    return await this.findAll({
      where: { title: { [Op.iLike]: `%${q}%` } },
      limit,
    });
  };

  Trend.getDomains = async function () {
    const rows = await this.findAll({
      attributes: [
        [this.sequelize.fn('DISTINCT', this.sequelize.col('domain')), 'domain'],
      ],
    });
    return rows.map((r) => r.get('domain'));
  };

  Trend.getRecentTrends = async function (limit = 20) {
    return await this.findAll({
      order: [['created_at', 'DESC']],
      limit,
    });
  };

  // override create to accept object
  const origCreate = Trend.create.bind(Trend);
  Trend.create = async function (data) {
    return origCreate(data);
  };

  Trend.update = async function (id, updates) {
    const [count] = await this.update(updates, { where: { id } });
    if (!count) return null;
    return this.findByPk(id);
  };

  Trend.delete = async function (id) {
    return await this.destroy({ where: { id } });
  };

  Trend.bulkCreate = async function (arr) {
    return await this.bulkCreate(arr);
  };

  return Trend;
};