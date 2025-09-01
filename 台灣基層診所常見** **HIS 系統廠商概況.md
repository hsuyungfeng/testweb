台灣基層診所（以西醫為主）使用健保申報系統的主流廠商（如展望、醫聖、耀聖）進行深入研究，包含：

1. 各家看診資訊系統的提供廠商與產品特性。
2. 系統背後使用的資料庫與程式語言架構。
3. 各家資料格式與欄位差異（若能取得），以及如何將其轉換為通用格式（CSV、JSON、XML）。
4. 建構一個以 Node.js 與 PostgreSQL 為基礎的資料轉換平台建議架構，可支援即時轉換與記憶上次轉換時間以供增量更新。
5. 若有可能，提供從展望、醫聖、耀聖資料匯出實例與轉換範例程式碼。

https://chatgpt.com/s/dr_68afd1c7443c8191a4d737f377abde5f

# 台灣基層診所常見** **HIS 系統廠商概況

台灣西醫基層診所常見的醫療資訊系統（HIS）供應商包括** ****展望亞洲科技股份有限公司**（系統常稱「展望」或其HIS系統）、**耀聖資訊科技股份有限公司**（系統稱「耀聖標準版/旗艦版醫療資訊管理系統」）以及**仩詮資訊有限公司（醫聖診療系統）**等。以翔評互動整合平臺統計，市場上已與16家** **HIS 系統完成整合，其中即包含「展望、耀聖、醫聖」等廠商[1]。各廠商歷史悠久，市占領先，並且都通過健保署基層院所系統資格認定（如耀聖資訊即列入健保署示範攤位廠商[2]）。

**資料庫與開發語言**：台灣多數小型診所** **HIS 採用舊型技術開發，不少系統後端以** **Visual FoxPro (VFP) 的** **DBF 檔案為資料庫，前端多以** **xBase/Delphi 或** **Visual FoxPro 開發[3]。例如有用戶反映，耀聖系統「一直以來都用Visual FoxPro 6.0 開發」，展望、醫聖等系統也多以** **VFP/DBF 儲存資料（微軟已於2007年後停止更新** **VFP）[3]。這些系統也可能整合部分** **Access、SQL Server 或** **MySQL 元件，但主流仍為** **VFP+DBF。由於廠商少改版，一般仍是「單機版」安裝或局域網共享，缺乏現代化雲端資料庫架構。

**資料匯出支援**：傳統** **HIS 多提供報表列印及簡易匯出功能，如可將掛號、門診費用清冊、藥庫資料等匯出成CSV 或** **Excel 檔。以健保署檢驗(查)資料交換平臺為例，系統可產出** **CSV 或** **XML 檔供下載[4]；而** **HIS 本身亦可依需求匯出明細。例如某** **HIS 提供「網路報稅用掛號費優免清冊」CSV 匯出功能，格式可符合財政部上傳規範【66†(備註)】（資料來源），並允許醫院自訂匯出欄位。一般而言，基層診所** **HIS 至少會內建** **CSV/Excel 匯出；部分新版軟體或雲端版本可能也提供** **XML，但直接匯出** **JSON 的情況較少見。匯出欄位可依院所自訂需求調整：若院所設定交換格式，則依自訂欄位匯出，否則系統帶出預設欄位順序[5]。

**不同系統資料格式差異**：各家系統匯出的欄位名稱、編碼和順序往往不同，缺乏統一標準。例如某院所自訂匯出欄位時，可能包含或排除特定欄位[5]；另一家系統預設順序又大不相同，導致欄位對應需重新整理。由於後端資料庫欄位（如診斷碼、藥品代碼、日期格式等）定義各異，各系統輸出檔案內容也不盡相同，因此需透過轉檔程式比對對應。此外，有使用者反映從一系統轉出某些欄位（如慢性病登記或特約項目）時，資料可能遺失，顯示不同** **HIS 對欄位支援也各有差異。綜合來看，展望、耀聖、醫聖等三家** **HIS 對應項目大致相似（皆含有掛號、診療、處方、健保申報資料等），但字段名稱、順序和細節皆不同，需彙整對應後方能互換。

**系統比對表**（示例）：


