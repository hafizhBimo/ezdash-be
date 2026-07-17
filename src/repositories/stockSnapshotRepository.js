const { Op, fn, col, literal } = require('sequelize');
const StockSnapshot = require('../models/stock_snapshot');
const MasterItem = require('../models/master_item');

class StockSnapshotRepository {
  async bulkCreate(snapshots, transaction) {
    return await StockSnapshot.bulkCreate(snapshots, { transaction });
  }

  // Common filter helper for queries
  _buildWhereClause(uploadId, filters = {}) {
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

    return { where, itemWhere };
  }

  async getSummary(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);

    const result = await StockSnapshot.findOne({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [fn('COUNT', fn('DISTINCT', col('item_id'))), 'totalSKU'],
        [fn('SUM', col('soh_qty')), 'totalSOH'],
        [fn('SUM', col('coh_qty')), 'totalCOH'],
        [fn('SUM', literal('soh_amount + coh_amount')), 'totalValue'],
        [fn('AVG', col('days_stock')), 'avgDaysStock']
      ],
      raw: true
    });

    return {
      totalSKU: parseInt(result.totalSKU || 0, 10),
      totalSOH: parseFloat(result.totalSOH || 0),
      totalCOH: parseFloat(result.totalCOH || 0),
      totalValue: parseFloat(result.totalValue || 0),
      avgDaysStock: parseFloat(result.avgDaysStock || 0)
    };
  }

  async getStockTypeDistribution(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);

    return await StockSnapshot.findAll({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [col('item.stock_type'), 'stock_type'],
        [fn('COUNT', col('StockSnapshot.id')), 'count']
      ],
      group: [col('item.stock_type')],
      raw: true
    });
  }

  async getStockClassDistribution(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);

    return await StockSnapshot.findAll({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [col('item.stock_class'), 'stock_class'],
        [fn('COUNT', col('StockSnapshot.id')), 'count']
      ],
      group: [col('item.stock_class')],
      raw: true
    });
  }

  async getVendorConsignment(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);
    
    // Vendor is in master_items. Filter for coh_qty > 0 to focus on consignment
    const combinedItemWhere = {
      ...itemWhere,
      vendor: { [Op.ne]: null }
    };

    return await StockSnapshot.findAll({
      where: {
        ...where,
        coh_qty: { [Op.gt]: 0 }
      },
      include: [{
        model: MasterItem,
        as: 'item',
        where: combinedItemWhere,
        attributes: []
      }],
      attributes: [
        [col('item.vendor'), 'vendor'],
        [fn('SUM', col('coh_qty')), 'total_coh']
      ],
      group: [col('item.vendor')],
      order: [[fn('SUM', col('coh_qty')), 'DESC']],
      limit: 5,
      raw: true
    });
  }

  async getCoverageBuckets(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);

    const result = await StockSnapshot.findOne({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [fn('COUNT', literal('CASE WHEN days_stock = 0 THEN 1 END')), 'zeroStock'],
        [fn('COUNT', literal('CASE WHEN days_stock > 0 AND days_stock < 15 THEN 1 END')), 'under15'],
        [fn('COUNT', literal('CASE WHEN days_stock >= 15 AND days_stock <= 30 THEN 1 END')), 'range15to30'],
        [fn('COUNT', literal('CASE WHEN days_stock > 30 AND days_stock <= 60 THEN 1 END')), 'range30to60'],
        [fn('COUNT', literal('CASE WHEN days_stock > 60 AND days_stock <= 90 THEN 1 END')), 'range60to90'],
        [fn('COUNT', literal('CASE WHEN days_stock > 90 THEN 1 END')), 'over90']
      ],
      raw: true
    });

    return {
      zeroStock: parseInt(result.zeroStock || 0, 10),
      under15: parseInt(result.under15 || 0, 10),
      range15to30: parseInt(result.range15to30 || 0, 10),
      range30to60: parseInt(result.range30to60 || 0, 10),
      range60to90: parseInt(result.range60to90 || 0, 10),
      over90: parseInt(result.over90 || 0, 10)
    };
  }

  // Get historical inventory values grouped by upload snapshot dates to show trend line chart
  async getInventoryValueHistory() {
    return await StockSnapshot.findAll({
      attributes: [
        'snapshot_date',
        [fn('SUM', literal('soh_amount + coh_amount')), 'value']
      ],
      group: ['snapshot_date'],
      order: [['snapshot_date', 'ASC']],
      raw: true
    });
  }
}

module.exports = new StockSnapshotRepository();
