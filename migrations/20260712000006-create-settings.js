'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('settings', {
      key: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        unique: true
      },
      value: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Seed defaults
    await queryInterface.bulkInsert('settings', [
      {
        key: 'CRITICAL_DAYS',
        value: '15',
        description: 'Days of stock under this value is considered CRITICAL.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'OVERSTOCK_DAYS',
        value: '90',
        description: 'Days of stock over this value is considered OVERSTOCK.',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        key: 'DEADSTOCK_DAYS',
        value: '180',
        description: 'Days of stock over this value is considered DEAD STOCK.',
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settings');
  }
};