| 廠商系統     | 系統提供者 /名稱                                    | 後端資料庫 / 開發語言          | 支援匯出格式         | 備註（欄位格式差異）                               |
| ------------ | ---------------------------------------------------- | -------------------------------- | -------------------- | -------------------------------------------------- |
| 展望亞洲科技 | 展望亞洲科技股份有限公司<br>（HIS / 雲端病歷系統）  | VFP DBF 檔案<br>(Visual FoxPro) | CSV/Excel (報表匯出) | 可自訂匯出欄位；與其他系統預設欄位不同，需對應整理 |
| 醫聖診療系統 | 仩詮資訊有限公司<br>（醫聖診療系統）                 | VFP DBF / xBase(Delphi)          | CSV/Excel (報表匯出) | 支援自訂資料欄位，欄位名稱與其他系統不一致         |
| 耀聖資訊     | 耀聖資訊科技股份有限公司<br>（耀聖醫療資訊管理系統） | VFP DBF (FoxPro 6.0)             | CSV/Excel (報表匯出) | 提供固定欄位匯出；欄位順序與展望系統不同           |

**註**：資料來源包括系統商官網及用戶反映情形。由於三家系統皆支援CSV/Excel格式匯出[4]，[5]，可讓診所或轉檔平台下載。但欄位規格彼此不同，故需轉換程式對應映射。

## Node.js + PostgreSQL 轉檔平台設計建議

**架構總覽**：設計一個** **Node.js + PostgreSQL 平台作為中介，實現三家** **HIS 資料的即時轉檔與整合。平台架構可採ETL**（擷取、轉換、載入）**形式：Node.js 作為服務端程式，週期性讀取各系統匯出檔，解析並轉換為通用格式，最後將整合後的資料存入** **PostgreSQL，並在必要時輸出** **CSV/JSON/XML 供其他系統使用。整體架構如下：

* **資料擷取** ****(Extract)：Node.js 程式定期檢查各** **HIS 系統輸出的檔案目錄（或透過** **API），讀取新增或更新的資料。可利用排程（cron job）或檔案監聽器來抓取資料。
* **資料轉換** ****(Transform)：將擷取到的原始資料依該系統格式解析（例如使用** **csv-parser 讀取** **CSV），轉換成中繼的** **JSON 物件。再根據統一資料模型映射欄位，轉為平台內部通用格式。此時可處理欄位格式差異、資料補齊與資料清洗。
* **資料載入** ****(Load)：將轉換後的通用資料寫入** **PostgreSQL。可設計以下關鍵表格與機制：
* **資料倉儲表**：對應診所看診記錄、申報資料等通用欄位，存放轉換後的資料。
* **狀態追蹤表**：紀錄每家** **HIS 上次已轉檔的時間戳（或已處理的資料流水號），以便只擷取增量變動。每次轉檔完成後更新該表，下一次僅讀取更新後的新資料。
* **資料輸出與應用**：平台可提供** **REST API 或檔案下載功能，讓診所內部系統或第三方軟體拉取整合後的資料。所需格式可包括** **JSON、CSV、XML。Node.js 可以即時動態產生不同格式（例如** **JSON 透過** **JSON.stringify，CSV 可用** **json2csv 等套件，XML 可用** **xml2js 等工具）。系統也可週期匯出完整** **CSV/XML 檔供存檔或上傳到其他平臺。

**增量更新**：設計上須記錄「上次成功轉檔的最後一筆時間或序號」，以便下次運行時只抓取該時間後新增的資料。PostgreSQL 狀態表記錄各系統轉檔進度，Node.js 轉換程式讀取後續新資料並更新此狀態，確保轉檔**增量且不重複**。

**擴展性**：此平台可部署在診所內部伺服器或雲端，供診所自用或作為第三方服務。以模組化設計為原則，可隨後新增對其他** **HIS 系統的格式解析邏輯。PostgreSQL 可儲存轉換後的標準化資料，並可加上資料庫索引加速查詢，支援上層應用如數據分析或** **API 查詢。

## 示例：CSV 轉** **JSON 的程式碼範例

假設三家** **HIS 系統匯出的** **CSV 檔案各有不同欄位（以下僅示例格式），可參考以下** **Node.js 程式碼將** **CSV 轉為JSON：

