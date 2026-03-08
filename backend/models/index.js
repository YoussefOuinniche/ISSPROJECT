const { Sequelize } = require('sequelize');

// Support two configuration styles:
// 1. Single DATABASE_URL (used by Supabase/Heroku)
// 2. Separate DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    logging: false,
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: false,
    }
  );
}

const models = {
  User:           require('./Users')(sequelize),
  Profile:        require('./Profile')(sequelize),
  Skill:          require('./Skill')(sequelize),
  UserSkill:      require('./Userskill')(sequelize),
  SkillGap:       require('./Skillgap')(sequelize),
  Trend:          require('./Trend')(sequelize),
  TrendSkill:     require('./skilltrend')(sequelize),
  Recommendation: require('./Reccomandation')(sequelize),
};

// Run all associations
Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

module.exports = { sequelize, ...models };