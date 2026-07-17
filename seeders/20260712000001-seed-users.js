'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPasswordAdmin = bcrypt.hashSync('Admin123', 10);
    const hashedPasswordMgt = bcrypt.hashSync('Mgt123', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        username: 'admin',
        password: hashedPasswordAdmin,
        role: 'ADMIN',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        username: 'management',
        password: hashedPasswordMgt,
        role: 'MANAGEMENT',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
