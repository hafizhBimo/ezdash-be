const sequelize = require('../config/db');
const User = require('./user');
const MasterItem = require('./master_item');
const UploadHistory = require('./upload_history');
const StockSnapshot = require('./stock_snapshot');
const StockUsage = require('./stock_usage');

// Associations
User.hasMany(UploadHistory, { foreignKey: 'uploaded_by', as: 'uploads' });
UploadHistory.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

UploadHistory.hasMany(StockSnapshot, { foreignKey: 'upload_id', as: 'snapshots' });
StockSnapshot.belongsTo(UploadHistory, { foreignKey: 'upload_id', as: 'upload' });

MasterItem.hasMany(StockSnapshot, { foreignKey: 'item_id', as: 'snapshots' });
StockSnapshot.belongsTo(MasterItem, { foreignKey: 'item_id', as: 'item' });

UploadHistory.hasMany(StockUsage, { foreignKey: 'upload_id', as: 'usages' });
StockUsage.belongsTo(UploadHistory, { foreignKey: 'upload_id', as: 'upload' });

MasterItem.hasMany(StockUsage, { foreignKey: 'item_id', as: 'usages' });
StockUsage.belongsTo(MasterItem, { foreignKey: 'item_id', as: 'item' });

module.exports = {
  sequelize,
  User,
  MasterItem,
  UploadHistory,
  StockSnapshot,
  StockUsage
};
