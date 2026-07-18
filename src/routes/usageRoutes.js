const express = require('express');
const { getUsageList } = require('../controllers/usageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', getUsageList);

module.exports = router;
