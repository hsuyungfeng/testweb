const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const {
  detectFileFormat,
  transformToStandardFormat,
  STANDARD_FIELD_MAPPING
} = require('./transformers/universalTransformer');
const {
  pool,
  insertPatients,
  getPatientsMap,
  insertVisits,
  insertDiagnoses,
  insertPrescriptions
} = require('./services/postgresService');

// 支援的檔案格式副檔名
const SUPPORTED_FORMATS = ['.xml', '.dbf', '.csv', '.mdb', '.accdb', '.txt'];

// 掃描輸入目錄尋找支援的檔案
function findSupportedFiles(inputDir) {
  try {
    const files = fs.readdirSync(inputDir);
    return files
      .filter(file => SUPPORTED_FORMATS.some(format => file.toLowerCase().endsWith(format)))
      .map(file => path.join(inputDir, file));
  } catch (error) {
    logger.error(`掃描輸入目錄時發生錯誤: ${error.message}`);
    return [];
  }
}

// 處理單一檔案
async function processSingleFile(filePath) {
  try {
    logger.log(`🔍 開始處理檔案: ${path.basename(filePath)}`);
    
    // 偵測檔案格式
    const format = detectFileFormat(filePath);
    logger.log(`📄 偵測到格式: ${format}`);
    
    if (format === 'unknown') {
      logger.warn(`⚠️  無法識別檔案格式: ${filePath}`);
      return { success: false, processed: 0 };
    }
    
    // 轉換為標準格式
    const standardizedData = await transformToStandardFormat(filePath, format);
    
    if (standardizedData.length === 0) {
      logger.warn(`📭 檔案沒有資料: ${filePath}`);
      return { success: false, processed: 0 };
    }
    
    logger.log(`✅ 成功轉換 ${standardizedData.length} 筆記錄`);
    
    // 根據資料內容決定如何處理
    const result = await processStandardizedData(standardizedData);
    
    return { 
      success: true, 
      processed: standardizedData.length,
      details: result 
    };
    
  } catch (error) {
    logger.error(`❌ 處理檔案 ${filePath} 時發生錯誤: ${error.message}`);
    return { success: false, processed: 0, error: error.message };
  }
}

// 處理標準化資料
async function processStandardizedData(data) {
  const result = {
    patients: 0,
    visits: 0,
    diagnoses: 0,
    prescriptions: 0
  };
  
  try {
    // 分離不同類型的資料
    const patients = [];
    const visits = [];
    const diagnoses = [];
    const prescriptions = [];
    
    for (const record of data) {
      // 根據欄位存在與否判斷資料類型
      if (record.id_card_number && record.name) {
        patients.push({
          id_card_number: record.id_card_number,
          name: record.name,
          birth_date: record.birth_date,
          gender: record.gender
        });
      }
      
      if (record.visit_date && record.id_card_number) {
        visits.push({
          patient_id: record.id_card_number,
          visit_date: record.visit_date
        });
      }
      
      if (record.icd10_code) {
        diagnoses.push({
          visit_id: record.visit_date, // 暫時使用就診日期作為關聯
          icd10_code: record.icd10_code,
          diagnosis_description: record.diagnosis_description
        });
      }
      
      if (record.medication_code) {
        prescriptions.push({
          visit_id: record.visit_date, // 暫時使用就診日期作為關聯
          medication_name: record.medication_name || record.medication_code,
          dosage: record.dosage,
          frequency: record.frequency,
          days: record.days,
          total_quantity: record.total_quantity
        });
      }
    }
    
    // 插入資料庫
    if (patients.length > 0) {
      result.patients = await insertPatients(patients);
    }
    
    if (visits.length > 0) {
      result.visits = await insertVisits(visits);
    }
    
    if (diagnoses.length > 0) {
      result.diagnoses = await insertDiagnoses(diagnoses);
    }
    
    if (prescriptions.length > 0) {
      result.prescriptions = await insertPrescriptions(prescriptions);
    }
    
    return result;
    
  } catch (error) {
    logger.error(`處理標準化資料時發生錯誤: ${error.message}`);
    throw error;
  }
}

// 主處理函數
async function processAllFiles() {
  logger.log("🚀 開始多格式資料處理流程");
  
  try {
    // 確保輸入目錄存在
    if (!fs.existsSync(config.dataPaths.input)) {
      fs.mkdirSync(config.dataPaths.input, { recursive: true });
      logger.log("📁 建立輸入目錄");
    }
    
    // 尋找支援的檔案
    const files = findSupportedFiles(config.dataPaths.input);
    
    if (files.length === 0) {
      logger.log("📭 輸入目錄中沒有找到支援的檔案");
      logger.log(`支援的格式: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }
    
    logger.log(`📂 找到 ${files.length} 個支援的檔案`);
    
    const results = [];
    let totalProcessed = 0;
    
    // 依序處理每個檔案
    for (const file of files) {
      const result = await processSingleFile(file);
      results.push({
        file: path.basename(file),
        ...result
      });
      
      if (result.success) {
        totalProcessed += result.processed;
      }
    }
    
    // 輸出處理結果摘要
    logger.log("\n📊 處理結果摘要:");
    logger.log("=".repeat(50));
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      logger.log(`${index + 1}. ${status} ${result.file}: ${result.processed} 筆記錄`);
      if (result.error) {
        logger.log(`   錯誤: ${result.error}`);
      }
    });
    
    logger.log(`\n🎯 總共處理: ${totalProcessed} 筆記錄`);
    logger.log("✅ 多格式資料處理完成");
    
  } catch (error) {
    logger.error(`❌ 處理流程發生嚴重錯誤: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

// 執行主程式
if (require.main === module) {
  processAllFiles().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { processAllFiles, processSingleFile, findSupportedFiles };