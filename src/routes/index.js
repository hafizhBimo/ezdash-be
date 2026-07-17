const express = require('express');
const authRoutes = require('./authRoutes');
const uploadRoutes = require('./uploadRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const monitoringRoutes = require('./monitoringRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/monitoring', monitoringRoutes);

module.exports = router;
