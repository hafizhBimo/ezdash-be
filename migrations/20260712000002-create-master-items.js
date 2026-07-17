'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      stock_code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      part_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      item_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      warehouse: {
        type: Sequelize.STRING,
        allowNull: true
      },
      mnemonic: {
        type: Sequelize.STRING,
        allowNull: true
      },
      stock_class: {
        type: Sequelize.STRING,
        allowNull: true
      },
      equipment: {
        type: Sequelize.STRING,
        allowNull: true
      },
      uom: {
        type: Sequelize.STRING,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      conv_factor: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 1.00
      },
      stock_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      coa_inventory: {
        type: Sequelize.STRING,
        allowNull: true
      },
      coa_inventory_desc: {
        type: Sequelize.STRING,
        allowNull: true
      },
      coa_expense: {
        type: Sequelize.STRING,
        allowNull: true
      },
      coa_expense_desc: {
        type: Sequelize.STRING,
        allowNull: true
      },
      vendor: {
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

    // Indexes
    await queryInterface.addIndex('master_items', ['vendor']);
    await queryInterface.addIndex('master_items', ['warehouse']);
    await queryInterface.addIndex('master_items', ['stock_type']);
    await queryInterface.addIndex('master_items', ['stock_class']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('master_items');
  }
};
