const { DataTypes, Op } = require('sequelize');

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

  // --- static helper methods ------------------------------------------------

  // find all with optional pagination
  Skill.findAll = async function (limit = 100, offset = 0) {
    return await this.findAll({ limit, offset });
  };

  Skill.findByCategory = async function (category, limit = 100, offset = 0) {
    return await this.findAll({
      where: { category },
      limit,
      offset,
    });
  };

  Skill.findById = async function (id) {
    return await this.findByPk(id);
  };

  Skill.search = async function (q, limit = 20) {
    return await this.findAll({
      where: { name: { [Op.iLike]: `%${q}%` } },
      limit,
    });
  };

  Skill.getCategories = async function () {
    const rows = await this.findAll({
      attributes: [
        [this.sequelize.fn('DISTINCT', this.sequelize.col('category')), 'category'],
      ],
    });
    return rows.map((r) => r.get('category'));
  };

  Skill.findByName = async function (name) {
    return await this.findOne({ where: { name } });
  };

  // override create to accept (name, category)
  const originalCreate = Skill.create.bind(Skill);
  Skill.create = async function (name, category) {
    return originalCreate({ name, category });
  };

  Skill.update = async function (id, updates) {
    const [count] = await this.update(updates, { where: { id } });
    if (!count) return null;
    return this.findByPk(id);
  };

  Skill.delete = async function (id) {
    return await this.destroy({ where: { id } });
  };

  return Skill;
};