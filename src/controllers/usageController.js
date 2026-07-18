const usageService = require('../services/usageService');

const getUsageList = async (req, res, next) => {
  try {
    const query = {
      upload_id: req.query.upload_id,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
      search: req.query.search,
      warehouse: req.query.warehouse,
      vendor: req.query.vendor,
      stock_type: req.query.stock_type,
      stock_class: req.query.stock_class
    };
    
    const result = await usageService.getUsageList(query);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsageList
};
