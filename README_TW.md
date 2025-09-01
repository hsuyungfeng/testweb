# 台灣診所HIS數據轉換系統

## 🏥 系統概述

這是一個專門為台灣基層診所設計的HIS（醫院信息系統）數據遷移工具，支援多種傳統數據格式（DBF、Access、固定寬度TXT、XML、CSV）轉換為標準化格式並加載到PostgreSQL數據庫。

## 🛠 技術棧

### 後端技術
- **Node.js** - 運行時環境
- **Express.js** - Web服務器框架
- **PostgreSQL** - 關係型數據庫
- **Multer** - 文件上傳處理
- **Adm-Zip** - ZIP文件解壓縮

### 數據處理庫
- **fast-xml-parser** - XML解析
- **iconv-lite** - Big5編碼轉換
- **csv-parser** - CSV文件解析
- **node-dbf** - DBF文件讀取
- **mdb-reader** - Access數據庫讀取

### 開發工具
- **dotenv** - 環境變數管理
- **nodemon** - 開發熱重載

## 📋 系統功能

### 1. 多格式數據轉換
- ✅ XML文件（Big5編碼）
- ✅ CSV文件（自動編碼偵測）
- ✅ DBF文件（dBase格式）
- ✅ Access數據庫（.mdb/.accdb）
- ✅ 固定寬度文字檔

### 2. 數據標準化映射
將不同來源的醫療數據統一映射到標準醫療數據結構：

```javascript
// 標準字段映射示例
const STANDARD_FIELD_MAPPING = {
  'id_card_number': ['PAT_IDNO', '身分證號', 'ID_NO', 'ID_NUMBER', 'ID'],
  'name': ['PAT_NAME', '姓名', 'NAME', 'PATIENT_NAME', 'Name'],
  'birth_date': ['PAT_BIR', '出生日期', 'BIRTH_DATE', 'BIRTHDAY', 'Date of Birth'],
  // ... 更多映射關係
};
```

### 3. Web管理界面
- 文件上傳與合併
- 實時數據預覽
- 轉換進度監控
- 數據庫統計查詢

## 🚀 部署指南

### 環境要求
- Node.js 16+
- PostgreSQL 12+
- npm 或 yarn

### 1. 安裝依賴
```bash
npm install
```

### 2. 數據庫設置
```bash
# 創建數據庫
createdb clinic_data

# 創建用戶
createuser clinic_user

# 設置密權
psql -c "ALTER USER clinic_user WITH PASSWORD 'password123';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE clinic_data TO clinic_user;"
```

### 3. 數據庫初始化
```bash
# 執行創表語句
psql -d clinic_data -f create_tables.sql

# 設置權限
psql -d clinic_data -f grant_permissions.sql

# 添加約束
psql -d clinic_data -f add_constraints.sql
```

### 4. 環境配置
創建 `.env` 文件：
```env
PG_USER=clinic_user
PG_HOST=localhost
PG_DATABASE=clinic_data
PG_PASSWORD=password123
PG_PORT=5433
INPUT_PATH=./data/input/
OUTPUT_PATH=./data/output/
```

### 5. 啟動服務
```bash
# 開發模式（熱重載）
npm run dev

# 生產模式
npm start

# 啟動Web服務器
node server.js
```

服務器將在 `http://localhost:3009` 啟動

## 📊 數據映射結構

### 標準醫療數據模型

