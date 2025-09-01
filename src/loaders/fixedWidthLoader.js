const fs = require('fs');
const iconv = require('iconv-lite');
const logger = require('../utils/logger');

// 常見的健保申報固定寬度格式定義
const COMMON_FORMATS = {
  // 台灣健保常見固定寬度格式
  'NHI_CLAIM': [
    { name: 'id_card_number', start: 0, length: 10, type: 'string' },
    { name: 'name', start: 10, length: 20, type: 'string' },
    { name: 'birth_date', start: 30, length: 7, type: 'string' },
    { name: 'visit_date', start: 37, length: 7, type: 'string' },
    { name: 'diagnosis_code', start: 44, length: 10, type: 'string' },
    { name: 'medication_code', start: 54, length: 10, type: 'string' }
  ],
  
  // 簡化的病患基本資料格式
  'PATIENT_BASIC': [
    { name: 'id_number', start: 0, length: 10, type: 'string' },
    { name: 'name', start: 10, length: 20, type: 'string' },
    { name: 'birth_date', start: 30, length: 8, type: 'date' },
    { name: 'gender', start: 38, length: 1, type: 'string' }
  ]
};

async function loadFixedWidth(filePath, formatDefinition, encoding = 'big5') {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const content = iconv.decode(fileBuffer, encoding);
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    const results = [];
    
    for (const line of lines) {
      const record = {};
      
      for (const field of formatDefinition) {
        const value = line.substring(field.start, field.start + field.length).trim();
        
        // 根據類型轉換資料
        switch(field.type) {
          case 'number':
            record[field.name] = value ? parseFloat(value) : null;
            break;
          case 'date':
            record[field.name] = formatTWDate(value);
            break;
          default:
            record[field.name] = value;
        }
      }
      
      results.push(record);
    }
    
    logger.log(`成功載入 ${results.length} 筆固定寬度記錄`);
    return results;
    
  } catch (error) {
    logger.error(`載入固定寬度檔案時發生錯誤: ${error.message}`);
    throw error;
  }
}

// 自動偵測固定寬度格式
function autoDetectFormat(sampleLines) {
  // 簡單的啟發式偵測：尋找常見的欄位模式
  // 這需要根據實際檔案內容進行調整
  
  if (sampleLines.length === 0) return null;
  
  const firstLine = sampleLines[0];
  
  // 檢查是否包含常見的健保格式特徵
  if (firstLine.length >= 50) {
    // 檢查身分證號格式（開頭通常是字母）
    const idPart = firstLine.substring(0, 10).trim();
    if (/^[A-Z][0-9]{9}$/.test(idPart)) {
      return COMMON_FORMATS.NHI_CLAIM;
    }
    
    // 檢查姓名欄位（通常包含中文字符）
    const namePart = firstLine.substring(10, 30).trim();
    if (/[\u4e00-\u9fff]/.test(namePart)) {
      return COMMON_FORMATS.NHI_CLAIM;
    }
  }
  
  return null;
}

// 民國年轉西元年
function formatTWDate(twDateStr) {
  if (!twDateStr || twDateStr.length !== 7) return null;
  
  try {
    const year = parseInt(twDateStr.substring(0, 3)) + 1911;
    const month = twDateStr.substring(3, 5);
    const day = twDateStr.substring(5, 7);
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return null;
  }
}

// 從JSON檔案載入格式定義
function loadFormatDefinitionFromFile(formatFilePath) {
  try {
    const formatData = fs.readFileSync(formatFilePath, 'utf8');
    return JSON.parse(formatData);
  } catch (error) {
    logger.error(`載入格式定義檔案時發生錯誤: ${error.message}`);
    throw error;
  }
}

module.exports = { 
  loadFixedWidth, 
  autoDetectFormat, 
  COMMON_FORMATS, 
  loadFormatDefinitionFromFile 
};