const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres', // or 'mysql', 'sqlite', etc.
    logging: false,
  }
);

const models = {
  User:           require('./User')(sequelize),
  Profile:        require('./Profile')(sequelize),
  Skill:          require('./Skill')(sequelize),
  UserSkill:      require('./Userskill')(sequelize),
  SkillGap:       require('./Skillgap')(sequelize),
  Trend:          require('./Trend')(sequelize),
  TrendSkill:     require('./TrendSkill')(sequelize),
  Recommendation: require('./Recommendation')(sequelize),
};

// Run all associations
Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

module.exports = { sequelize, ...models };