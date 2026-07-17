const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { protect, restrictTo } = require('../middleware/auth');

// Multer temporary storage configuration
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ext !== 'xlsx') {
      return cb(new Error('Only Excel files (.xlsx) are allowed.'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = express.Router();

// File upload endpoint is admin only
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  upload.single('file'),
  uploadController.uploadExcel
);

// History endpoint can be accessed by both ADMIN and MANAGEMENT
router.get(
  '/history',
  protect,
  uploadController.getUploadHistory
);

module.exports = router;
