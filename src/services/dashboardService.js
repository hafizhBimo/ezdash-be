const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');
const stockSnapshotRepository = require('../repositories/stockSnapshotRepository');
const stockUsageRepository = require('../repositories/stockUsageRepository');

class DashboardService {
  async getDashboardSummary(filters = {}) {
    // 1. Get latest successful upload
    const latestUpload = await uploadHistoryRepository.getLatestSuccessful();
    if (!latestUpload) {
      return {
        latestUpload: null,
        summary: {
          totalSKU: 0,
          totalSOH: 0,
          totalCOH: 0,
          totalValue: 0,
          avgDaysStock: 0
        }
      };
    }

    // Use latest upload ID unless a specific upload ID or date range is provided in filters
    const uploadId = filters.upload_id ? parseInt(filters.upload_id, 10) : latestUpload.id;

    const summary = await stockSnapshotRepository.getSummary(uploadId, filters);

    return {
      latestUpload: {
        id: latestUpload.id,
        filename: latestUpload.filename,
        upload_date: latestUpload.upload_date
      },
      summary
    };
  }

  async getDashboardCharts(filters = {}) {
    const latestUpload = await uploadHistoryRepository.getLatestSuccessful();
    if (!latestUpload) {
      return {
        stockDistribution: [],
        stockTypeDistribution: [],
        stockClassDistribution: [],
        vendorConsignment: [],
        coverageDistribution: [],
        trends: {
          inventoryValue: [],
          usage: []
        }
      };
    }

    const uploadId = filters.upload_id ? parseInt(filters.upload_id, 10) : latestUpload.id;

    // 1. Stock Distribution (SOH vs COH)
    const summary = await stockSnapshotRepository.getSummary(uploadId, filters);
    const stockDistribution = [
      { name: 'Stock Gudang (SOH)', value: summary.totalSOH },
      { name: 'Stock Consignment (COH)', value: summary.totalCOH }
    ];

    // 2. Stock Type Distribution
    const rawStockType = await stockSnapshotRepository.getStockTypeDistribution(uploadId, filters);
    const stockTypeDistribution = rawStockType.map(r => ({
      name: r.stock_type || 'N/A',
      value: parseInt(r.count, 10)
    }));

    // 3. Stock Class Distribution
    const rawStockClass = await stockSnapshotRepository.getStockClassDistribution(uploadId, filters);
    const stockClassDistribution = rawStockClass.map(r => ({
      name: r.stock_class || 'N/A',
      value: parseInt(r.count, 10)
    }));

    // 4. Vendor Consignment (Top 5)
    const rawVendor = await stockSnapshotRepository.getVendorConsignment(uploadId, filters);
    const vendorConsignment = rawVendor.map(r => ({
      vendor: r.vendor,
      coh: parseFloat(r.total_coh)
    }));

    // 5. Coverage Distribution
    const rawCoverage = await stockSnapshotRepository.getCoverageBuckets(uploadId, filters);
    const coverageDistribution = [
      { name: 'No Stock (0 days)', value: rawCoverage.zeroStock },
      { name: 'Critical (< 15 days)', value: rawCoverage.under15 },
      { name: 'Warning (15-30 days)', value: rawCoverage.range15to30 },
      { name: 'Safe (30-60 days)', value: rawCoverage.range30to60 },
      { name: 'Safe (60-90 days)', value: rawCoverage.range60to90 },
      { name: 'Safe (> 90 days)', value: rawCoverage.over90 }
    ];

    // 6. Top 10 Usage items
    const rawTopUsage = await stockUsageRepository.getTopUsageItems(uploadId, filters);
    const topUsageItems = rawTopUsage.map(r => ({
      stockCode: r.item.stock_code,
      name: r.item.item_name,
      usage: parseFloat(r.total_usage)
    }));

    // 7. Trend Lines (History)
    const valueHistory = await stockSnapshotRepository.getInventoryValueHistory();
    const usageHistory = await stockUsageRepository.getUsageHistory();

    const trends = {
      inventoryValue: valueHistory.map(h => ({
        date: h.snapshot_date,
        value: parseFloat(h.value)
      })),
      usage: usageHistory.map(h => ({
        date: h.usage_date,
        value: parseFloat(h.total_usage)
      }))
    };

    return {
      stockDistribution,
      stockTypeDistribution,
      stockClassDistribution,
      vendorConsignment,
      coverageDistribution,
      topUsageItems,
      trends
    };
  }
}

module.exports = new DashboardService();