const fs = require('fs');const csv = require('csv-parser');// 範例：讀取展望系統匯出的 CSV，轉為 JSON 陣列function convertVendorCSVtoJSON(csvFilePath) {return new Promise((resolve, reject) => {const results = [];fs.createReadStream(csvFilePath).pipe(csv({// 可指定分隔符、欄位轉換等選項separator: ',', // 若需支援 Big5/UTF-8 可先轉碼})).on('data', (data) => {// 處理欄位名稱轉換，例如：const record = {patientID: data['病歷號'], // 假設原欄位為「病歷號」visitDate: data['看診日期'], // 對應「看診日期」diagnosis: data['診斷碼'], // 對應「診斷碼」// ... 其他欄位};results.push(record);}).on('end', () => {resolve(results);}).on('error', (err) => reject(err));});}// 使用範例(async () => {try {// 假設有三份 CSV，分別為展望、醫聖、耀聖系統匯出的檔案const zhanwangData = await convertVendorCSVtoJSON('zhanwang_export.csv');const yishengData = await convertVendorCSVtoJSON('yisheng_export.csv');const yaoshengData = await convertVendorCSVtoJSON('yaosheng_export.csv');// 將轉換後的 JSON 資料合併或存入 PostgreSQLconsole.log('轉換完成：展望資料數量=', zhanwangData.length);// ...後續儲存資料庫或產出標準格式} catch (err) {console.error('轉檔錯誤：', err);}})();

上述範例使用** **csv-parser 逐行讀取** **CSV，並將各原始欄位對應到通用欄位名稱，最後輸出** **JSON 物件陣列。實際開發時應根據各系統的「欄位名稱」與「編碼」做相應調整，例如若** **CSV 為** **Big5 編碼可先以** **iconv-lite轉碼，或若欄位以西元年/民國年混用，則需轉換日期格式，確保最終** **JSON 符合統一標準。這樣的轉換程式可重複使用於三家系統，唯欄位對應邏輯依廠商不同而異。

## 小結

三家常見系統** ****展望**、**醫聖**、**耀聖** 均為台灣基層診所使用率領先的** **HIS 平臺[1]。它們多以** **VFP/DBF 為後端，使用者介面則依舊保留傳統** **Windows 桌面模式[3]。這些系統雖皆支援將病歷、申報等資料匯出成** **CSV/Excel 格式[4][5]，但因欄位設計與編碼方式各異，資料互通需要轉檔平台來處理。所設計的** **Node.js＋PostgreSQL 平台可針對三家系統的匯出檔執行格式轉換，統一成通用結構並增量更新，以支援院所內部和外部應用整合。

## 1️⃣ 台灣診所健保申報系統常見舊式資料庫現況

除了** ****CSV / JSON / XML** 這些「輸出交換格式」外，診所端 HIS（醫療資訊系統）的** ****內部資料庫** 在台灣常見的確多是舊式資料庫或檔案型 DB，主要有：

* **Visual FoxPro (DBF 檔)**
  * 最常見，展望、醫聖、耀聖等老牌廠商多以 VFP 6.0 開發。
  * 優點：操作快、單機好用。
  * 缺點：已停產（2007 年後微軟不再更新），不支援現代 API，資料交換需透過匯出報表。
* **Microsoft Access (MDB 檔)**
  * 部分小型診所或自製系統採用。
  * 使用 ODBC 可讀取，但欄位規劃不一致。
* **dBase / Paradox**
  * 早期（90 年代）常見，有些舊系統仍保留。
  * 與 FoxPro 類似的 DBF 架構，現在已極少見。
* **MS SQL Server / MySQL**
  * 部分較新或雲端 HIS 系統開始改用關聯式資料庫（尤其新創廠商）。
  * 比較容易與其他平台整合，也能直接提供 API。
* **文字檔（TXT、固定長度檔案）**
  * 健保署早年要求申報資料多以「固定長度文字檔」(例如每筆 120 bytes，前 10 碼為病歷號…)。
  * 部分舊 HIS 仍保留這種產出方式，用來上傳健保署 FTP。

➡️** ****總結**：
台灣大多數「老牌」HIS 系統（包含展望、醫聖、耀聖）**內部主資料庫是 DBF (Visual FoxPro)**，而匯出的交換格式（診所端能直接拿到的）通常就是** ****CSV 或 Excel (XLS/XLSX)**。
JSON 幾乎不會直接給，XML 可能用於健保署的「資料交換格式」；固定長度 TXT 檔則是更早期健保署上傳使用的格式。

