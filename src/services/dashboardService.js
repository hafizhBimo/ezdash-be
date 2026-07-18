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
    const usageSummary = await stockUsageRepository.getUsageSummary(uploadId, filters);
    
    // Merge usage into summary
    summary.totalUsageQty = usageSummary.totalUsageQty;
    summary.totalUsageValue = usageSummary.totalUsageValue;

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
        agingBuckets: {},
        alertSummary: {},
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
      { name: '> 30 Hari (Aman)', value: rawCoverage.aman },
      { name: '15 - 30 Hari (Warning)', value: rawCoverage.warning },
      { name: '< 15 Hari (Critical)', value: rawCoverage.critical }
    ];

    // 6. Aging Buckets & Alert Summary
    const agingBuckets = await stockSnapshotRepository.getAgingBuckets(uploadId, filters);
    const alertSummary = await stockSnapshotRepository.getAlertSummary(uploadId, filters);

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
      agingBuckets,
      alertSummary,
      topUsageItems,
      trends
    };
  }
}

module.exports = new DashboardService();
