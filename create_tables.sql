-- 1. 病患基本资料 (patients)
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

-- 2. 就诊纪录 (visits)
CREATE TABLE visits (
    visit_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id),
    visit_date DATE NOT NULL,
    chief_complaint TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 診斷紀錄 (diagnoses)
CREATE TABLE diagnoses (
    diagnosis_id SERIAL PRIMARY KEY,
    visit_id INT NOT NULL REFERENCES visits(visit_id),
    icd10_code VARCHAR(20),
    diagnosis_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 處方與藥物紀錄 (prescriptions)
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