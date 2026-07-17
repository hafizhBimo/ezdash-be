const { AppError } = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error stack for developer troubleshooting
  console.error('ERROR 💥:', err);

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production Response
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming/Unknown errors: don't leak details
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong on our server.'
      });
    }
  }
};

module.exports = errorHandler;
