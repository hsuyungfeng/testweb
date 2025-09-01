# 资料对应表 (Data Mapping)

本文件详细记录了原始资料来源 `TOTFA.xml` 中的标签，如何对应到 PostgreSQL 资料库中的各个资料表栏位。

---

### 1. `patients` (病患基本资料表)

| 资料库栏位 (PostgreSQL Column) | XML 标签 (Tag) | 说明 (Description) |
| ------------------------------ | -------------- | ------------------ |
| `id_card_number`               | `<d3>`         | 身分证统一编号     |
| `name`                         | `<d49>`        | 病患姓名           |
| `birth_date`                   | `<d11>`        | 出生年月日         |
| `gender`                       | (无)           | 性别 (目前无对应)  |

---

### 2. `visits` (就诊纪录表)

| 资料库栏位 (PostgreSQL Column) | XML 标签 (Tag) | 说明 (Description) |
| ------------------------------ | -------------- | ------------------ |
| `visit_id`                     | (自动生成)     | 就诊唯一识别码     |
| `patient_id`                   | (关联 `d3`)    | 关联到病患ID       |
| `visit_date`                   | `<d9>`         | 就医日期           |
| `chief_complaint`              | (无)           | 主诉 (目前无对应)  |
| `doctor_notes`                 | (无)           | 医师注记 (目前无对应) |

---

### 3. `diagnoses` (诊断纪录表)

| 资料库栏位 (PostgreSQL Column) | XML 标签 (Tag) | 说明 (Description) |
| ------------------------------ | -------------- | ------------------ |
| `diagnosis_id`                 | (自动生成)     | 诊断唯一识别码     |
| `visit_id`                     | (关联 `ddata`) | 关联到就诊ID       |
| `icd10_code`                   | `<d19>` - `<d22>` | 国际疾病分类码     |
| `diagnosis_description`        | (固定为 `N/A`) | 诊断描述 (目前无对应) |

---

### 4. `prescriptions` (处方纪录表)

| 资料库栏位 (PostgreSQL Column) | XML 标签 (Tag) | 说明 (Description) |
| ------------------------------ | -------------- | ------------------ |
| `prescription_id`              | (自动生成)     | 处方唯一识别码     |
| `visit_id`                     | (关联 `ddata`) | 关联到就诊ID       |
| `medication_name`              | `<p4>`         | 药品(项目)代号     |
| `dosage`                       | `<p5>`         | 每次剂量           |
| `frequency`                    | `<p7>`         | 使用频率           |
| `days`                         | `<p10>`        | 给药日数           |
| `total_quantity`               | `<p10>`        | 总量 (暂时使用天数) |
