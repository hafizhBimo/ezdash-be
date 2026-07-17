const monitoringService = require('../services/monitoringService');

const getMonitoringList = async (req, res, next) => {
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
      stock_class: req.query.stock_class,
      status: req.query.status
    };
    
    const result = await monitoringService.getMonitoringList(query);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonitoringList
};
