'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // createTable uses CREATE TABLE IF NOT EXISTS by default in Sequelize
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

    // Use raw query with ON CONFLICT DO NOTHING to prevent duplicate key violations in environments where settings are already seeded
    await queryInterface.sequelize.query(`
      INSERT INTO settings (key, value, description, created_at, updated_at) VALUES 
      ('CRITICAL_DAYS', '15', 'Days of stock under this value is considered CRITICAL.', NOW(), NOW()),
      ('OVERSTOCK_DAYS', '90', 'Days of stock over this value is considered OVERSTOCK.', NOW(), NOW()),
      ('DEADSTOCK_DAYS', '180', 'Days of stock over this value is considered DEAD STOCK.', NOW(), NOW())
      ON CONFLICT (key) DO NOTHING;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('settings');
  }
};
