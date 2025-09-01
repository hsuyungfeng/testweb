const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { loadXML } = require('./loaders/xmlLoader');
const {
  pool,
  insertPatients,
  getPatientsMap,
  insertVisits,
  insertDiagnoses,
  insertPrescriptions
} = require('./services/postgresService');

function formatTWDate(twDate) {
  if (!twDate) return null;
  const dateStr = String(twDate);
  let yearStr, month, day;

  if (dateStr.length === 7) {
    yearStr = dateStr.substring(0, 3);
    month = dateStr.substring(3, 5);
    day = dateStr.substring(5, 7);
  } else if (dateStr.length === 6) {
    yearStr = dateStr.substring(0, 2);
    month = dateStr.substring(2, 4);
    day = dateStr.substring(4, 6);
  } else {
    return null;
  }

  const year = parseInt(yearStr, 10) + 1911;
  if (isNaN(year) || parseInt(month, 10) > 12 || parseInt(day, 10) > 31) {
    return null;
  }
  return `${year}-${month}-${day}`;
}

(async () => {
  logger.log("🚀 Clinic Data ETL Process Started");

  try {
    // --- 1. Load and Parse XML Data ---
    const inputFile = path.join(__dirname, '..', 'data', 'input', 'TOTFA.xml');
    const jsonData = loadXML(inputFile);
    if (!jsonData || !jsonData.outpatient || !jsonData.outpatient.ddata) {
      throw new Error("XML data is missing the required <outpatient> or <ddata> structure.");
    }
    const visitData = Array.isArray(jsonData.outpatient.ddata) ? jsonData.outpatient.ddata : [jsonData.outpatient.ddata];

    // --- 2. Process and Insert Unique Patients ---
    const patientsToInsert = Array.from(visitData.reduce((map, visit) => {
      const dbody = visit.dbody;
      if (dbody && dbody.d3 && !map.has(dbody.d3)) {
        const birthDate = formatTWDate(dbody.d11);
        if (birthDate) {
          map.set(dbody.d3, { id_card_number: dbody.d3, name: dbody.d49 || 'N/A', birth_date: birthDate, gender: null });
        }
      }
      return map;
    }, new Map()).values());
    logger.log(`Found ${patientsToInsert.length} unique patients to process.`);
    await insertPatients(patientsToInsert);

    // --- 3. Process and Insert Visits ---
    const dbPatientMap = await getPatientsMap();
    const visitsToInsert = visitData.map(visit => {
      const dbody = visit.dbody;
      const patientId = dbPatientMap.get(dbody.d3);
      const visitDate = formatTWDate(dbody.d9);
      return (patientId && visitDate) ? { patient_id: patientId, visit_date: visitDate } : null;
    }).filter(v => v);
    logger.log(`Found ${visitsToInsert.length} visits to process.`);
    const visitMap = await insertVisits(visitsToInsert);

    // --- 4. Process and Insert Diagnoses and Prescriptions ---
    const allDiagnoses = [];
    const allPrescriptions = [];
    for (const visit of visitData) {
      const dbody = visit.dbody;
      if (!dbody) continue;

      const patientId = dbPatientMap.get(dbody.d3);
      const visitDate = formatTWDate(dbody.d9);
      const visitMapKey = `${patientId}-${visitDate}`;
      const visitId = visitMap.get(visitMapKey);

      if (!visitId) continue;

      // Extract Diagnoses (d19 to d22)
      for (let i = 19; i <= 22; i++) {
        const diagCode = dbody[`d${i}`];
        if (diagCode) {
          allDiagnoses.push({ visit_id: visitId, icd10_code: diagCode, diagnosis_description: 'N/A' });
        }
      }

      // Extract Prescriptions (pdata)
      if (dbody.pdata) {
        const prescriptions = Array.isArray(dbody.pdata) ? dbody.pdata : [dbody.pdata];
        for (const p of prescriptions) {
          if (p.p4) { // p4 is medication code
            allPrescriptions.push({
              visit_id: visitId,
              medication_name: p.p4,
              dosage: p.p5,
              frequency: p.p7,
              days: p.p10 ? parseInt(p.p10, 10) : null,
              total_quantity: p.p10 ? parseFloat(p.p10) : null,
            });
          }
        }
      }
    }

    logger.log(`Found ${allDiagnoses.length} diagnosis records to process.`);
    await insertDiagnoses(allDiagnoses);

    logger.log(`Found ${allPrescriptions.length} prescription records to process.`);
    await insertPrescriptions(allPrescriptions);

  } catch (err) {
    logger.error(`ETL process failed: ${err.message}`);
  } finally {
    await pool.end();
    logger.log("Database pool closed.");
  }

  logger.log("✅ Clinic Data ETL Process Finished");
})();
