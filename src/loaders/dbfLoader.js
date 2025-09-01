const { DBFFile } = require("node-dbf");
const iconv = require('iconv-lite');
const logger = require("../utils/logger");

async function loadDBF(filePath, encoding = 'big5') {
  try {
    logger.log(`開啟 DBF 檔案: ${filePath}`);
    const dbf = await DBFFile.open(filePath);
    
    // 獲取欄位資訊
    const fieldInfo = dbf.fields.map(field => ({
      name: field.name,
      type: field.type,
      length: field.length,
      decimal: field.decimal
    }));
    
    logger.log(`DBF 欄位資訊: ${JSON.stringify(fieldInfo)}`);
    
    const records = await dbf.readRecords();
    
    // 處理 Big5 編碼的字串欄位
    const processedRecords = records.map(record => {
      const processed = {};
      
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.length > 0) {
          try {
            // 嘗試解碼 Big5 編碼
            const buffer = Buffer.from(value, 'binary');
            processed[key] = iconv.decode(buffer, encoding);
          } catch (error) {
            processed[key] = value; // 保持原值
          }
        } else {
          processed[key] = value;
        }
      }
      
      return processed;
    });
    
    logger.log(`成功載入 ${processedRecords.length} 筆 DBF 記錄`);
    return processedRecords;
    
  } catch (err) {
    logger.error(`載入 DBF 檔案 ${filePath} 時發生錯誤: ${err.message}`);
    throw err;
  }
}

// 獲取 DBF 檔案結構資訊
async function getDBFStructure(filePath) {
  try {
    const dbf = await DBFFile.open(filePath);
    
    return {
      recordCount: dbf.recordCount,
      fields: dbf.fields.map(field => ({
        name: field.name,
        type: field.type,
        length: field.length,
        decimal: field.decimal
      })),
      encoding: 'big5' // 台灣系統通常使用 Big5
    };
  } catch (error) {
    logger.error(`獲取 DBF 結構時發生錯誤: ${error.message}`);
    throw error;
  }
}

module.exports = { loadDBF, getDBFStructure };