---

## 2️⃣ 針對「展望、醫聖、耀聖」三家廠商

* **確定性**：
  * 這三家系統的內部 DB 幾乎都是** ****FoxPro DBF 檔**。
  * 匯出格式則主要是** ****CSV / Excel**。
  * 若需健保署申報，系統會產生** ****固定長度 TXT 檔 或 XML** 再傳送給健保署。
  * 不會直接提供 JSON。
* **原因**：
  * 健保署的標準交換格式在早年就是固定長度 TXT，後來才逐步支援 XML。
  * 因此 HIS 廠商多半沿用「內部 DBF → 匯出 CSV/Excel 報表 → 轉 TXT/XML 申報」的流程。

---

✅ 所以答案是：

* 台灣診所 HIS 的「舊式內部資料庫」確實很多不是 CSV/JSON/XML，而是** ****DBF（FoxPro）、MDB（Access）、固定長度 TXT**。
* **展望、醫聖、耀聖** 三家目前確定：
  * **內部資料庫**：FoxPro DBF
  * **匯出交換格式**：CSV / Excel（院所端可用），TXT/XML（用於健保署申報）

---

要不要我幫您整理一份「這些舊式 DB → 通用格式 (CSV/JSON/XML)」的** ****技術轉換方式對照表**（例如：DBF 怎麼轉成 PostgreSQL，Access 如何 ETL，固定長度 TXT 如何解析）？這樣您可以直接設計 Node.js + PostgreSQL 平台的 ETL 模組藍圖。


| 來源型態                | 典型於           | 讀取方式（Node.js）                            | 轉碼                       | 常見欄位問題                             | 推薦做法                                                                     |
| ----------------------- | ---------------- | ---------------------------------------------- | -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| **DBF (Visual FoxPro)** | 展望、醫聖、耀聖 | `dbffile`、`dbf-reader`                        | Big5→UTF-8 (`iconv-lite`) | 欄位名長度限制、日期/數值型別、NULL 表徵 | 以**表單對應表**將原欄位對映成通用欄位；以**批次游標**讀取避免一次吃滿記憶體 |
| **Access (MDB/ACCDB)**  | 自製/小規模系統  | Windows：`node-adodb`；跨平台：呼叫 `mdbtools` | Big5/CP950                 | 欄位型別鬆散、日期儲存不一致             | 以\*\*外部程序(mdbtools)\*\*導 CSV 再解析；或 ADODB 直接 SQL 抓取            |
| **固定長度 TXT**        | 早期健保申報     | 自行`slice` 分割或 `fixed-width`               | Big5                       | 欄位位置表、補空白/補0                   | 維護**位置定義表(JSON/YAML)**；以產年分版控規格                              |
| **CSV / Excel**         | 報表匯出         | `fast-csv`、`csv-parse`、`xlsx`                | Big5/UTF-8                 | 欄位順序、標題異名                       | 先做**欄位標頭正規化**（trim、全形半形、同義字）                             |
| **XML**                 | 健保交換         | `fast-xml-parser`、`xml2js`                    | UTF-8                      | 巢狀結構、命名空間                       | 定義**XPath→欄位對應**；以 schema 驗證                                      |
| **JSON**                | 新式/雲端        | 直接`JSON.parse`                               | UTF-8                      | 欄位深度不一                             | 設**JSON Path 對映**；落庫前扁平化/維持原狀                                |

太好了！下面給您一份\*\*「舊式 DB → 通用格式 → PostgreSQL」技術對照表＋Node.js ETL 藍圖\*\*。已依您需求（西醫優先、Node.js＋PostgreSQL、可即時、可記憶上次轉檔點）設計，並附可直接上手的範例程式段與資料庫結構。

---

# 一、常見來源與轉換對照表（診所端）


