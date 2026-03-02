const { DataTypes, Op } = require('sequelize');
const bcrypt = require('bcrypt');

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

  // --- custom static helper methods -------------------------------------

  // Find user by email (case-insensitive)
  User.findByEmail = async function (email) {
    return await this.findOne({ where: { email } });
  };

  // Verify plain password against stored bcrypt hash
  User.verifyPassword = async function (password, hash) {
    if (!password || !hash) return false;
    return await bcrypt.compare(password, hash);
  };

  // Override default create() to hash password automatically
  const originalCreate = User.create.bind(User);
  User.create = async function (email, password, fullName) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    return originalCreate({ email, password_hash, full_name: fullName });
  };

  User.updateRefreshToken = async function (userId, token) {
    return await this.update(
      { refresh_token: token },
      { where: { id: userId } }
    );
  };

  User.setPasswordResetToken = async function (email, token, expires) {
    return await this.update(
      { reset_password_token: token, reset_password_expires: expires },
      { where: { email } }
    );
  };

  User.verifyResetToken = async function (token) {
    return await this.findOne({
      where: {
        reset_password_token: token,
        reset_password_expires: { [Op.gt]: new Date() },
      },
    });
  };

  User.resetPassword = async function (userId, newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    return await this.update(
      {
        password_hash,
        reset_password_token: null,
        reset_password_expires: null,
      },
      { where: { id: userId } }
    );
  };

  User.findById = async function (id) {
    // alias for findByPk
    return await this.findByPk(id);
  };

  return User;
};