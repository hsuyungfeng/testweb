const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');
const AdmZip = require('adm-zip');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const iconv = require('iconv-lite');
const { Pool } = require('pg');
const { detectFileFormat, transformToStandardFormat } = require('./src/transformers/universalTransformer');
require('dotenv').config();

// 数据库连接池
const pool = new Pool({
    user: process.env.PG_USER || 'clinic_user',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'clinic_data',
    password: process.env.PG_PASSWORD || 'password123',
    port: process.env.PG_PORT || 5433,
});

const app = express();
const port = 3007;

// --- Configuration ---
const uploadDir = path.join(__dirname, 'uploads');
const mergedDir = path.join(__dirname, 'merged');
[uploadDir, mergedDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

const parser = new XMLParser({ 
    ignoreAttributes: false, 
    parseTagValue: true,
    tagValueProcessor: (tagName, tagValue) => {
        // 统一处理Big5编码的文本
        if (typeof tagValue === 'string' && tagValue.length > 0) {
            try {
                // 尝试将字符串从Big5解码
                const buffer = Buffer.from(tagValue, 'binary');
                const decoded = iconv.decode(buffer, 'Big5');
                
                // 检查解码后的结果是否包含有效的中文字符
                // 如果解码后仍然包含乱码字符，则返回原始值
                if (/[\u4e00-\u9fff]/.test(decoded) || !/[^\x00-\x7F]/.test(decoded)) {
                    return decoded;
                }
                return tagValue;
            } catch (e) {
                return tagValue;
            }
        }
        return tagValue;
    }
});
const builder = new XMLBuilder({ format: true, ignoreAttributes: false, suppressEmptyNode: true, encoding: 'Big5' });

// CSV转换函数
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // 添加表头
    csvRows.push(headers.join(','));
    
    // 添加数据行
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            // 处理包含逗号或引号的值
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

// --- Middleware ---
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/merge-files', upload.array('zipFiles'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let allDdata = [];
    let templateJson = null;
    const tempExtractDir = path.join(__dirname, 'temp_extract');
    const mergeStats = {
        totalFiles: req.files.length,
        totalRecords: 0,
        fileDetails: []
    };

    try {
        if (!fs.existsSync(tempExtractDir)) {
            fs.mkdirSync(tempExtractDir);
        }

        req.files.forEach((file, index) => {
            console.log(`📦 處理檔案: ${file.originalname}...`);
            const zip = new AdmZip(file.path);
            zip.extractAllTo(tempExtractDir, true);

            const xmlFileName = zip.getEntries()[0].entryName; // Assuming first file is the XML
            const xmlFilePath = path.join(tempExtractDir, xmlFileName);
            
            console.log(`   📄 讀取XML檔案: ${xmlFileName}`);
            const fileBuffer = fs.readFileSync(xmlFilePath);
            const xmlDataStr = iconv.decode(fileBuffer, 'Big5');
            const jsonObj = parser.parse(xmlDataStr);

            if (jsonObj.outpatient && jsonObj.outpatient.ddata) {
                if (index === 0) {
                    templateJson = { ...jsonObj }; // Create a copy for the template
                    console.log(`   ✅ 使用作為模板檔案`);
                }
                const ddata = Array.isArray(jsonObj.outpatient.ddata) ? jsonObj.outpatient.ddata : [jsonObj.outpatient.ddata];
                const recordCount = ddata.length;
                
                console.log(`   📊 找到 ${recordCount} 筆記錄`);
                
                // Get first 5 records with detailed information
                const firstFiveRecords = ddata.slice(0, 5).map(record => ({
                    patientId: record.dbody?.d3 || 'N/A',
                    patientName: record.dbody?.d49 || 'N/A',
                    visitDate: record.dbody?.d9 || 'N/A',
                    diagnosis: [
                        record.dbody?.d19 || '',
                        record.dbody?.d20 || '',
                        record.dbody?.d21 || '',
                        record.dbody?.d22 || ''
                    ].filter(d => d).join(', '),
                    medications: record.dbody?.pdata ? 
                        (Array.isArray(record.dbody.pdata) ? 
                         record.dbody.pdata.slice(0, 3).map(p => p.p4 || 'N/A').join(', ') : 
                         record.dbody.pdata.p4 || 'N/A') : '無'
                }));

                mergeStats.fileDetails.push({
                    filename: file.originalname,
                    recordCount: recordCount,
                    sampleRecords: firstFiveRecords
                });
                
                mergeStats.totalRecords += recordCount;
                allDdata.push(...ddata);
                
                console.log(`   ✅ 已添加 ${recordCount} 筆記錄到合併池`);
            } else {
                console.log(`   ⚠️  此檔案中未找到有效的門診資料`);
            }
        });

        if (!templateJson) {
            throw new Error('No valid XML structure found in the uploaded files.');
        }

        console.log(`🔗 正在合併 ${mergeStats.totalRecords} 筆總記錄...`);
        
        // Replace ddata in template with the merged array
        templateJson.outpatient.ddata = allDdata;

        const mergedXmlStr = builder.build(templateJson);
        const mergedXmlBuffer = iconv.encode(mergedXmlStr, 'Big5');

        const outputFileName = `merged_${Date.now()}.xml`;
        const outputFilePath = path.join(mergedDir, outputFileName);
        fs.writeFileSync(outputFilePath, mergedXmlBuffer);
        console.log(`💾 合併檔案已儲存: ${outputFilePath}`);
        console.log(`📦 總共處理檔案: ${mergeStats.totalFiles} 個`);
        console.log(`📊 總共合併記錄: ${mergeStats.totalRecords} 筆`);

        // Read the file and send it as response with merge stats in JSON body
        const fileBuffer = fs.readFileSync(outputFilePath);
        
        res.setHeader('Content-Type', 'application/xml; charset=Big5');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
        res.setHeader('Content-Length', fileBuffer.length);
        
        // Include merge stats in a custom header (base64 encoded to avoid invalid characters)
        const base64Stats = Buffer.from(JSON.stringify(mergeStats)).toString('base64');
        res.setHeader('X-Merge-Stats-B64', base64Stats);
        
        // Send the file
        res.send(fileBuffer);
        
        // Clean up files after sending
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        req.files.forEach(f => fs.unlinkSync(f.path));
        fs.unlinkSync(outputFilePath);

    } catch (error) {
        console.error('An error occurred during the merge process:', error);
        res.status(500).send('An error occurred on the server.');
        // Clean up in case of error
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        req.files.forEach(f => fs.unlinkSync(f.path));
    }
});