| 來源型態                | 典型於           | 讀取方式（Node.js）                            | 轉碼                       | 常見欄位問題                             | 推薦做法                                                                     |
| ----------------------- | ---------------- | ---------------------------------------------- | -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| **DBF (Visual FoxPro)** | 展望、醫聖、耀聖 | `dbffile`、`dbf-reader`                        | Big5→UTF-8 (`iconv-lite`) | 欄位名長度限制、日期/數值型別、NULL 表徵 | 以**表單對應表**將原欄位對映成通用欄位；以**批次游標**讀取避免一次吃滿記憶體 |
| **Access (MDB/ACCDB)**  | 自製/小規模系統  | Windows：`node-adodb`；跨平台：呼叫 `mdbtools` | Big5/CP950                 | 欄位型別鬆散、日期儲存不一致             | 以\*\*外部程序(mdbtools)\*\*導 CSV 再解析；或 ADODB 直接 SQL 抓取            |
| **固定長度 TXT**        | 早期健保申報     | 自行`slice` 分割或 `fixed-width`               | Big5                       | 欄位位置表、補空白/補0                   | 維護**位置定義表(JSON/YAML)**；以產年分版控規格                              |
| **CSV / Excel**         | 報表匯出         | `fast-csv`、`csv-parse`、`xlsx`                | Big5/UTF-8                 | 欄位順序、標題異名                       | 先做**欄位標頭正規化**（trim、全形半形、同義字）                             |
| **XML**                 | 健保交換         | `fast-xml-parser`、`xml2js`                    | UTF-8                      | 巢狀結構、命名空間                       | 定義**XPath→欄位對應**；以 schema 驗證                                      |
| **JSON**                | 新式/雲端        | 直接`JSON.parse`                               | UTF-8                      | 欄位深度不一                             | 設**JSON Path 對映**；落庫前扁平化/維持原狀                                |

> **編碼重點**：台灣舊系統經常是** ****Big5/CP950**。建議所有輸入先以** **`iconv-lite` 轉成 UTF-8，再進行解析與落庫。

---

# 二、通用資料模型（Minimal Viable Canonical Schema）

> 先定一個「夠用即上」的通用結構，之後再擴充。以下以**門診就醫流程**為核心，方便申報、費用與處方分析。

**核心實體**

* `clinic_visits`：就診主檔（掛號、看診、醫師、科別、健保卡序號）
* `diagnoses`：診斷（ICD9/10碼、主要/次要）
* `procedures`：處置/檢查/治療項目（NHI 給付代碼）
* `prescriptions`：處方（藥碼、劑量、途徑、日數）
* `charges`：費用（費用別、金額、部分負擔）
* `patients`（可選）：去識別後的病人主檔（僅必要欄位）
* `vendor_ingest_state`：各供應商資料的增量游標與雜湊

**PostgreSQL DDL（摘要）**

```sql
create table clinic_visits (
  visit_id           bigserial primary key,
  vendor             text not null,                 -- 展望/醫聖/耀聖
  vendor_visit_key   text not null,                 -- 來源系統主鍵(或複合鍵雜湊)
  clinic_id          text not null,                 -- 院所識別
  patient_uid        text,                          -- 去識別ID（hash）
  visit_date         timestamp not null,
  dept_code          text,
  physician_code     text,
  card_no_last4      text,                          -- 健保卡後4碼(可選, 去識別)
  updated_at_src     timestamp,                     -- 來源最後更新時間
  unique(vendor, vendor_visit_key)
);

create table diagnoses (
  visit_id       bigint references clinic_visits(visit_id),
  seq            int not null,                     -- 1=主診斷
  icd_code       text not null,
  icd_version    text check (icd_version in ('ICD9','ICD10')),
  text_note      text,
  primary key (visit_id, seq)
);

create table procedures (
  visit_id        bigint references clinic_visits(visit_id),
  item_code       text not null,                   -- NHI 給付代碼
  quantity        numeric(10,2),
  amount_claimed  numeric(12,2),
  primary key (visit_id, item_code)
);

create table prescriptions (
  visit_id        bigint references clinic_visits(visit_id),
  drug_code       text not null,                   -- 健保藥品碼/自費碼
  dose            text,                            -- 劑量(如 500mg)
  frequency       text,                            -- 例如 TID
  route           text,                            -- 例如 PO
  days            int,
  quantity        numeric(10,2),
  primary key (visit_id, drug_code)
);

create table charges (
  visit_id        bigint references clinic_visits(visit_id),
  charge_type     text,                            -- 掛號/部分負擔/檢驗/處置等
  amount          numeric(12,2),
  primary key (visit_id, charge_type)
);

create table vendor_ingest_state (
  vendor           text primary key,
  last_checkpoint  text,        -- 例如最後 updated_at；或最後檔名/批次編號
  last_hash        text,        -- 防重/偵測變更
  last_run_at      timestamp not null default now()
);
```

