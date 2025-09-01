了解 ✅
我來幫您把「診所 HIS 舊式資料庫 → 通用格式 (CSV/JSON/XML) → PostgreSQL」的 **Node.js 專案骨架樣板**打包好。這個骨架可以支援未來 plug-in 模組化擴充（例如：DBF、Access、固定長度 TXT、CSV/XML），並內建「增量更新（記憶上次轉換時間）」功能。

---

# 📦 專案樣板設計

```
clinic-data-etl/
│── package.json
│── src/
│    ├── index.js                # 主入口
│    ├── config.js               # DB/匯出路徑設定
│    ├── loaders/                # 各種資料來源解析器
│    │    ├── dbfLoader.js       # 解析 FoxPro/DBF
│    │    ├── accessLoader.js    # 解析 Access/MDB
│    │    ├── txtLoader.js       # 解析固定長度 TXT
│    │    ├── csvLoader.js       # 匯入 CSV
│    │    ├── xmlLoader.js       # 匯入 XML
│    ├── transformers/           # 格式轉換器
│    │    ├── toCSV.js
│    │    ├── toJSON.js
│    │    ├── toXML.js
│    ├── services/
│    │    ├── postgresService.js # PostgreSQL 寫入與查詢
│    │    ├── stateService.js    # 記錄上次轉換時間
│    └── utils/
│         ├── fileUtils.js
│         ├── logger.js
│
└── docs/
     └── ARCHITECTURE.md         # 架構說明文件
```

---

# 📑 package.json (核心依賴)

```json
{
  "name": "clinic-data-etl",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "pg": "^8.11.3",                  
    "node-dbf": "^0.1.0",             
    "mdb-reader": "^3.2.0",           
    "fast-xml-parser": "^4.4.0",      
    "csv-parser": "^3.0.0",           
    "json2csv": "^6.0.0",             
    "fs-extra": "^11.2.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

# 📌 src/config.js

```js
module.exports = {
  postgres: {
    user: "clinic_user",
    host: "localhost",
    database: "clinic_data",
    password: "password123",
    port: 5432
  },
  dataPaths: {
    input: "./data/input/",
    output: "./data/output/"
  },
  stateFile: "./data/state.json"
};
```

---

# 📌 src/services/postgresService.js

```js
const { Pool } = require("pg");
const config = require("../config");

const pool = new Pool(config.postgres);

async function insertRecords(table, records) {
  const client = await pool.connect();
  try {
    for (const r of records) {
      await client.query(
        `INSERT INTO ${table} (data, created_at) VALUES ($1, NOW())`,
        [r]
      );
    }
  } finally {
    client.release();
  }
}

module.exports = { insertRecords };
```

---

# 📌 src/services/stateService.js

（用來記錄「上次轉換時間」，支援增量更新）

```js
const fs = require("fs");
const config = require("../config");

function getState() {
  if (!fs.existsSync(config.stateFile)) return {};
  return JSON.parse(fs.readFileSync(config.stateFile));
}

function setState(newState) {
  fs.writeFileSync(config.stateFile, JSON.stringify(newState, null, 2));
}

module.exports = { getState, setState };
```

---

# 📌 src/loaders/dbfLoader.js

```js
const { DBFFile } = require("node-dbf");

async function loadDBF(filePath) {
  const dbf = await DBFFile.open(filePath);
  const records = await dbf.readRecords();
  return records;
}

module.exports = { loadDBF };
```

---

# 📌 src/transformers/toJSON.js

```js
function toJSON(records) {
  return JSON.stringify(records, null, 2);
}

module.exports = { toJSON };
```

---

# 📌 src/index.js

```js
const { loadDBF } = require("./loaders/dbfLoader");
const { toJSON } = require("./transformers/toJSON");
const { insertRecords } = require("./services/postgresService");
const { getState, setState } = require("./services/stateService");
const fs = require("fs");
const config = require("./config");

