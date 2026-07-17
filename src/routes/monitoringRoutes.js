const express = require('express');
const monitoringController = require('../controllers/monitoringController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // protect monitoring table API endpoints

router.get('/', monitoringController.getMonitoringList);

module.exports = router;