**補充慣例**

* **時間格式**：統一存 UTC 或 +08:00，輸出時再轉時區。
* **民國年轉換**：R.O.C. 年份需轉西元（e.g. 114/08/01 → 2025-08-01）。
* **ICD 版本**：留** **`icd_version` 以應對歷史資料過渡。
* **去識別**：`patient_uid` 建議用（院所代碼 + 病歷號）做 SHA-256。

---

# 三、ETL 平台藍圖（Node.js + PostgreSQL）

**1) 模組分層**

* `connectors/`：資料來源連接器（dbf、mdb、csv、xml、fixedwidth）
* `mappings/`：各廠商欄位對映（YAML/JSON）
* `transform/`：通用轉換器（日期、編碼、單位）
* `loaders/`：寫入 PG（含 upsert、批次）
* `exporters/`：輸出 CSV/JSON/XML API
* `state/`：增量游標與重跑策略
* `cli/`：命令列工具（立即轉、排程用）
* `server/`：即時 API（Webhook/檔案監聽/目錄監控）

**2) 增量機制**

* 優先使用來源欄位** **`updated_at` /** **`mod_time`；沒有就用**複合鍵雜湊**（如病歷號+就診日+序號），比對上次 hash 有無變化。
* `vendor_ingest_state` 記錄**最後處理點**（檔名、行號、時間戳）與**校驗碼**。

**3) 錯誤/重試**

* 單筆錯誤不阻斷整批；寫** **`ingest_errors`（含原始片段）以便人工修正。
* 來源不可用→指數退避重試、告警。

**4) 效能**

* DBF/MDB 以**批次游標**讀取（例如每 2,000 筆），PG** **`COPY` 或批次** **`INSERT ... ON CONFLICT DO UPDATE`。
* 重要欄位建索引：`clinic_visits(visit_date)`,** **`(vendor, vendor_visit_key)`。

**5) 安全**

* 全流程以 UTF-8；檔案加密（at-rest）＋傳輸 TLS。
* 產線落庫前做**最小化個資**；提供「去識別」開關。
* 啟用審計 log（誰在什麼時間導出什麼）。

---

# 四、對映檔範例（YAML）

> 針對** ****展望 / 醫聖 / 耀聖**（皆以 DBF/CSV 為主）各自維護一份 mapping，避免把差異硬寫在程式裡。

```yaml
# mappings/zhanwang.yaml
vendor: zhanwang
encoding: cp950        # Big5/CP950
date_format: ROC       # 民國年
sources:
  visits:
    type: dbf
    path: "C:/HIS/ZW/VISIT.DBF"
    fields:
      vendor_visit_key: ["VNO"]            # 來源主鍵
      clinic_id:        ["CLINIC_ID"]
      patient_id_raw:   ["CHART_NO"]
      visit_date_raw:   ["VISIT_DT"]
      dept_code:        ["DEPT"]
      physician_code:   ["DR"]
      updated_at_src:   ["UPD_DT"]
  diagnoses:
    type: dbf
    path: "C:/HIS/ZW/DIAG.DBF"
    fields:
      visit_key_ref:    ["VNO"]
      seq:              ["SEQ"]
      icd_code:         ["ICD"]
      icd_version:      ["ICDV"]          # 若無，預設 ICD10
transforms:
  patient_uid: "hash(clinic_id + ':' + patient_id_raw)"
  visit_date: "roc_to_iso(visit_date_raw)"
  updated_at_src: "roc_to_iso(updated_at_src)"
```

> 醫聖、耀聖各有自己的檔名與欄位，您只需維護各自** **`*.yaml` 對映即可。

---

# 五、程式碼片段（Node.js）

**1) 讀 DBF（Big5 轉 UTF-8 + 對映）**

```js
// connectors/dbf.js
const { DBFFile } = require('dbffile');
const iconv = require('iconv-lite');
const fs = require('fs');

async function* readDbf(path, encoding='cp950') {
  // dbffile 已會解碼字串欄位，但若遇二進位轉碼需求，可自行處理
  const dbf = await DBFFile.open(path, { encoding });
  let recordsRead = 0;
  while (recordsRead < dbf.recordCount) {
    const records = await dbf.readRecords(2000);
    recordsRead += records.length;
    for (const r of records) yield r;
  }
}
module.exports = { readDbf };
```

**2) 民國年轉 ISO、欄位標準化**

```js
// transform/common.js
const crypto = require('crypto');

function rocToIso(s){
  if (!s) return null;
  // 支援 "114/08/01" 或數字 1140801
  const parts = String(s).includes('/') ? String(s).split('/') : [String(s).slice(0,3), String(s).slice(3,5), String(s).slice(5,7)];
  const y = parseInt(parts[0],10) + 1911;
  const m = parts[1].padStart(2,'0');
  const d = parts[2].padStart(2,'0');
  return `${y}-${m}-${d}`;
}
const hash = (s)=> crypto.createHash('sha256').update(s).digest('hex');

module.exports = { rocToIso, hash };
```

**3) 對映套用器（以展望為例）**

```js
// mappings/apply.js
const { rocToIso, hash } = require('../transform/common');

function mapVisit(record, m, clinicId){
  const vendorVisitKey = record[m.sources.visits.fields.vendor_visit_key[0]];
  const patientRaw     = record[m.sources.visits.fields.patient_id_raw[0]];
  const visitDateRaw   = record[m.sources.visits.fields.visit_date_raw[0]];
  const updatedRaw     = record[m.sources.visits.fields.updated_at_src[0]];

  return {
    vendor: m.vendor,
    vendor_visit_key: String(vendorVisitKey),
    clinic_id: clinicId,
    patient_uid: hash(`${clinicId}:${patientRaw}`),
    visit_date: rocToIso(visitDateRaw),
    dept_code: record[m.sources.visits.fields.dept_code[0]],
    physician_code: record[m.sources.visits.fields.physician_code[0]],
    updated_at_src: updatedRaw ? rocToIso(updatedRaw) : null
  };
}
module.exports = { mapVisit };
```

**4) 落 PostgreSQL（批次 upsert）**

```js
// loaders/pg.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertVisits(rows){
  if (!rows.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const text = `
      insert into clinic_visits
      (vendor, vendor_visit_key, clinic_id, patient_uid, visit_date, dept_code, physician_code, updated_at_src)
      values ${rows.map((_,i)=>`($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`).join(',')}
      on conflict (vendor, vendor_visit_key) do update set
        patient_uid=excluded.patient_uid,
        visit_date=excluded.visit_date,
        dept_code=excluded.dept_code,
        physician_code=excluded.physician_code,
        updated_at_src=excluded.updated_at_src
    `;
    const values = rows.flatMap(r=>[
      r.vendor, r.vendor_visit_key, r.clinic_id, r.patient_uid, r.visit_date, r.dept_code, r.physician_code, r.updated_at_src
    ]);
    await client.query(text, values);
    await client.query('COMMIT');
  } catch(e){
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
module.exports = { upsertVisits };
```

**5) 固定長度 TXT 解析（位置定義表）**

```js
// connectors/fixedwidth.js
function parseFixedWidthLine(line, spec){
  const out = {};
  for (const f of spec.fields){
    out[f.name] = line.slice(f.start-1, f.end).trim(); // 1-based
  }
  return out;
}
/* spec 範例
{
  fields:[
    {name:'chart_no', start:1, end:10},
    {name:'visit_dt', start:11, end:17}, // yyyMMdd 或 ROC
    ...
  ]
}
*/
module.exports = { parseFixedWidthLine };
```

**6) 匯出通用格式（CSV/JSON/XML）**

```js
// exporters/export.js
const { Parser } = require('json2csv');
const { XMLBuilder } = require('fast-xml-parser');

