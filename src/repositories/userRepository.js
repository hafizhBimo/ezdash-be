const User = require('../models/user');

class UserRepository {
  async findByUsername(username) {
    return await User.findOne({ where: { username } });
  }

  async findById(id) {
    return await User.findByPk(id);
  }
}

module.exports = new UserRepository();
