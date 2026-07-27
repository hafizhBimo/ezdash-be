const { Op, col } = require('sequelize');
const StockSnapshot = require('../models/stock_snapshot');
const MasterItem = require('../models/master_item');
const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');
const settingService = require('../services/settingService');

class MonitoringService {
  async getMonitoringList(query = {}) {
    const latestUpload = await uploadHistoryRepository.getLatestSuccessful();
    if (!latestUpload) {
      return {
        rows: [],
        count: 0,
        page: 1,
        limit: 10
      };
    }

    const uploadId = query.upload_id ? parseInt(query.upload_id, 10) : latestUpload.id;
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const sortBy = query.sortBy || 'id';
    const sortOrder = query.sortOrder || 'ASC';

    // Filters & Search
    const snapshotWhere = { upload_id: uploadId };
    const itemWhere = {};

    if (query.warehouse) {
      itemWhere.warehouse = query.warehouse;
    }
    if (query.vendor) {
      itemWhere.vendor = query.vendor;
    }
    if (query.stock_type) {
      itemWhere.stock_type = query.stock_type;
    }
    if (query.stock_class) {
      itemWhere.stock_class = query.stock_class;
    }
    if (query.status) {
      snapshotWhere.status = query.status;
    }

    const t = await settingService.getThresholds();

    if (query.alert_filter) {
      if (query.alert_filter === 'CRITICAL') {
         snapshotWhere.days_stock = { [Op.lt]: t.CRITICAL_DAYS };
      } else if (query.alert_filter === 'LOW_STOCK') {
         snapshotWhere.soh_qty = { [Op.lt]: col('rop_qty') };
      } else if (query.alert_filter === 'ALL_ALERTS') {
         snapshotWhere[Op.or] = [
            { days_stock: { [Op.lt]: t.CRITICAL_DAYS } },
            { soh_qty: { [Op.lt]: col('rop_qty') } }
         ];
      }
    }

    if (query.dead_stock_filter) {
      if (query.dead_stock_filter === 'OVERSTOCK') {
         // > OVERSTOCK_DAYS but <= DEADSTOCK_DAYS
         snapshotWhere.days_stock = { [Op.gt]: t.OVERSTOCK_DAYS, [Op.lte]: t.DEADSTOCK_DAYS };
      } else if (query.dead_stock_filter === 'DEADSTOCK') {
         // > DEADSTOCK_DAYS
         snapshotWhere.days_stock = { [Op.gt]: t.DEADSTOCK_DAYS };
      } else if (query.dead_stock_filter === 'ALL') {
         // Any > OVERSTOCK_DAYS
         snapshotWhere.days_stock = { [Op.gt]: t.OVERSTOCK_DAYS };
      }
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } },
        { part_number: { [Op.iLike]: searchPattern } }
      ];
    }

    // Determine order
    let order = [];
    const allowedSnapshotSorts = ['soh_qty', 'coh_qty', 'soh_amount', 'coh_amount', 'min_qty', 'rop_qty', 'roq_qty', 'days_stock', 'status'];
    const allowedItemSorts = ['stock_code', 'item_name', 'warehouse', 'vendor', 'stock_type', 'stock_class'];

    if (allowedSnapshotSorts.includes(sortBy)) {
      order = [[sortBy, sortOrder]];
    } else if (allowedItemSorts.includes(sortBy)) {
      order = [[{ model: MasterItem, as: 'item' }, sortBy, sortOrder]];
    } else {
      order = [['id', 'ASC']];
    }

    const hasItemFilter = Object.keys(itemWhere).length > 0 || Object.getOwnPropertySymbols(itemWhere).length > 0;

    const { rows, count } = await StockSnapshot.findAndCountAll({
      where: snapshotWhere,
      include: [{
        model: MasterItem,
        as: 'item',
        where: hasItemFilter ? itemWhere : undefined,
        required: hasItemFilter,
        attributes: [
          'stock_code',
          'part_number',
          'item_name',
          'warehouse',
          'vendor',
          'stock_type',
          'stock_class',
          'price',
          'uom'
        ]
      }],
      order,
      limit,
      offset,
      distinct: true
    });

    // Extract unique filter lists to populate dropdowns on the frontend!
    // This is a beautiful extra polish step:
    const uniqueFilters = await this.getUniqueFilterOptions(uploadId);

    return {
      rows,
      count,
      page,
      limit,
      uniqueFilters
    };
  }

  async getUniqueFilterOptions(uploadId) {
    // Find all distinct warehouses, vendors, stock_types, and stock_classes present in the master items of this snapshot
    const snapshots = await StockSnapshot.findAll({
      where: { upload_id: uploadId },
      include: [{
        model: MasterItem,
        as: 'item',
        attributes: ['warehouse', 'vendor', 'stock_type', 'stock_class']
      }],
      attributes: ['id']
    });

    const warehouses = new Set();
    const vendors = new Set();
    const stockTypes = new Set();
    const stockClasses = new Set();

    snapshots.forEach(s => {
      if (s.item) {
        if (s.item.warehouse) warehouses.add(s.item.warehouse);
        if (s.item.vendor) vendors.add(s.item.vendor);
        if (s.item.stock_type) stockTypes.add(s.item.stock_type);
        if (s.item.stock_class) stockClasses.add(s.item.stock_class);
      }
    });

    return {
      warehouses: Array.from(warehouses).sort(),
      vendors: Array.from(vendors).sort(),
      stockTypes: Array.from(stockTypes).sort(),
      stockClasses: Array.from(stockClasses).sort()
    };
  }
}

module.exports = new MonitoringService();