// --- Data Viewer API Routes ---
app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM patients ORDER BY patient_id LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/visits', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM visits ORDER BY visit_id LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching visits:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/diagnoses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM diagnoses ORDER BY diagnosis_id LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching diagnoses:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/prescriptions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prescriptions ORDER BY prescription_id LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const patientCount = await pool.query('SELECT COUNT(*) FROM patients');
        const visitCount = await pool.query('SELECT COUNT(*) FROM visits');
        const diagnosisCount = await pool.query('SELECT COUNT(*) FROM diagnoses');
        const prescriptionCount = await pool.query('SELECT COUNT(*) FROM prescriptions');
        
        res.json({
            patientCount: parseInt(patientCount.rows[0].count),
            visitCount: parseInt(visitCount.rows[0].count),
            diagnosisCount: parseInt(diagnosisCount.rows[0].count),
            prescriptionCount: parseInt(prescriptionCount.rows[0].count)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- 多格式处理 API ---
app.post('/api/process-multi-format', upload.array('multiFiles'), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const results = [];
    let totalProcessed = 0;

    try {
        console.log(`📦 开始处理 ${req.files.length} 个多格式文件`);

        for (const file of req.files) {
            try {
                console.log(`🔍 处理文件: ${file.originalname}`);
                
                // 侦测文件格式
                const format = detectFileFormat(file.originalname);
                console.log(`  格式: ${format}`);

                if (format === 'unknown') {
                    results.push({
                        filename: file.originalname,
                        success: false,
                        error: '无法识别的文件格式'
                    });
                    continue;
                }

                // 转换为标准格式
                const standardizedData = await transformToStandardFormat(file.path, format);
                
                if (standardizedData.length === 0) {
                    results.push({
                        filename: file.originalname,
                        success: false,
                        error: '文件没有数据或转换失败'
                    });
                    continue;
                }

                console.log(`✅ 成功转换 ${standardizedData.length} 笔记录`);

                // 保存为CSV文件
                const timestamp = Date.now();
                const outputFilename = `${timestamp}_${path.parse(file.originalname).name}.csv`;
                const outputPath = path.join(__dirname, 'processed_files', outputFilename);
                
                // 转换为CSV格式并保存
                if (standardizedData.length > 0) {
                    const csvData = convertToCSV(standardizedData);
                    fs.writeFileSync(outputPath, csvData);
                    console.log(`💾 已保存CSV文件: ${outputFilename}`);
                }

                // 这里可以添加数据库插入逻辑
                // 暂时先记录成功
                results.push({
                    filename: file.originalname,
                    success: true,
                    format: format,
                    records: standardizedData.length,
                    sample: standardizedData.slice(0, 10), // 前10笔样本数据
                    downloadFilename: outputFilename,
                    downloadUrl: `/api/download-processed/${outputFilename}`
                });

                totalProcessed += standardizedData.length;

                // 清理临时文件
                fs.unlinkSync(file.path);

            } catch (error) {
                console.error(`处理文件 ${file.originalname} 时发生错误:`, error.message);
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: error.message
                });
                
                // 清理临时文件
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        console.log(`🎯 多格式处理完成，总共处理 ${totalProcessed} 笔记录`);
        res.json({
            success: true,
            totalProcessed: totalProcessed,
            results: results
        });

    } catch (error) {
        console.error('多格式处理发生严重错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
        
        // 清理所有临时文件
        req.files.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });
    }
});

// 处理文件下载端点
app.get('/api/download-processed/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'processed_files', filename);
    
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: '文件不存在' });
    }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});