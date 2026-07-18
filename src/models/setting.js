const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'settings',
  timestamps: true,
  underscored: true
});

module.exports = Setting;
