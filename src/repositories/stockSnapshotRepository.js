const { Op, fn, col, literal } = require('sequelize');
const StockSnapshot = require('../models/stock_snapshot');
const MasterItem = require('../models/master_item');
const settingService = require('../services/settingService');

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
        [fn('SUM', col('soh_amount')), 'totalSOHAmount'],
        [fn('SUM', col('coh_amount')), 'totalCOHAmount'],
        [fn('SUM', literal('soh_amount + coh_amount')), 'totalValue'],
        [fn('AVG', col('days_stock')), 'avgDaysStock']
      ],
      raw: true
    });

    return {
      totalSKU: parseInt(result.totalSKU || 0, 10),
      totalSOH: parseFloat(result.totalSOH || 0),
      totalCOH: parseFloat(result.totalCOH || 0),
      totalSOHAmount: parseFloat(result.totalSOHAmount || 0),
      totalCOHAmount: parseFloat(result.totalCOHAmount || 0),
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
        [fn('COUNT', col('StockSnapshot.id')), 'count'],
        [fn('SUM', col('soh_qty')), 'total_qty']
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
        [fn('COUNT', literal('CASE WHEN days_stock = 0 OR days_stock IS NULL THEN 1 END')), 'no_usage'],
        [fn('COUNT', literal('CASE WHEN days_stock > 0 AND days_stock <= 15 THEN 1 END')), 'critical'],
        [fn('COUNT', literal('CASE WHEN days_stock > 15 AND days_stock <= 30 THEN 1 END')), 'warning'],
        [fn('COUNT', literal('CASE WHEN days_stock > 30 THEN 1 END')), 'aman']
      ],
      raw: true
    });

    return {
      no_usage: parseInt(result.no_usage || 0, 10),
      critical: parseInt(result.critical || 0, 10),
      warning: parseInt(result.warning || 0, 10),
      aman: parseInt(result.aman || 0, 10)
    };
  }

  async getAlertSummary(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);
    const t = await settingService.getThresholds();

    const result = await StockSnapshot.findOne({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [fn('COUNT', literal(`CASE WHEN days_stock < ${t.CRITICAL_DAYS} THEN 1 END`)), 'critical'],
        [fn('COUNT', literal('CASE WHEN soh_qty < rop_qty THEN 1 END')), 'lowStock'],
        [fn('COUNT', literal(`CASE WHEN days_stock > ${t.OVERSTOCK_DAYS} THEN 1 END`)), 'overStock'],
        [fn('COUNT', literal(`CASE WHEN days_stock > ${t.DEADSTOCK_DAYS} THEN 1 END`)), 'deadStock'],
        [fn('SUM', literal(`CASE WHEN days_stock > ${t.OVERSTOCK_DAYS} THEN (soh_amount + coh_amount) ELSE 0 END`)), 'overStockValue'],
        [fn('SUM', literal(`CASE WHEN days_stock > ${t.DEADSTOCK_DAYS} THEN (soh_amount + coh_amount) ELSE 0 END`)), 'deadStockValue']
      ],
      raw: true
    });

    return {
      critical: parseInt(result.critical || 0, 10),
      lowStock: parseInt(result.lowStock || 0, 10),
      overStock: parseInt(result.overStock || 0, 10),
      deadStock: parseInt(result.deadStock || 0, 10),
      overStockValue: parseFloat(result.overStockValue || 0),
      deadStockValue: parseFloat(result.deadStockValue || 0)
    };
  }

  async getAgingBuckets(uploadId, filters = {}) {
    const { where, itemWhere } = this._buildWhereClause(uploadId, filters);
    const t = await settingService.getThresholds();

    const result = await StockSnapshot.findOne({
      where,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: []
      }],
      attributes: [
        [fn('SUM', literal('CASE WHEN days_stock < 30 THEN (soh_amount + coh_amount) ELSE 0 END')), 'under30'],
        [fn('SUM', literal(`CASE WHEN days_stock >= 30 AND days_stock <= ${t.OVERSTOCK_DAYS} THEN (soh_amount + coh_amount) ELSE 0 END`)), 'range31to90'],
        [fn('SUM', literal(`CASE WHEN days_stock > ${t.OVERSTOCK_DAYS} AND days_stock <= ${t.DEADSTOCK_DAYS} THEN (soh_amount + coh_amount) ELSE 0 END`)), 'range91to180'],
        [fn('SUM', literal(`CASE WHEN days_stock > ${t.DEADSTOCK_DAYS} THEN (soh_amount + coh_amount) ELSE 0 END`)), 'over180']
      ],
      raw: true
    });

    return {
      under30: parseFloat(result.under30 || 0),
      range31to90: parseFloat(result.range31to90 || 0),
      range91to180: parseFloat(result.range91to180 || 0),
      over180: parseFloat(result.over180 || 0)
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
