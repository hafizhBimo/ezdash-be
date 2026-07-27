const { Op } = require('sequelize');
const StockUsage = require('../models/stock_usage');
const MasterItem = require('../models/master_item');
const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');

class UsageService {
  async getUsageList(query = {}) {
    const latestUpload = await uploadHistoryRepository.getLatestSuccessful();
    if (!latestUpload) {
      return { rows: [], count: 0, page: 1, limit: 10, uniqueFilters: {} };
    }

    const uploadId = query.upload_id ? parseInt(query.upload_id, 10) : latestUpload.id;
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const sortBy = query.sortBy || 'id';
    const sortOrder = query.sortOrder || 'ASC';

    const usageWhere = { upload_id: uploadId };
    const itemWhere = {};

    if (query.warehouse) itemWhere.warehouse = query.warehouse;
    if (query.vendor) itemWhere.vendor = query.vendor;
    if (query.stock_type) itemWhere.stock_type = query.stock_type;
    if (query.stock_class) itemWhere.stock_class = query.stock_class;

    if (query.search && query.search.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } },
        { part_number: { [Op.iLike]: searchPattern } }
      ];
    }

    let order = [];
    if (sortBy === 'usage_qty') {
      order = [[sortBy, sortOrder]];
    } else if (sortBy === 'usage_amount') {
      order = [[{ model: MasterItem, as: 'item' }, 'price', sortOrder]];
    } else {
      order = [[{ model: MasterItem, as: 'item' }, sortBy, sortOrder]];
    }

    const hasItemFilter = Object.keys(itemWhere).length > 0 || Object.getOwnPropertySymbols(itemWhere).length > 0;

    const { rows, count } = await StockUsage.findAndCountAll({
      where: usageWhere,
      include: [{
        model: MasterItem,
        as: 'item',
        where: hasItemFilter ? itemWhere : undefined,
        required: hasItemFilter,
        attributes: ['stock_code', 'part_number', 'item_name', 'warehouse', 'vendor', 'stock_type', 'stock_class', 'price']
      }],
      order,
      limit,
      offset,
      distinct: true
    });

    const uniqueFilters = await this.getUniqueFilterOptions(uploadId);

    return { rows, count, page, limit, uniqueFilters };
  }

  async getUniqueFilterOptions(uploadId) {
    const usages = await StockUsage.findAll({
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

    usages.forEach(u => {
      if (u.item) {
        if (u.item.warehouse) warehouses.add(u.item.warehouse);
        if (u.item.vendor) vendors.add(u.item.vendor);
        if (u.item.stock_type) stockTypes.add(u.item.stock_type);
        if (u.item.stock_class) stockClasses.add(u.item.stock_class);
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

module.exports = new UsageService();
