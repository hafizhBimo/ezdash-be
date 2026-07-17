const UploadHistory = require('../models/upload_history');

class UploadHistoryRepository {
  async create(data, transaction) {
    return await UploadHistory.create(data, { transaction });
  }

  async updateStatus(id, status, errorMessage = null) {
    return await UploadHistory.update(
      { status, error_message: errorMessage },
      { where: { id } }
    );
  }

  async getLatestSuccessful() {
    return await UploadHistory.findOne({
      where: { status: 'SUCCESS' },
      order: [['upload_date', 'DESC'], ['id', 'DESC']]
    });
  }

  async getAllHistory() {
    return await UploadHistory.findAll({
      order: [['upload_date', 'DESC'], ['id', 'DESC']]
    });
  }
}

module.exports = new UploadHistoryRepository();
