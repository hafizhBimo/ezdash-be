'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_snapshots', {
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
      snapshot_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      soh_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      coh_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      soh_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      coh_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      min_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      rop_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      roq_qty: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      days_stock: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'NO STOCK'
      },
      alert_exception: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'NO STOCK'
      },
      avg_usage: {
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
    await queryInterface.addIndex('stock_snapshots', ['upload_id']);
    await queryInterface.addIndex('stock_snapshots', ['item_id']);
    await queryInterface.addIndex('stock_snapshots', ['snapshot_date']);
    await queryInterface.addIndex('stock_snapshots', ['status']);
    await queryInterface.addIndex('stock_snapshots', ['alert_exception']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_snapshots');
  }
};
