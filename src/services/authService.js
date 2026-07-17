const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const { BadRequestError, UnauthorizedError } = require('../utils/appError');

class AuthService {
  async login(username, password) {
    // Find user
    const user = await userRepository.findByUsername(username.toLowerCase());
    if (!user) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey1234567890!@#$',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
}

module.exports = new AuthService();
