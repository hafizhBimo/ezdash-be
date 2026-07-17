const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MasterItem = sequelize.define('MasterItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  stock_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  part_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  item_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  warehouse: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mnemonic: {
    type: DataTypes.STRING,
    allowNull: true
  },
  stock_class: {
    type: DataTypes.STRING,
    allowNull: true
  },
  equipment: {
    type: DataTypes.STRING,
    allowNull: true
  },
  uom: {
    type: DataTypes.STRING,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  conv_factor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 1.00
  },
  stock_type: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coa_inventory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coa_inventory_desc: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coa_expense: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coa_expense_desc: {
    type: DataTypes.STRING,
    allowNull: true
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'master_items',
  timestamps: true,
  underscored: true
});

module.exports = MasterItem;
