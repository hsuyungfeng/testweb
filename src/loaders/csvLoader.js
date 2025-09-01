const csv = require('csv-parser');
const fs = require('fs');
const iconv = require('iconv-lite');
const logger = require('../utils/logger');

async function loadCSV(filePath, encoding = 'big5') {
  return new Promise((resolve, reject) => {
    const results = [];
    
    try {
      fs.createReadStream(filePath)
        .pipe(iconv.decodeStream(encoding))
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          logger.log(`成功載入 ${results.length} 筆 CSV 記錄`);
          resolve(results);
        })
        .on('error', (error) => {
          logger.error(`載入 CSV 檔案時發生錯誤: ${error.message}`);
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

// 自動偵測編碼並載入
async function loadCSVWithAutoEncoding(filePath) {
  // 嘗試常見的編碼
  const encodings = ['big5', 'utf8', 'cp950'];
  
  for (const encoding of encodings) {
    try {
      const data = await loadCSV(filePath, encoding);
      if (data.length > 0) {
        logger.log(`使用編碼 ${encoding} 成功載入 CSV`);
        return data;
      }
    } catch (error) {
      // 嘗試下一個編碼
      continue;
    }
  }
  
  throw new Error('無法自動偵測 CSV 檔案編碼');
}

module.exports = { loadCSV, loadCSVWithAutoEncoding };