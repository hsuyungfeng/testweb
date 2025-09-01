-- 授予表权限
GRANT SELECT, INSERT, UPDATE ON patients TO clinic_user;
GRANT SELECT, INSERT, UPDATE ON visits TO clinic_user;
GRANT SELECT, INSERT, UPDATE ON diagnoses TO clinic_user;
GRANT SELECT, INSERT, UPDATE ON prescriptions TO clinic_user;

-- 授予序列使用权限（用于SERIAL主键）
GRANT USAGE, SELECT ON SEQUENCE patients_patient_id_seq TO clinic_user;
GRANT USAGE, SELECT ON SEQUENCE visits_visit_id_seq TO clinic_user;
GRANT USAGE, SELECT ON SEQUENCE diagnoses_diagnosis_id_seq TO clinic_user;
GRANT USAGE, SELECT ON SEQUENCE prescriptions_prescription_id_seq TO clinic_user;