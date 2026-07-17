const xlsx = require('xlsx');
const path = require('path');
const sequelize = require('../config/db');
const masterItemRepository = require('../repositories/masterItemRepository');
const uploadHistoryRepository = require('../repositories/uploadHistoryRepository');
const stockSnapshotRepository = require('../repositories/stockSnapshotRepository');
const stockUsageRepository = require('../repositories/stockUsageRepository');
const { BadRequestError } = require('../utils/appError');

class UploadService {
  cleanStockCode(code) {
    if (code === null || code === undefined) return '';
    return String(code).trim().replace(/^'/, '');
  }

  parseNumeric(val) {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return val;
    const parsed = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  parseDateValue(val) {
    if (!val) return null;
    if (val instanceof Date) return val;
    // Handle excel date serial numbers (sometimes sheetjs reads them as numbers if cellDates is false)
    if (typeof val === 'number') {
      const date = new Date((val - 25569) * 86400 * 1000);
      return date;
    }
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  formatDate(dateObj) {
    if (!dateObj) return null;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async processUpload(filePath, fileName, uploadedByUserId) {
    let workbook;
    try {
      workbook = xlsx.readFile(filePath, { cellDates: true });
    } catch (error) {
      throw new BadRequestError('Failed to read Excel file. Please ensure it is a valid .xlsx file.');
    }

    const requiredSheets = ['DATA_MASTER + STOCK WHS', 'STOCK-WHS', 'STOCK-COGS', 'USAGE', 'KALKULASI'];
    for (const sheetName of requiredSheets) {
      if (!workbook.Sheets[sheetName]) {
        throw new BadRequestError(`Excel file is missing required sheet: "${sheetName}"`);
      }
    }

    // Create UploadHistory OUTSIDE transaction so status updates always persist
    const uploadLog = await uploadHistoryRepository.create({
      filename: fileName,
      upload_date: new Date(),
      uploaded_by: uploadedByUserId,
      status: 'PROCESSING'
    }, null);

    // Start database transaction for all data writes
    const transaction = await sequelize.transaction();

    try {
      // ----------------------------------------------------
      // A. PARSE DATA_MASTER + STOCK WHS
      // ----------------------------------------------------
      const masterSheet = workbook.Sheets['DATA_MASTER + STOCK WHS'];
      const masterRows = xlsx.utils.sheet_to_json(masterSheet, { header: 1 });
      if (masterRows.length < 2) throw new Error('DATA_MASTER sheet is empty');
      
      const masterHeaders = masterRows[0].map(h => String(h || '').trim());
      
      // Index mapping
      const mIdx = {
        code: masterHeaders.indexOf('Stockcode'),
        part: masterHeaders.indexOf('Part Number'),
        name: masterHeaders.indexOf('Item Name'),
        desc: masterHeaders.indexOf('Description'),
        whs: masterHeaders.indexOf('Warehouse'),
        mnem: masterHeaders.indexOf('Mnemonic'),
        class: masterHeaders.indexOf('Stock Class'),
        equip: masterHeaders.indexOf('Equipment'),
        uoi: masterHeaders.indexOf('UOI'),
        price: masterHeaders.indexOf('Price'),
        conv: masterHeaders.indexOf('Conv Factor'),
        type: masterHeaders.indexOf('Stock Type'),
        coaInv: masterHeaders.indexOf('COA Inventory'),
        coaInvDesc: masterHeaders.indexOf('COA Inventory Description'),
        coaExp: masterHeaders.indexOf('COA Expense'),
        coaExpDesc: masterHeaders.indexOf('COA Expense Description'),
        vendor: masterHeaders.indexOf('VENDOR COGS')
      };

      if (mIdx.code === -1 || mIdx.name === -1) {
        throw new Error('DATA_MASTER sheet is missing required columns (Stockcode or Item Name)');
      }

      const masterItemsData = [];
      const stockCodesSet = new Set();

      for (let i = 1; i < masterRows.length; i++) {
        const row = masterRows[i];
        if (!row || row.length === 0) continue;
        
        const rawCode = row[mIdx.code];
        if (rawCode === null || rawCode === undefined || String(rawCode).trim() === '') continue;
        
        const code = this.cleanStockCode(rawCode);
        if (stockCodesSet.has(code)) continue; // prevent duplicate stock codes in same upload
        stockCodesSet.add(code);

        masterItemsData.push({
          stock_code: code,
          part_number: row[mIdx.part] ? String(row[mIdx.part]).trim() : null,
          item_name: row[mIdx.name] ? String(row[mIdx.name]).trim() : 'Unknown Item',
          description: row[mIdx.desc] ? String(row[mIdx.desc]).trim() : null,
          warehouse: row[mIdx.whs] ? String(row[mIdx.whs]).trim() : 'TJB',
          mnemonic: row[mIdx.mnem] ? String(row[mIdx.mnem]).trim() : null,
          stock_class: row[mIdx.class] ? String(row[mIdx.class]).trim() : null,
          equipment: row[mIdx.equip] ? String(row[mIdx.equip]).trim() : null,
          uom: row[mIdx.uoi] ? String(row[mIdx.uoi]).trim() : 'EACH',
          price: this.parseNumeric(row[mIdx.price]),
          conv_factor: row[mIdx.conv] !== undefined ? this.parseNumeric(row[mIdx.conv]) : 1.00,
          stock_type: row[mIdx.type] ? String(row[mIdx.type]).trim() : null,
          coa_inventory: row[mIdx.coaInv] ? String(row[mIdx.coaInv]).trim() : null,
          coa_inventory_desc: row[mIdx.coaInvDesc] ? String(row[mIdx.coaInvDesc]).trim() : null,
          coa_expense: row[mIdx.coaExp] ? String(row[mIdx.coaExp]).trim() : null,
          coa_expense_desc: row[mIdx.coaExpDesc] ? String(row[mIdx.coaExpDesc]).trim() : null,
          vendor: row[mIdx.vendor] ? String(row[mIdx.vendor]).trim() : null
        });
      }

      // Upsert master items
      await masterItemRepository.upsertMany(masterItemsData, transaction);

      // Fetch all items from DB to map stock_code -> database item_id
      const dbItems = await masterItemRepository.getAll(transaction);
      const itemMap = new Map(); // stock_code -> database item_id
      const itemDetailsMap = new Map(); // stock_code -> MasterItem object
      dbItems.forEach(item => {
        itemMap.set(item.stock_code, item.id);
        itemDetailsMap.set(item.stock_code, item);
      });

      // ----------------------------------------------------
      // B. PARSE STOCK-WHS
      // ----------------------------------------------------
      const whsSheet = workbook.Sheets['STOCK-WHS'];
      const whsRows = xlsx.utils.sheet_to_json(whsSheet, { header: 1 });
      const whsHeaders = whsRows[0].map(h => String(h || '').trim());
      const wIdx = {
        code: whsHeaders.indexOf('Stockcode'),
        soh: whsHeaders.indexOf('SOH')
      };
      
      const sohMap = new Map(); // stock_code -> soh_qty
      for (let i = 1; i < whsRows.length; i++) {
        const row = whsRows[i];
        if (!row || row.length === 0) continue;
        const code = this.cleanStockCode(row[wIdx.code]);
        if (!code) continue;
        const soh = this.parseNumeric(row[wIdx.soh]);
        sohMap.set(code, soh);
      }

      // ----------------------------------------------------
      // C. PARSE STOCK-COGS
      // ----------------------------------------------------
      const cogsSheet = workbook.Sheets['STOCK-COGS'];
      const cogsRows = xlsx.utils.sheet_to_json(cogsSheet, { header: 1 });
      const cogsHeaders = cogsRows[0].map(h => String(h || '').trim());
      const cIdx = {
        code: cogsHeaders.indexOf('Stockcode'),
        coh: cogsHeaders.indexOf('COH')
      };

      const cohMap = new Map(); // stock_code -> coh_qty
      for (let i = 1; i < cogsRows.length; i++) {
        const row = cogsRows[i];
        if (!row || row.length === 0) continue;
        const code = this.cleanStockCode(row[cIdx.code]);
        if (!code) continue;
        const coh = this.parseNumeric(row[cIdx.coh]);
        cohMap.set(code, coh);
      }

      // ----------------------------------------------------
      // D. PARSE KALKULASI
      // ----------------------------------------------------
      const kalkSheet = workbook.Sheets['KALKULASI'];
      const kalkRows = xlsx.utils.sheet_to_json(kalkSheet, { header: 1 });
      const kalkHeaders = kalkRows[0].map(h => String(h || '').trim());
      
      const kIdx = {
        code: kalkHeaders.indexOf('Stockcode'),
        min: kalkHeaders.indexOf('MIN'),
        rop: kalkHeaders.indexOf('ROP'),
        roq: kalkHeaders.indexOf('ROQ'),
        totalStock: kalkHeaders.indexOf('Total Stock'),
        avgUsage: kalkHeaders.indexOf('AVG 6 Month'),
        daysStock: kalkHeaders.indexOf('Days Of Stock'),
        status: kalkHeaders.indexOf('Status'),
        alert: kalkHeaders.indexOf('Alert & Exception')
      };

      const kalkMap = new Map(); // stock_code -> kalkulasi object
      for (let i = 1; i < kalkRows.length; i++) {
        const row = kalkRows[i];
        if (!row || row.length === 0) continue;
        const code = this.cleanStockCode(row[kIdx.code]);
        if (!code) continue;

        kalkMap.set(code, {
          min: this.parseNumeric(row[kIdx.min]),
          rop: this.parseNumeric(row[kIdx.rop]),
          roq: this.parseNumeric(row[kIdx.roq]),
          totalStock: this.parseNumeric(row[kIdx.totalStock]),
          avgUsage: this.parseNumeric(row[kIdx.avgUsage]),
          daysStock: this.parseNumeric(row[kIdx.daysStock]),
          status: row[kIdx.status] ? String(row[kIdx.status]).trim().toUpperCase() : 'NO STOCK',
          alert: row[kIdx.alert] ? String(row[kIdx.alert]).trim().toUpperCase() : 'NO STOCK'
        });
      }

      // ----------------------------------------------------
      // E. CREATE AND INSERT SNAPSHOTS
      // ----------------------------------------------------
      const snapshotDateStr = this.formatDate(new Date());
      const snapshotsToInsert = [];

      for (const stockCode of stockCodesSet) {
        const itemId = itemMap.get(stockCode);
        const itemDetail = itemDetailsMap.get(stockCode);
        if (!itemId) continue;

        const soh = sohMap.get(stockCode) || 0;
        const coh = cohMap.get(stockCode) || 0;
        const price = itemDetail.price || 0;

        const kalk = kalkMap.get(stockCode) || {
          min: 0, rop: 0, roq: 0, totalStock: 0, avgUsage: 0, daysStock: 0, status: 'NO STOCK', alert: 'NO STOCK'
        };

        // Recalculate status just in case (safe-guards from Excel formulas errors)
        // Aman: SOH > ROP
        // Warning: SOH <= ROP and SOH > MIN
        // Critical: SOH <= MIN
        let finalStatus = kalk.status;
        const stockForStatus = soh + coh;
        if (stockForStatus === 0 && kalk.rop === 0) {
          finalStatus = 'NO STOCK';
        } else if (stockForStatus > kalk.rop && kalk.daysStock > 15) {
          finalStatus = 'SAFE';
        } else if (stockForStatus < kalk.rop && kalk.daysStock < 15) {
          finalStatus = 'CRITICAL';
        } else {
          finalStatus = 'WARNING';
        }

        snapshotsToInsert.push({
          upload_id: uploadLog.id,
          item_id: itemId,
          snapshot_date: snapshotDateStr,
          soh_qty: soh,
          coh_qty: coh,
          soh_amount: soh * price,
          coh_amount: coh * price,
          min_qty: kalk.min,
          rop_qty: kalk.rop,
          roq_qty: kalk.roq,
          days_stock: kalk.daysStock,
          status: finalStatus,
          alert_exception: kalk.alert,
          avg_usage: kalk.avgUsage
        });
      }

      await stockSnapshotRepository.bulkCreate(snapshotsToInsert, transaction);

      // ----------------------------------------------------
      // F. PARSE USAGE & INSERT
      // ----------------------------------------------------
      const usageSheet = workbook.Sheets['USAGE'];
      const usageRows = xlsx.utils.sheet_to_json(usageSheet, { header: 1 });
      const usageHeaders = usageRows[0];
      
      const uIdx = {
        code: usageHeaders.indexOf('Stockcode')
      };

      // Detect date columns
      const dateColumns = []; // Array of { index, formattedDate }
      for (let c = 0; c < usageHeaders.length; c++) {
        const headerVal = usageHeaders[c];
        const dateObj = this.parseDateValue(headerVal);
        if (dateObj) {
          dateColumns.push({
            index: c,
            formattedDate: this.formatDate(dateObj)
          });
        }
      }

      const usagesToInsert = [];
      for (let i = 1; i < usageRows.length; i++) {
        const row = usageRows[i];
        if (!row || row.length === 0) continue;
        const code = this.cleanStockCode(row[uIdx.code]);
        if (!code) continue;
        
        const itemId = itemMap.get(code);
        if (!itemId) continue;

        for (const dateCol of dateColumns) {
          const qty = this.parseNumeric(row[dateCol.index]);
          usagesToInsert.push({
            upload_id: uploadLog.id,
            item_id: itemId,
            usage_date: dateCol.formattedDate,
            usage_qty: qty
          });
        }
      }

      if (usagesToInsert.length > 0) {
        await stockUsageRepository.bulkCreate(usagesToInsert, transaction);
      }

      await transaction.commit();

      // 3. Mark log status as SUCCESS (after commit, outside transaction)
      await uploadHistoryRepository.updateStatus(uploadLog.id, 'SUCCESS');
      return uploadLog;
    } catch (error) {
      console.error('Error during upload transaction rollback:', error);
      await transaction.rollback();
      await uploadHistoryRepository.updateStatus(uploadLog.id, 'FAILED', error.message);
      throw error;
    }
  }
}

module.exports = new UploadService();
