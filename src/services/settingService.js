const Setting = require('../models/setting');

class SettingService {
  async getAllSettings() {
    return await Setting.findAll();
  }

  async getSettingValue(key, defaultValue = null) {
    const setting = await Setting.findByPk(key);
    return setting ? setting.value : defaultValue;
  }

  async getThresholds() {
    const settings = await this.getAllSettings();
    const thresholds = {
      CRITICAL_DAYS: 15,
      OVERSTOCK_DAYS: 90,
      DEADSTOCK_DAYS: 180
    };

    for (const s of settings) {
      if (thresholds.hasOwnProperty(s.key)) {
        thresholds[s.key] = parseInt(s.value, 10);
      }
    }
    return thresholds;
  }

  async updateSettings(settingsMap) {
    const transaction = await Setting.sequelize.transaction();
    try {
      for (const [key, value] of Object.entries(settingsMap)) {
        await Setting.upsert({ key, value: String(value) }, { transaction });
      }
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Seed default settings if they don't exist
  async seedDefaults() {
    const defaults = [
      { key: 'CRITICAL_DAYS', value: '15', description: 'Days of stock under this value is considered CRITICAL.' },
      { key: 'OVERSTOCK_DAYS', value: '90', description: 'Days of stock over this value is considered OVERSTOCK.' },
      { key: 'DEADSTOCK_DAYS', value: '180', description: 'Days of stock over this value is considered DEAD STOCK.' }
    ];

    for (const def of defaults) {
      await Setting.findOrCreate({
        where: { key: def.key },
        defaults: { value: def.value, description: def.description }
      });
    }
  }
}

module.exports = new SettingService();
