const express = require('express');
const authRoutes = require('./authRoutes');
const uploadRoutes = require('./uploadRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const monitoringRoutes = require('./monitoringRoutes');
const settingRoutes = require('./settingRoutes');
const usageRoutes = require('./usageRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/settings', settingRoutes);
router.use('/usages', usageRoutes);

module.exports = router;
