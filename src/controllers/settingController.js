const settingService = require('../services/settingService');

const getAllSettings = async (req, res, next) => {
  try {
    const settings = await settingService.getAllSettings();
    res.status(200).json({
      status: 'success',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const settingsMap = req.body; // Expecting { CRITICAL_DAYS: 15, OVERSTOCK_DAYS: 90, ... }
    if (!settingsMap || typeof settingsMap !== 'object') {
      return res.status(400).json({ status: 'error', message: 'Invalid settings format' });
    }
    
    await settingService.updateSettings(settingsMap);
    
    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSettings,
  updateSettings
};
