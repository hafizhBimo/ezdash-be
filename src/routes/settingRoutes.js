const express = require('express');
const { getAllSettings, updateSettings } = require('../controllers/settingController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.get('/', getAllSettings);
router.put('/', restrictTo('ADMIN'), updateSettings);

module.exports = router;
