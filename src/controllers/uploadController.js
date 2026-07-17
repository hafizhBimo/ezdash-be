const fs = require('fs');
const uploadService = require('../services/uploadService');
const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');
const { BadRequestError } = require('../utils/appError');

const uploadExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded. Please upload a valid .xlsx file.');
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const userId = req.user ? req.user.id : null;

    // Process the excel upload in service layer (handles parsing and transactional DB write)
    const uploadLog = await uploadService.processUpload(filePath, originalName, userId);

    // Clean up temporary uploaded file from server disk
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete temp file:', err);
    }

    res.status(200).json({
      status: 'success',
      message: 'File processed successfully.',
      data: {
        uploadId: uploadLog.id,
        filename: uploadLog.filename,
        uploadDate: uploadLog.upload_date
      }
    });
  } catch (error) {
    // Attempt to delete temp file in case of failure
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Failed to delete temp file:', err);
      }
    }
    next(error);
  }
};

const getUploadHistory = async (req, res, next) => {
  try {
    const history = await uploadHistoryRepository.getAllHistory();
    res.status(200).json({
      status: 'success',
      data: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadExcel,
  getUploadHistory
};