#### 1. 病患基本資料 (patients)
```sql
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    id_card_number VARCHAR(20) UNIQUE,  -- 身分證統一編號
    name VARCHAR(100) NOT NULL,         -- 病患姓名
    birth_date DATE NOT NULL,           -- 出生日期
    gender VARCHAR(10),                 -- 性別
    phone_number VARCHAR(20),           -- 電話號碼
    address VARCHAR(255),               -- 地址
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. 就診紀錄 (visits)
```sql
CREATE TABLE visits (
    visit_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    visit_date DATE NOT NULL,           -- 就診日期
    chief_complaint TEXT,               -- 主訴
    doctor_notes TEXT,                  -- 醫師註記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. 診斷紀錄 (diagnoses)
```sql
CREATE TABLE diagnoses (
    diagnosis_id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL REFERENCES visits(visit_id),
    icd10_code VARCHAR(20),             -- 國際疾病分類碼
    diagnosis_description TEXT NOT NULL,-- 診斷描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. 處方紀錄 (prescriptions)
```sql
CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL REFERENCES visits(visit_id),
    medication_name VARCHAR(255) NOT NULL, -- 藥品名稱
    dosage VARCHAR(50),                   -- 劑量
    frequency VARCHAR(50),                -- 頻率
    days INT NOT NULL,                    -- 天數
    total_quantity INT NOT NULL,          -- 總量
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 數據映射規則

### 自動映射機制
系統支援四層映射策略：

1. **精確匹配** - 欄位名稱完全匹配（不分大小寫）
2. **部分匹配** - 欄位名稱包含關係
3. **標準字段直接使用** - 來源字段本身就是標準名稱
4. **保留原始字段** - 無匹配時保留原始數據

### 常見映射示例

#### XML數據映射
```xml
<!-- 原始XML -->
<dbody>
  <d3>A123456789</d3>      <!-- 身分證號 -->
  <d49>王小明</d49>        <!-- 姓名 -->
  <d11>0670101</d11>       <!-- 民國出生日期 -->
  <d9>1121201</d9>         <!-- 民國就診日期 -->
  <d19>J45</d19>           <!-- 診斷碼1 -->
  <d20>E11</d20>           <!-- 診斷碼2 -->
</dbody>

<!-- 映射後 -->
{
  "id_card_number": "A123456789",
  "name": "王小明",
  "birth_date": "1978-01-01",        // 自動轉換為西元日期
  "visit_date": "2023-12-01",        // 自動轉換為西元日期
  "icd10_code": "J45"                // 診斷碼
}
```

#### CSV數據映射
```csv
# 原始CSV
Name,Age,Gender,Blood Type,Medical Condition,Date of Admission
王小明,45,Male,A+,Diabetes,2023-11-15

# 映射後
{
  "name": "王小明",
  "age": "45",
  "gender": "Male",
  "blood_type": "A+",
  "icd10_code": "Diabetes",
  "visit_date": "2023-11-15"
}
```

## 🎯 使用場景

### 1. 單一文件轉換
```bash
# 處理單個XML文件
npm start
```

### 2. 批量文件處理
```bash
# 處理多格式文件
npm run start-multi
```

### 3. Web界面操作
1. 訪問 `http://localhost:3009`
2. 上傳ZIP或單一文件
3. 系統自動偵測格式並轉換
4. 下載標準化CSV或查看數據庫

## 🛡 數據安全

- 所有敏感配置通過環境變數管理
- 數據庫連接使用連接池
- 文件上傳有大小限制和類型檢查
- 自動清理臨時文件

## 📈 性能優化

- 批次處理避免內存溢出
- 數據庫批量插入
- 異步處理提高吞吐量
- 連接池管理數據庫連接

## 🐛 故障排除

### 常見問題

1. **編碼問題**
   - 確保XML文件為Big5編碼
   - CSV文件自動偵測編碼

2. **數據庫連接失敗**
   - 檢查PostgreSQL服務是否啟動
   - 確認`.env`配置正確

3. **權限問題**
   - 確保數據庫用戶有足夠權限
   - 檢查文件讀寫權限

### 日誌查看
```bash
# 查看轉換日誌
tail -f logs/app.log
```

## 📞 技術支援

如有技術問題，請檢查：
1. 日誌文件中的錯誤信息
2. 數據庫連接狀態
3. 文件格式和編碼

---

**版本**: 1.0.0  
**最後更新**: 2024-01-01  
**技術支援**: clinic-support@example.com