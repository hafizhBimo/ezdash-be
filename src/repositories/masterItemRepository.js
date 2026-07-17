const MasterItem = require('../models/master_item');

class MasterItemRepository {
  async upsertMany(items, transaction) {
    const fieldsToUpdate = [
      'part_number', 'item_name', 'description', 'warehouse', 'mnemonic',
      'stock_class', 'equipment', 'uom', 'price', 'conv_factor', 'stock_type',
      'coa_inventory', 'coa_inventory_desc', 'coa_expense', 'coa_expense_desc',
      'vendor'
    ];
    
    return await MasterItem.bulkCreate(items, {
      transaction,
      updateOnDuplicate: fieldsToUpdate,
      conflictFields: ['stock_code']
    });
  }

  async findByStockCode(stock_code) {
    return await MasterItem.findOne({ where: { stock_code } });
  }

  async getAll(transaction) {
    return await MasterItem.findAll({ transaction });
  }
}

module.exports = new MasterItemRepository();
