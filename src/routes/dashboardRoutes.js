const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // protect all dashboard API endpoints

router.get('/summary', dashboardController.getSummary);
router.get('/charts', dashboardController.getCharts);

module.exports = router;
