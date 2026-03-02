const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
    },
    refresh_token: {
      type: DataTypes.TEXT,
    },
    reset_password_token: {
      type: DataTypes.TEXT,
    },
    reset_password_expires: {
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  User.associate = (models) => {
    User.hasOne(models.Profile, { foreignKey: 'user_id' });
    User.hasMany(models.UserSkill, { foreignKey: 'user_id' });
    User.hasMany(models.SkillGap, { foreignKey: 'user_id' });
    User.hasMany(models.Recommendation, { foreignKey: 'user_id' });
  };

  return User;
};