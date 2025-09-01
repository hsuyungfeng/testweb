const { Pool } = require("pg");
const config = require("../config");
const logger = require("../utils/logger");

const pool = new Pool(config.postgres);

pool.on('error', (err, client) => {
  logger.error(`Unexpected error on idle client: ${err.message}`);
  process.exit(-1);
});

async function getPatientsMap() {
  const client = await pool.connect();
  try {
    logger.log("Fetching existing patients from database...");
    const res = await client.query('SELECT patient_id, id_card_number FROM patients');
    const patientMap = new Map();
    for (const row of res.rows) {
      patientMap.set(row.id_card_number, row.patient_id);
    }
    logger.log(`Loaded ${patientMap.size} patients into memory map.`);
    return patientMap;
  } catch (err) {
    logger.error(`Error fetching patients: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function insertPatients(patients) {
  if (!patients || patients.length === 0) {
    logger.log("No new patient records to insert.");
    return;
  }
  const client = await pool.connect();
  try {
    const values = [];
    const queryParams = [];
    let paramIndex = 1;
    for (const p of patients) {
      if (p.id_card_number && p.name && p.birth_date) {
        queryParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        values.push(p.id_card_number, p.name, p.birth_date, p.gender || null);
      }
    }
    if (queryParams.length === 0) {
      logger.log("No valid patient records to insert after filtering.");
      return;
    }
    const insertQuery = `
      INSERT INTO patients (id_card_number, name, birth_date, gender)
      VALUES ${queryParams.join(', ')}
      ON CONFLICT (id_card_number) DO NOTHING;
    `;
    logger.log(`Inserting or updating ${queryParams.length} patient records...`);
    await client.query(insertQuery, values);
    logger.log("Successfully inserted/updated patient records.");
  } catch (err) {
    logger.error(`Error during patient database insertion: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function insertVisits(visits) {
  if (!visits || visits.length === 0) {
    logger.log("No new visit records to insert.");
    return new Map();
  }
  const client = await pool.connect();
  try {
    const values = [];
    const queryParams = [];
    let paramIndex = 1;
    for (const v of visits) {
      if (v.patient_id && v.visit_date) {
        queryParams.push(`($${paramIndex++}, $${paramIndex++})`);
        values.push(v.patient_id, v.visit_date);
      }
    }
    if (queryParams.length === 0) {
      logger.log("No valid visit records to insert after filtering.");
      return new Map();
    }
    const insertQuery = `
      INSERT INTO visits (patient_id, visit_date)
      VALUES ${queryParams.join(', ')}
      ON CONFLICT (patient_id, visit_date) DO UPDATE SET visit_date = EXCLUDED.visit_date
      RETURNING visit_id, patient_id, visit_date;
    `;
    logger.log(`Inserting or updating ${visits.length} visit records...`);
    const res = await client.query(insertQuery, values);
    logger.log(`Successfully inserted/updated ${res.rowCount} visit records.`);
    const visitMap = new Map();
    for (const row of res.rows) {
        const key = `${row.patient_id}-${row.visit_date.toISOString().split('T')[0]}`;
        visitMap.set(key, row.visit_id);
    }
    return visitMap;
  } catch (err) {
    logger.error(`Error during visit database insertion: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}

async function insertDiagnoses(diagnoses) {
    if (!diagnoses || diagnoses.length === 0) {
        logger.log("No new diagnosis records to insert.");
        return;
    }
    const client = await pool.connect();
    try {
        const values = [];
        const queryParams = [];
        let paramIndex = 1;
        for (const d of diagnoses) {
            if (d.visit_id && d.icd10_code && d.diagnosis_description) {
                queryParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                values.push(d.visit_id, d.icd10_code, d.diagnosis_description);
            }
        }
        if (queryParams.length === 0) {
            logger.log("No valid diagnosis records to insert after filtering.");
            return;
        }
        const insertQuery = `
            INSERT INTO diagnoses (visit_id, icd10_code, diagnosis_description)
            VALUES ${queryParams.join(', ')}
            ON CONFLICT DO NOTHING;
        `;
        logger.log(`Inserting ${queryParams.length} diagnosis records...`);
        await client.query(insertQuery, values);
        logger.log("Successfully inserted diagnosis records.");
    } catch (err) {
        logger.error(`Error during diagnosis database insertion: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

async function insertPrescriptions(prescriptions) {
    if (!prescriptions || prescriptions.length === 0) {
        logger.log("No new prescription records to insert.");
        return;
    }
    const client = await pool.connect();
    try {
        const values = [];
        const queryParams = [];
        let paramIndex = 1;
        for (const p of prescriptions) {
            if (p.visit_id && p.medication_name && p.total_quantity !== null && p.total_quantity !== undefined) {
                queryParams.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                values.push(p.visit_id, p.medication_name, p.dosage, p.frequency, p.days, p.total_quantity);
            }
        }
        if (queryParams.length === 0) {
            logger.log("No valid prescription records to insert after filtering.");
            return;
        }
        const insertQuery = `
            INSERT INTO prescriptions (visit_id, medication_name, dosage, frequency, days, total_quantity)
            VALUES ${queryParams.join(', ')}
            ON CONFLICT DO NOTHING;
        `;
        logger.log(`Inserting ${queryParams.length} prescription records...`);
        await client.query(insertQuery, values);
        logger.log("Successfully inserted prescription records.");
    } catch (err) {
        logger.error(`Error during prescription database insertion: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { pool, getPatientsMap, insertPatients, insertVisits, insertDiagnoses, insertPrescriptions };