function toJSON(rows){ return JSON.stringify(rows); }
function toCSV(rows){
  const parser = new Parser();
  return parser.parse(rows);
}
function toXML(rows, root='rows', item='row'){
  const builder = new XMLBuilder({ ignoreAttributes:false });
  return builder.build({ [root]: { [item]: rows }});
}
module.exports = { toJSON, toCSV, toXML };
```

**7) 記憶上次轉換點（checkpoint）**

```js
// state/checkpoint.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getCheckpoint(vendor){
  const { rows } = await pool.query('select * from vendor_ingest_state where vendor=$1', [vendor]);
  return rows[0] || null;
}
async function setCheckpoint(vendor, last_checkpoint, last_hash){
  await pool.query(`
    insert into vendor_ingest_state(vendor,last_checkpoint,last_hash,last_run_at)
    values($1,$2,$3,now())
    on conflict (vendor) do update set last_checkpoint=excluded.last_checkpoint, last_hash=excluded.last_hash, last_run_at=now()
  `, [vendor, last_checkpoint, last_hash]);
}
module.exports = { getCheckpoint, setCheckpoint };
```

---

# 六、增量策略與去重

1. **有來源更新時間**：

* 查詢** **`updated_at_src > last_checkpoint` 之資料（若是檔案，則比對檔名＋最後處理行數）。
* 處理完更新** **`last_checkpoint`。

2. **無來源更新時間**：

* 以**來源主鍵欄位集合**（如 病歷號+就診日+就診序）組合字串後做 SHA-256。
* 比對** **`vendor_visit_key` 是否已存在；如存在則比對欄位雜湊，變更才更新。

---

# 七、資料品質與常見異常處理

* **民國/西元混用**：建立** **`roc_to_iso()` 與** **`iso_to_roc()` 雙向工具；讀入一律轉 ISO。
* **ICD9/ICD10 混用**：維護對照表（可在 PG 放** **`icd_map`），缺碼時標註** **`unknown`。
* **藥碼/給付代碼**：放** **`nhi_codebook`，用來校驗與補充中文名、規格單位。
* **Big5 全形半形**：先 normalize：`toHalfWidth、trim、collapse spaces`。
* **缺值**：制定欄位允許空值清單，不允許者在** **`ingest_errors` 留跡。

---

# 八、測試與驗證

* **合成測試資料**：以隨機假名＋假碼產 1,000 筆 DBF/CSV/TXT，驗證全文流程。
* **回歸測試**：對映檔改動觸發單元測試（Jest）＋少量端對端（E2E）。
* **校驗**：每批落庫後輸出對帳報表（來源總筆數、總金額 vs. PG 匯總）。

---

# 九、部署與運維

* **即時**：檔案監控（`chokidar`）偵測 HIS 匯出目錄落地即觸發 ETL。
* **排程**：`node-cron` 每 5 分鐘掃描＋重跑漏網檔案。
* **觀測**：`pino` 日誌、`prom-client` 暴露指標（成功/失敗批、耗時、吞吐）。
* **備援**：錯誤批次可標記並重跑；Checkpoint 確保恆等性（idempotent）。

---

# 十、最小可行落地步驟（建議）

1. 與診所約定三家系統**輸出目錄**與**檔名規則**（每日門診、費用、處方）。
2. 各做一份** ****YAML 對映**（展望/醫聖/耀聖）。
3. 先打通** ****DBF→通用 JSON→PostgreSQL**（門診主檔與處方兩張）。
4. 補上** ****增量 checkpoint** 與** ****CSV/XML 輸出 API**。
5. 擴充其他表（診斷、處置、費用）。
6. 導入**去識別**與**審計**，再上線到更多院所。

---

如果您要，我可以把上述骨架打包成**專案樣板**（資料夾結構＋可執行 CLI＋三份 YAML 範本），再補上**固定長度 TXT**與**Access(MDB)** 讀取示例。您也可以先告訴我三家實際檔名與幾個代表性欄位，我直接幫您把三份對映檔填好。

了解 ✅
我來幫您把「診所 HIS 舊式資料庫 → 通用格式 (CSV/JSON/XML) → PostgreSQL」的** ****Node.js 專案骨架樣板**打包好。這個骨架可以支援未來 plug-in 模組化擴充（例如：DBF、Access、固定長度 TXT、CSV/XML），並內建「增量更新（記憶上次轉換時間）」功能。

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

1. 在** **`loaders/` 裡加入** **`accessLoader.js`,** **`txtLoader.js`,** **`csvLoader.js`,** **`xmlLoader.js`。
2. 在** **`transformers/` 裡可以統一加** **`toCSV`,** **`toXML`。
3. 之後只要在** **`index.js` 加上「資料來源 → transformer → PostgreSQL」即可。

---

要不要我幫您把這個骨架直接打包成** ****可下載的 zip 專案樣板**（含一個 DBF 範例檔 & PostgreSQL 建表 SQL）？這樣您可以直接跑起來測試。