(async () => {
  console.log("🚀 Clinic Data ETL Start");

  const state = getState();
  const lastRun = state.lastRun || null;

  // 範例：載入 DBF 檔
  const records = await loadDBF("./data/input/clinic.DBF");

  // 增量過濾 (假設 DBF 有 update_date 欄位)
  const newRecords = lastRun
    ? records.filter(r => new Date(r.update_date) > new Date(lastRun))
    : records;

  console.log(`👉 New Records: ${newRecords.length}`);

  // 轉成 JSON
  const json = toJSON(newRecords);
  fs.writeFileSync(`${config.dataPaths.output}/clinic.json`, json);

  // 寫入 PostgreSQL
  await insertRecords("clinic_table", newRecords);

  // 更新狀態
  setState({ lastRun: new Date().toISOString() });

  console.log("✅ ETL Complete");
})();
```

---

# 📖 後續擴充

1. 在 `loaders/` 裡加入 `accessLoader.js`, `txtLoader.js`, `csvLoader.js`, `xmlLoader.js`。
2. 在 `transformers/` 裡可以統一加 `toCSV`, `toXML`。
3. 之後只要在 `index.js` 加上「資料來源 → transformer → PostgreSQL」即可。

---

# 💻 開發進度 (2025-08-28)

**狀態：** 已完成專案初始化與框架搭建。

**已完成事項：**
1.  **建立目錄結構**: 已根據上方的設計圖，使用 `mkdir` 建立 `clinic-data-etl` 專案的完整目錄結構。
2.  **初始化 Node.js 專案**: 使用 `npm` 建立 `package.json` 檔案，並安裝了所有規劃的依賴套件 (`pg`, `node-dbf`, `fs-extra` 等)。
3.  **增強配置與安全性**: 
    *   新增 `dotenv` 套件。
    *   建立 `.env` 檔案來存放資料庫連線資訊等機密資料。
    *   `config.js` 現在會從 `.env` 檔案讀取設定，避免將密碼硬編碼在程式碼中。
    *   建立 `.gitignore` 檔案以忽略 `node_modules` 和 `.env` 等檔案。
4.  **實現核心模組**: 
    *   根據計畫，建立了 `stateService.js`, `postgresService.js`, `dbfLoader.js`, `toJSON.js` 的初始版本。
    *   新增了 `logger.js` 工具，為 ETL 流程提供帶時間戳的日誌輸出。
5.  **串連主流程**: `index.js` 已被建立，它引用了所有模組，構成了一個完整的、可執行的 ETL 流程骨架。

**目前狀態總結**: 
專案的基礎框架已經搭建完成，並融入了安全、日誌等最佳實踐。程式碼已準備好處理第一個資料來源 (DBF)，但需要實際的資料庫和範例檔案才能進行端到端測試。

**下一步計畫**:
1.  由使用者準備一個 PostgreSQL 測試資料庫。
2.  由使用者提供用於 `clinic_table` 的 SQL 建表語法。
3.  由使用者提供一個 `clinic.DBF` 範例檔案並放置於 `data/input` 目錄下。
4.  執行 `node src/index.js` 進行首次端到端測試。

---

# 🗄️ 最終資料庫結構 (PostgreSQL Schema)

這是我們為專案設計的、符合正規化的最終資料庫結構藍圖。ETL 的目標就是將舊有資料正確地對應並存入這些表中。

### 1. 病患基本资料 (`patients`)
儲存病患的個人資訊。
```sql
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    id_card_number VARCHAR(20) UNIQUE,
    name VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 就诊纪录 (`visits`)
