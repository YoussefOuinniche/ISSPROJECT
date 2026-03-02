const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Profile = sequelize.define('Profile', {
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
    domain: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
    },
    experience_level: {
      type: DataTypes.STRING,
    },
    bio: {
      type: DataTypes.TEXT,
    },
    last_analysis_at: {
      type: DataTypes.DATE,
    },
  }, {
    tableName: 'profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  Profile.associate = (models) => {
    Profile.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  // ----- static helpers -----------------------------------------------------

  Profile.getFullProfile = async function (userId) {
    return await this.findOne({
      where: { user_id: userId },
      include: [this.sequelize.models.User],
    });
  };

  Profile.findByUserId = async function (userId) {
    return await this.findOne({ where: { user_id: userId } });
  };

  Profile.update = async function (userId, updates) {
    const [count] = await this.update(updates, { where: { user_id: userId } });
    if (!count) return null;
    return this.findByUserId(userId);
  };

  Profile.create = async function (userId, data) {
    return await this.create({ user_id: userId, ...data });
  };

  return Profile;
};