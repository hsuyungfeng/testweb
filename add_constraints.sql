-- 为visits表添加唯一约束，防止重复的就诊记录
ALTER TABLE visits ADD CONSTRAINT unique_patient_visit UNIQUE (patient_id, visit_date);