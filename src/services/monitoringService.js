const { Op } = require('sequelize');
const StockSnapshot = require('../models/stock_snapshot');
const MasterItem = require('../models/master_item');
const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');

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

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } }
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

    const { rows, count } = await StockSnapshot.findAndCountAll({
      where: snapshotWhere,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
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
      offset
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
