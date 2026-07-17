const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockUsage = sequelize.define('StockUsage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  upload_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'upload_histories',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'master_items',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  usage_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  usage_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'stock_usages',
  timestamps: true,
  underscored: true
});

module.exports = StockUsage;
