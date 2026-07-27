const { Op, fn, col, literal } = require('sequelize');
const StockUsage = require('../models/stock_usage');
const MasterItem = require('../models/master_item');

class StockUsageRepository {
  async bulkCreate(usages, transaction) {
    return await StockUsage.bulkCreate(usages, { transaction });
  }

  _hasFilter(itemWhere) {
    return Object.keys(itemWhere).length > 0 || Object.getOwnPropertySymbols(itemWhere).length > 0;
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
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } },
        { part_number: { [Op.iLike]: searchPattern } }
      ];
    }

    const hasFilter = this._hasFilter(itemWhere);

    return await StockUsage.findAll({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: hasFilter ? itemWhere : undefined,
        required: hasFilter,
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

  // Get historical monthly usage aggregates for a trend line chart (6 months) with full filter support
  async getUsageHistory(filters = {}) {
    const where = {};
    const itemWhere = {};

    if (filters.upload_id) {
      where.upload_id = filters.upload_id;
    }
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
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } },
        { part_number: { [Op.iLike]: searchPattern } }
      ];
    }

    const hasFilter = this._hasFilter(itemWhere);

    return await StockUsage.findAll({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: hasFilter ? itemWhere : undefined,
        required: hasFilter,
        attributes: []
      }],
      attributes: [
        'usage_date',
        [fn('SUM', col('usage_qty')), 'total_usage'],
        [fn('SUM', literal('usage_qty * "item".price')), 'total_value']
      ],
      group: ['usage_date'],
      order: [['usage_date', 'ASC']],
      limit: 6,
      raw: true
    });
  }

  // Get total usage for the specific upload context
  async getUsageSummary(uploadId, filters = {}) {
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
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } },
        { part_number: { [Op.iLike]: searchPattern } }
      ];
    }

    const hasFilter = this._hasFilter(itemWhere);

    const result = await StockUsage.findOne({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: hasFilter ? itemWhere : undefined,
        required: hasFilter,
        attributes: []
      }],
      attributes: [
        [fn('SUM', col('usage_qty')), 'totalUsageQty'],
        [fn('SUM', literal('usage_qty * "item".price')), 'totalUsageValue']
      ],
      raw: true
    });

    return {
      totalUsageQty: parseFloat(result?.totalUsageQty || 0),
      totalUsageValue: parseFloat(result?.totalUsageValue || 0)
    };
  }
}

module.exports = new StockUsageRepository();
