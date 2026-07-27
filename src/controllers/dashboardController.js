const dashboardService = require('../services/dashboardService');

const getSummary = async (req, res, next) => {
  try {
    const filters = {
      upload_id: req.query.upload_id,
      warehouse: req.query.warehouse,
      vendor: req.query.vendor,
      stock_type: req.query.stock_type,
      stock_class: req.query.stock_class,
      search: req.query.search
    };
    const summaryData = await dashboardService.getDashboardSummary(filters);
    res.status(200).json({
      status: 'success',
      data: summaryData
    });
  } catch (error) {
    next(error);
  }
};

const getCharts = async (req, res, next) => {
  try {
    const filters = {
      upload_id: req.query.upload_id,
      warehouse: req.query.warehouse,
      vendor: req.query.vendor,
      stock_type: req.query.stock_type,
      stock_class: req.query.stock_class,
      search: req.query.search
    };
    const chartData = await dashboardService.getDashboardCharts(filters);
    res.status(200).json({
      status: 'success',
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getCharts
};
