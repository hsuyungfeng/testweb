const { loadXML } = require('../loaders/xmlLoader');
const { loadDBF } = require('../loaders/dbfLoader');
const { loadCSV } = require('../loaders/csvLoader');
const { loadAccess } = require('../loaders/accessLoader');
const { loadFixedWidth } = require('../loaders/fixedWidthLoader');
const logger = require('../utils/logger');

// 標準化資料結構對應表
const STANDARD_FIELD_MAPPING = {
  // 病患基本資料
  'id_card_number': ['PAT_IDNO', '身分證號', 'ID_NO', 'ID_NUMBER', 'ID', 'Patient ID'],
  'name': ['PAT_NAME', '姓名', 'NAME', 'PATIENT_NAME', 'Name', 'Patient Name'],
  'birth_date': ['PAT_BIR', '出生日期', 'BIRTH_DATE', 'BIRTHDAY', 'Date of Birth', 'Birth Date', 'DOB'],
  'gender': ['PAT_SEX', '性別', 'GENDER', 'SEX', 'Gender'],
  'age': ['Age', '年齡', 'PAT_AGE'],
  
  // 就診記錄
  'visit_date': ['VIS_DATE', '就診日期', 'DATE', 'VISIT_DATE', 'Date of Admission', 'Admission Date'],
  'visit_id': ['VIS_ID', '就診編號', 'VISIT_NO', 'VISIT_ID', 'Visit ID'],
  'discharge_date': ['Discharge Date', '出院日期', 'DISCHARGE_DATE'],
  'admission_type': ['Admission Type', '入院類型', 'ADM_TYPE'],
  
  // 診斷記錄
  'icd10_code': ['ICD10', '診斷碼', 'DIAG_CODE', 'DIAGNOSIS_CODE', 'Medical Condition', 'Diagnosis'],
  'diagnosis_description': ['DIAG_DESC', '診斷描述', 'DIAGNOSIS', 'DESCRIPTION', 'Condition Description'],
  
  // 處方記錄
  'medication_code': ['DRUG_CODE', '藥品代碼', 'MED_CODE', 'DRUG_NO', 'Medication Code'],
  'medication_name': ['DRUG_NAME', '藥品名稱', 'MED_NAME', 'DRUG_NAME', 'Medication', 'Drug Name'],
  'dosage': ['DOSAGE', '劑量', 'DOSE', 'AMOUNT', 'Dosage'],
  'frequency': ['FREQ', '頻率', 'FREQUENCY', 'TIMES', 'Frequency'],
  'days': ['DAYS', '天數', 'DAY_COUNT', 'DURATION', 'Days'],
  'total_quantity': ['TOTAL_QTY', '總量', 'QUANTITY', 'TOTAL', 'Billing Amount', 'Amount'],
  
  // 其他醫療資訊
  'blood_type': ['Blood Type', '血型', 'BLOOD_TYPE'],
  'doctor': ['Doctor', '醫師', 'DOCTOR', 'Physician'],
  'hospital': ['Hospital', '醫院', 'HOSPITAL'],
  'insurance_provider': ['Insurance Provider', '保險公司', 'INSURANCE'],
  'room_number': ['Room Number', '病房號碼', 'ROOM_NO'],
  'test_results': ['Test Results', '檢驗結果', 'TEST_RESULT']
};

// 格式偵測函數
function detectFileFormat(filePath) {
  const extension = filePath.toLowerCase().split('.').pop();
  
  switch(extension) {
    case 'xml':
      return 'xml';
    case 'dbf':
      return 'dbf';
    case 'csv':
    case 'txt':
      return 'csv';
    case 'mdb':
    case 'accdb':
      return 'access';
    default:
      // 嘗試偵測固定寬度文字檔
      return 'unknown';
  }
}

// 通用轉換函數
async function transformToStandardFormat(filePath, format, customMapping = {}) {
  try {
    let rawData;
    
    // 根據格式載入資料
    switch(format) {
      case 'xml':
        const xmlData = loadXML(filePath);
        // XML有特殊的結構，需要提取ddata陣列
        if (xmlData && xmlData.outpatient && xmlData.outpatient.ddata) {
          rawData = Array.isArray(xmlData.outpatient.ddata) 
            ? xmlData.outpatient.ddata 
            : [xmlData.outpatient.ddata];
        } else {
          rawData = [];
        }
        break;
      case 'dbf':
        rawData = await loadDBF(filePath);
        break;
      case 'csv':
        rawData = await loadCSV(filePath);
        break;
      case 'access':
        rawData = await loadAccess(filePath);
        break;
      case 'fixedwidth':
        rawData = await loadFixedWidth(filePath);
        break;
      default:
        throw new Error(`不支援的檔案格式: ${format}`);
    }
    
    if (!rawData || rawData.length === 0) {
      logger.warn(`檔案 ${filePath} 沒有資料或載入失敗`);
      return [];
    }
    
    // 標準化資料轉換
    const standardizedData = standardizeData(rawData, customMapping);
    
    logger.log(`成功轉換 ${standardizedData.length} 筆記錄到標準格式`);
    return standardizedData;
    
  } catch (error) {
    logger.error(`轉換檔案 ${filePath} 時發生錯誤: ${error.message}`);
    throw error;
  }
}

// 資料標準化函數
function standardizeData(rawData, customMapping = {}) {
  const finalMapping = { ...STANDARD_FIELD_MAPPING, ...customMapping };
  
  return rawData.map(record => {
    const standardized = {};
    
    // 首先，檢查記錄中是否已經有標準欄位名稱（直接使用）
    Object.keys(record).forEach(sourceField => {
      const sourceValue = record[sourceField];
      if (sourceValue === undefined || sourceValue === null || sourceValue === '') {
        return; // 跳過空值
      }
      
      // 尋找這個來源欄位對應的標準欄位
      let mapped = false;
      
      // 1. 精確匹配（不分大小寫）
      const sourceLower = sourceField.toLowerCase();
      for (const [standardField, possibleSourceFields] of Object.entries(finalMapping)) {
        const matchedField = possibleSourceFields.find(field => 
          field.toLowerCase() === sourceLower
        );
        if (matchedField) {
          standardized[standardField] = sourceValue;
          mapped = true;
          break;
        }
      }
      
      // 2. 部分匹配（包含關係）
      if (!mapped) {
        for (const [standardField, possibleSourceFields] of Object.entries(finalMapping)) {
          const partialMatch = possibleSourceFields.find(field => 
            sourceLower.includes(field.toLowerCase()) || field.toLowerCase().includes(sourceLower)
          );
          if (partialMatch) {
            standardized[standardField] = sourceValue;
            mapped = true;
            break;
          }
        }
      }
      
      // 3. 如果來源欄位本身就是標準欄位名稱，直接使用
      if (!mapped && finalMapping[sourceField] && !standardized[sourceField]) {
        standardized[sourceField] = sourceValue;
        mapped = true;
      }
      
      // 4. 如果都沒有匹配，保留原始欄位
      if (!mapped) {
        standardized[sourceField] = sourceValue;
      }
    });
    
    return standardized;
  });
}

// 批次處理函數（避免記憶體不足）
async function processInBatches(filePath, format, batchSize = 1000, processBatch) {
  let batch = [];
  let processedCount = 0;
  
  // 根據不同格式實現批次讀取
  // 這裡需要根據具體格式實現批次處理邏輯
  
  return processedCount;
}

module.exports = {
  detectFileFormat,
  transformToStandardFormat,
  standardizeData,
  processInBatches,
  STANDARD_FIELD_MAPPING
};