# 診所數據管理系統 - 使用方式與技術棧

## 🏥 專案概述

本系統是一個專為台灣診所設計的健保申報資料處理平台，提供多檔案合併、數據轉換和資料庫管理功能。系統將傳統HIS系統的各種格式（XML、DBF等）轉換為標準化格式並存入PostgreSQL資料庫。

## 🛠 技術棧

### 後端技術 (Backend)
- **Node.js** - JavaScript 運行時環境
- **Express.js** - Web 應用程式框架
- **PostgreSQL** - 關聯式資料庫管理系統
- **連接池管理** - 高效的資料庫連接管理

### 檔案處理套件
- **multer** - 處理檔案上傳中介軟體
- **adm-zip** - ZIP 檔案解壓縮處理
- **iconv-lite** - Big5/UTF-8 編碼轉換
- **fast-xml-parser** - XML 解析和生成

### 前端技術 (Frontend)
- **HTML5** - 網頁結構標記語言
- **CSS3** - 樣式設計和響應式布局
- **JavaScript (ES6+)** - 客戶端邏輯處理
- **Fetch API** - 非同步HTTP請求處理

### 資料庫架構
```sql
patients (病患資料表)
visits (就診記錄表) 
diagnoses (診斷記錄表)
prescriptions (處方記錄表)
```

### 編碼處理
- **Big5 編碼支援** - 完整支援繁體中文顯示
- **自動編碼檢測** - 智能識別和轉換文字編碼
- **統一輸出格式** - 確保所有輸出使用正確編碼

## 📖 使用方式

### 1. 系統訪問
```bash
# 啟動伺服器
node server.js

# 訪問網頁
打開瀏覽器訪問: http://localhost:3005
```

### 2. 檔案上傳與合併

#### 步驟說明：
1. 選擇「文件上傳與合併」選項卡
2. 點擊「選擇檔案」按鈕，選取一個或多個ZIP檔案
3. 點擊「開始合併與下載」按鈕
4. 系統自動處理並提供合併後的XML檔案下載

#### 支援格式：
- **ZIP 檔案**：包含健保申報XML檔案
- **XML 格式**：符合台灣健保申報標準格式
- **編碼**：Big5 繁體中文編碼

### 3. 數據查看器

#### 功能說明：
1. 選擇「數據查看器」選項卡
2. 查看即時統計資料：
   - 病患記錄數量
   - 就診記錄數量  
   - 診斷記錄數量
   - 處方記錄數量
3. 點擊各區塊按鈕載入詳細資料

#### 可查看資料：
- **病患資料**：身分證號、姓名、出生日期、性別
- **就診記錄**：就診ID、病患ID、就診日期
- **診斷記錄**：診斷ID、就診ID、ICD10碼、診斷描述
- **處方記錄**：處方ID、就診ID、藥品名稱、劑量、頻率、天數、總量

### 4. API 使用

#### 檔案合併端點
```javascript
POST /api/merge-files
Content-Type: multipart/form-data

參數: zipFiles (多個ZIP檔案)
回應: 合併後的XML檔案 + 統計資訊Header
```

#### 數據查詢端點
```javascript
GET /api/stats          # 獲取統計資料
GET /api/patients       # 獲取病患資料
GET /api/visits         # 獲取就診記錄
GET /api/diagnoses      # 獲取診斷記錄  
GET /api/prescriptions  # 獲取處方記錄
```

## ⚙️ 環境配置

### 必要環境變數 (.env)
```env
PG_USER=clinic_user
PG_HOST=localhost
PG_DATABASE=clinic_data
PG_PASSWORD=password123
PG_PORT=5433
INPUT_PATH=./data/input/
OUTPUT_PATH=./data/output/
```

### 資料庫設定
1. 確保 PostgreSQL 服務運行中
2. 執行 `create_tables.sql` 創建資料表
3. 執行 `grant_permissions.sql` 設定使用者權限
4. 執行 `fix_prescriptions.sql` 修正處方表結構

## 🚀 部署指南

### 開發環境啟動
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
node server.js

# 或使用開發模式 (需安裝nodemon)
npm run dev
```

### 生產環境部署
1. 設定環境變數
2. 確保資料庫服務正常運行
3. 使用 process manager (如 PM2) 管理進程
4. 配置反向代理 (如 Nginx)
5. 設定日誌輪替和監控

## 🔧 故障排除

### 常見問題

1. **中文亂碼問題**
   - 確保系統使用 Big5 編碼處理
   - 檢查 XML 檔案編碼格式

2. **資料庫連接失敗**
   - 檢查 PostgreSQL 服務狀態
   - 確認環境變數設定正確

3. **檔案上傳失敗**
   - 檢查 uploads 目錄權限
   - 確認檔案格式符合要求

4. **記憶體不足**
   - 大型檔案處理時增加 Node.js 記憶體限制
   - 使用 `--max-old-space-size` 參數

## 📊 系統特性

- **即時處理**：檔案上傳後立即處理並回傳結果
- **進度顯示**：即時顯示處理進度和統計資訊
- **錯誤處理**：完善的錯誤處理和用戶提示
- **日誌記錄**：詳細的操作日誌和錯誤追蹤
- **資源管理**：自動清理暫存檔案和資源釋放

## 🔮 未來擴展

### 第二階段功能（已實現）

#### 多格式資料轉換支援
系統現在支援處理台灣常見的HIS系統格式：

| 格式類型 | 典型系統 | 支援狀態 | 主要功能 |
|---------|---------|---------|---------|
| **DBF** | 展望、醫聖、耀聖 | ✅ 完整支援 | Big5編碼處理、欄位自動對應 |
| **Access** | 自製/小規模系統 | ✅ 完整支援 | MDB/ACCDB檔案讀取、資料表偵測 |
| **固定寬度TXT** | 早期健保申報 | ✅ 完整支援 | 格式定義載入、自動偵測 |
| **CSV/Excel** | 報表匯出 | ✅ 完整支援 | 編碼自動偵測、欄位對應 |
| **XML** | 健保交換格式 | ✅ 原有功能 | Big5編碼處理、標準結構 |

#### 通用轉換器架構
```javascript
// 自動格式偵測與轉換
const { detectFileFormat, transformToStandardFormat } = require('./src/transformers/universalTransformer');

// 使用方式
const format = detectFileFormat('patient_data.dbf');
const standardizedData = await transformToStandardFormat('patient_data.dbf', format);
```

#### 標準化欄位對應
系統內建標準欄位對應表，支援各大HIS系統的欄位名稱自動映射到統一格式。

#### 使用指令
```bash
# 啟動多格式處理
npm run start-multi

# 開發模式
npm run dev-multi
```

## 📞 技術支援

### 系統需求
- Node.js 14.0+
- PostgreSQL 12.0+
- 現代網頁瀏覽器

### 檔案規格
- **多格式支援**: DBF, Access (MDB/ACCDB), CSV, 固定寬度TXT, XML
- **檔案大小限制**: 100MB (ZIP), 50MB (單一檔案)
- **記錄數量**: 無限制（支援批次處理）
- **支援編碼**: Big5, UTF-8, CP950
- **自動偵測**: 格式自動識別、編碼自動偵測

### 效能指標
- 同時處理檔案數: 10+
- 平均處理時間: < 30秒 (1000筆記錄)
- 記憶體使用: < 500MB

---

**版本**: 1.0.0  
**最後更新**: 2025-09-01  
**技術聯絡**: 系統管理員