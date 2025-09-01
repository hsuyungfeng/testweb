const { transformToStandardFormat, detectFileFormat } = require('./src/transformers/universalTransformer');
const fs = require('fs');

async function testCSVConversion() {
  try {
    const csvFile = './data/input/healthcare_dataset.csv';
    
    console.log('🔍 偵測文件格式...');
    const format = detectFileFormat(csvFile);
    console.log(`偵測到的格式: ${format}`);
    
    console.log('🔄 開始轉換CSV文件...');
    const standardizedData = await transformToStandardFormat(csvFile, format);
    
    console.log(`✅ 成功轉換 ${standardizedData.length} 筆記錄`);
    
    if (standardizedData.length > 0) {
      console.log('📋 前5筆轉換後的數據:');
      console.log(JSON.stringify(standardizedData.slice(0, 5), null, 2));
      
      // 測試CSV轉換
      function convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // 添加表頭
        csvRows.push(headers.join(','));
        
        // 添加數據行
        for (const row of data) {
          const values = headers.map(header => {
            const value = row[header] || '';
            // 處理包含逗號或引號的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
      }
      
      const csvContent = convertToCSV(standardizedData.slice(0, 10));
      
      console.log('📄 轉換後的CSV內容（前10筆）:');
      console.log(csvContent.substring(0, 500) + '...'); // 顯示前500字符
    }
    
  } catch (error) {
    console.error('❌ 轉換失敗:', error.message);
  }
}

testCSVConversion();