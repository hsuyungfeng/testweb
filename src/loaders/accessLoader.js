const MDBReader = require('mdb-reader');
const fs = require('fs');
const logger = require('../utils/logger');

async function loadAccess(filePath, tableName = null) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Access 檔案不存在: ${filePath}`);
    }
    
    const reader = new MDBReader(filePath);
    const tables = reader.getTableNames();
    
    logger.log(`找到 Access 資料表: ${tables.join(', ')}`);
    
    // 如果未指定資料表，嘗試自動偵測
    let targetTable = tableName;
    if (!targetTable) {
      // 常見的診所資料表名稱
      const commonTables = ['patients', 'visits', 'diagnoses', 'prescriptions', '病患', '就診', '診斷', '處方'];
      targetTable = tables.find(table => 
        commonTables.includes(table.toLowerCase())
      ) || tables[0];
    }
    
    if (!targetTable) {
      throw new Error('未找到可用的資料表');
    }
    
    logger.log(`載入資料表: ${targetTable}`);
    const table = reader.getTable(targetTable);
    const data = [];
    
    for await (const row of table) {
      data.push(row);
    }
    
    logger.log(`成功載入 ${data.length} 筆 Access 記錄`);
    return data;
    
  } catch (error) {
    logger.error(`載入 Access 檔案時發生錯誤: ${error.message}`);
    throw error;
  }
}

// 獲取所有資料表資訊
async function getAccessTableInfo(filePath) {
  try {
    const reader = new MDBReader(filePath);
    const tables = reader.getTableNames();
    
    const tableInfo = [];
    for (const tableName of tables) {
      const table = reader.getTable(tableName);
      const columnNames = table.getColumnNames();
      const rowCount = await table.getRowCount();
      
      tableInfo.push({
        name: tableName,
        columns: columnNames,
        rowCount: rowCount
      });
    }
    
    return tableInfo;
  } catch (error) {
    logger.error(`獲取 Access 資料表資訊時發生錯誤: ${error.message}`);
    throw error;
  }
}

module.exports = { loadAccess, getAccessTableInfo };