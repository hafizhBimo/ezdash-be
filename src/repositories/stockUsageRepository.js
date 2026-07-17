const { Op, fn, col } = require('sequelize');
const StockUsage = require('../models/stock_usage');
const MasterItem = require('../models/master_item');

class StockUsageRepository {
  async bulkCreate(usages, transaction) {
    return await StockUsage.bulkCreate(usages, { transaction });
  }

  // Top 10 items by total usage in this upload, with filters
  async getTopUsageItems(uploadId, filters = {}) {
    const where = { upload_id: uploadId };
    const itemWhere = {};

    if (filters.warehouse) {
      itemWhere.warehouse = filters.warehouse;
    }
    if (filters.vendor) {
      itemWhere.vendor = filters.vendor;
    }
    if (filters.stock_type) {
      itemWhere.stock_type = filters.stock_type;
    }
    if (filters.stock_class) {
      itemWhere.stock_class = filters.stock_class;
    }

    return await StockUsage.findAll({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: ['stock_code', 'item_name']
      }],
      attributes: [
        'item_id',
        [fn('SUM', col('usage_qty')), 'total_usage']
      ],
      group: ['StockUsage.item_id', 'item.id', 'item.stock_code', 'item.item_name'],
      order: [[fn('SUM', col('usage_qty')), 'DESC']],
      limit: 10,
      raw: true,
      nest: true
    });
  }

  // Get historical monthly usage aggregates for a trend line chart
  async getUsageHistory() {
    return await StockUsage.findAll({
      attributes: [
        'usage_date',
        [fn('SUM', col('usage_qty')), 'total_usage']
      ],
      group: ['usage_date'],
      order: [['usage_date', 'ASC']],
      raw: true
    });
  }
}

module.exports = new StockUsageRepository();