記錄每一次的就診事件。
```sql
CREATE TABLE visits (
    visit_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    visit_date DATE NOT NULL,
    chief_complaint TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 診斷紀錄 (`diagnoses`)
記錄每次就診的診斷結果。
```sql
CREATE TABLE diagnoses (
    diagnosis_id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL REFERENCES visits(visit_id),
    icd10_code VARCHAR(20),
    diagnosis_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 處方與藥物紀錄 (`prescriptions`)
記錄每次就診開立的藥物。
```sql
CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL REFERENCES visits(visit_id),
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(50),
    frequency VARCHAR(50),
    days INT NOT NULL,
    total_quantity INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

# 💻 開發進度 (2025-08-28 v2)

**狀態：** 已完成真實資料 (`TOTFA.xml`) 的第一階段 ETL 程式碼開發。

**已完成事項：**
1.  **確認資料來源**: 使用者提供了真實的門診申報 XML 檔案 (`TOTFA.xml`) 以及其對應的格式說明文件 (`opd.pdf`)。這使得專案可以針對真實資料進行開發，取代了原先使用合成資料的計畫。
2.  **處理 Big5 編碼**: 成功安裝 `iconv-lite` 函式庫，以解決 Node.js 讀取 Big5 編碼檔案的問題。
3.  **實現 XML 解析器**: 新增 `src/loaders/xmlLoader.js`，此模組能讀取 `TOTFA.xml`，正確地將其從 Big5 解碼，並解析為 JavaScript 物件。
4.  **重構資料庫服務**: 更新 `src/services/postgresService.js`，建立了一個專門的 `insertPatients` 函式。此函式不僅能將病患資料寫入 `patients` 表，還能透過 `ON CONFLICT` 語法處理重複資料，確保資料的唯一性。
5.  **重構主程式**: 大幅修改 `index.js`，使其能夠：
    *   調用 `xmlLoader` 讀取真實的 XML 資料。
    *   從複雜的巢狀 XML 結構中，遍歷所有就診紀錄 (`<ddata>`)。
    *   抽取出不重複的病患基本資料（身分證號、生日等）。
    *   包含一個輔助函式，用於將民國年格式的日期（如 `1120718`）轉換為標準的 `YYYY-MM-DD` 格式。
    *   調用 `insertPatients` 將處理好的資料寫入資料庫。

**目前狀態總結**: 
專案的核心程式碼已完成重大升級，現在具備了處理真實世界 XML 資料並將其存入 `patients` 表的能力。第一階段的端到端流程已準備就緒，等待使用者測試。

**下一步計畫**:
1.  **由使用者建立資料表**: 在 PostgreSQL 中執行 `CREATE TABLE patients (...)` 指令。
2.  **由使用者執行測試**: 運行 `node clinic-data-etl/src/index.js` 指令。
3.  **由使用者驗證結果**: 在資料庫中查詢 `patients` 表，確認資料是否成功寫入。

---

# 🏆 里程碑 (2025-08-28 v3)

**狀態：** **成功！** 第一階段端到端 (End-to-End) 測試完成。

**已完成事項：**
1.  **問題排查與修復**: 我們透過迭代式的偵錯，成功解決了多個真實世界中的問題，包括：
    *   **路徑問題**：修正了 Node.js 腳本中相對路徑的解析問題。
    *   **日期格式問題**：增強了日期轉換函式，使其能同時處理6位數和7位數的民國年格式。
    *   **資料型別問題**：透過設定 XML 解析器，從源頭避免了數字型別的錯誤轉換，並移除了不必要的資料庫型別強制轉換。
    *   **資料庫權限問題**：為 `clinic_user` 使用者授予了對 `patients` 表的寫入權限。
2.  **成功匯入資料**: 使用者最終成功執行 `node clinic-data-etl/src/index.js` 腳本，沒有任何錯誤。
3.  **驗證結果**: 使用者在 `psql` 中查詢 `patients` 表，確認 **348 筆**獨特的病患資料已成功從 `TOTFA.xml` 寫入資料庫。

**目前狀態總結**: 
專案的核心功能（讀取、解析、轉換、載入）已經得到驗證。我們擁有一個可以運作的、穩固的 ETL 管道，能夠處理病患基本資料。這為後續擴充功能（如處理就診紀錄、醫令紀錄）打下了堅實的基礎。

**下一步計畫**:
1.  **擴充功能**：開始開發**就診紀錄 (`visits`)** 的資料提取與載入功能。
2.  **程式碼重構**：隨著功能增加，可以考慮將 `index.js` 中的資料轉換邏輯，拆分到 `transformers` 目錄中，讓主流程更清晰。

---

# 🚀 里程碑 (2025-08-28 v4)

**狀態：** **專案核心功能完成！**

**已完成事項：**
1.  **就診紀錄遷移**：成功擴充 ETL 流程，在寫入病患資料後，能從資料庫取回 `patient_id`，並將 XML 中的就診紀錄 (`<ddata>`) 與之關聯，成功寫入 `visits` 表。
2.  **診斷與處方遷移**：成功實現了最複雜的部份。程式碼現在可以深入解析每筆就診紀錄中的診斷碼 (`<d19>` 等) 和多筆處方 (`<pdata>`)，並將它們與正確的 `visit_id` 關聯，分別寫入 `diagnoses` 和 `prescriptions` 表。
3.  **完整性偵錯**：我們透過執行、觀察、修正的循環，解決了最後的幾個問題，包括：
    *   為 `visits` 表新增了 `UNIQUE` 約束，以支援 `ON CONFLICT` 的穩健寫入邏輯。
    *   修正了所有資料表的 `permission denied` 權限問題。
    *   修正了 `prescriptions` 表中 `days` 欄位的 `integer` 型別不匹配問題。

**目前狀態總結**: 
**專案成功！** ETL 工具現在能夠完整地解析 `TOTFA.xml` 檔案，並將其中的**病患、就診、诊断和处方**四種核心資料，以正規化的形式，準確無誤地寫入 PostgreSQL 資料庫的四張關聯表中。專案已達到初始設定的全部核心目標。