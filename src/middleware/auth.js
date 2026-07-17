const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/appError');
const User = require('../models/user');

const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('Please log in to access this resource.'));
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey1234567890!@#$');

    // Check if user still exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    // Grant access
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token. Please log in again.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Your session has expired. Please log in again.'));
    }
    next(error);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action.'));
    }
    next();
  };
};

module.exports = {
  protect,
  restrictTo
};
