const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StockSnapshot = sequelize.define('StockSnapshot', {
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
  snapshot_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  soh_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  coh_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  soh_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  coh_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  min_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  rop_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  roq_qty: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  days_stock: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'NO STOCK' // 'AMAN', 'WARNING', 'CRITICAL', 'NO STOCK'
  },
  alert_exception: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'NO STOCK' // 'SAFE', 'LOW STOCK', 'SPIKE', 'NO STOCK'
  },
  avg_usage: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'stock_snapshots',
  timestamps: true,
  underscored: true
});

module.exports = StockSnapshot;
