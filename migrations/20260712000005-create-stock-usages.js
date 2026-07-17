'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_usages', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      upload_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'upload_histories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_items',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      usage_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      usage_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
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

    // Indexes for fast querying
    await queryInterface.addIndex('stock_usages', ['upload_id']);
    await queryInterface.addIndex('stock_usages', ['item_id']);
    await queryInterface.addIndex('stock_usages', ['usage_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_usages');
  }
};
