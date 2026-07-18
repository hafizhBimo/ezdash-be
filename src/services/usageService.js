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

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      itemWhere[Op.or] = [
        { stock_code: { [Op.iLike]: searchPattern } },
        { item_name: { [Op.iLike]: searchPattern } }
      ];
    }

    let order = [];
    if (sortBy === 'usage_qty') {
      order = [[sortBy, sortOrder]];
    } else if (sortBy === 'usage_amount') {
      // Order by calculated amount (qty * price) is tricky without a literal, 
      // but we can sort by raw qty * price
      order = [[MasterItem, 'price', sortOrder]]; // Simplified for now
    } else {
      order = [[{ model: MasterItem, as: 'item' }, sortBy, sortOrder]];
    }

    const { rows, count } = await StockUsage.findAndCountAll({
      where: usageWhere,
      include: [{
        model: MasterItem,
        as: 'item',
        where: Object.keys(itemWhere).length ? itemWhere : undefined,
        attributes: ['stock_code', 'item_name', 'warehouse', 'vendor', 'stock_type', 'stock_class', 'price']
      }],
      order,
      limit,
      offset
    });

    // We can reuse the filter logic from monitoring if needed, but for simplicity we return empty
    // Or we just get unique warehouses from the items
    return { rows, count, page, limit, uniqueFilters: { warehouses: [], vendors: [], stockTypes: [], stockClasses: [] } };
  }
}

module.exports = new UsageService();
