const path = require('path');
const fs = require('fs-extra');
const config = require('./config');
const logger = require('./utils/logger');
const { loadXML } = require('./loaders/xmlLoader');

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
  logger.log("🚀 Clinic Data ETL Process Started (No Database)");

  try {
    // --- 1. Load and Parse XML Data ---
    const inputFile = path.join(__dirname, '..', 'data', 'input', 'TOTFA.xml');
    const jsonData = loadXML(inputFile);
    if (!jsonData || !jsonData.outpatient || !jsonData.outpatient.ddata) {
      throw new Error("XML data is missing the required <outpatient> or <ddata> structure.");
    }
    const visitData = Array.isArray(jsonData.outpatient.ddata) ? jsonData.outpatient.ddata : [jsonData.outpatient.ddata];

    // --- 2. Process Patients ---
    const patients = Array.from(visitData.reduce((map, visit) => {
      const dbody = visit.dbody;
      if (dbody && dbody.d3 && !map.has(dbody.d3)) {
        const birthDate = formatTWDate(dbody.d11);
        if (birthDate) {
          map.set(dbody.d3, { 
            id_card_number: dbody.d3, 
            name: dbody.d49 || 'N/A', 
            birth_date: birthDate, 
            gender: null 
          });
        }
      }
      return map;
    }, new Map()).values());
    
    logger.log(`Found ${patients.length} unique patients.`);

    // --- 3. Process Visits ---
    const visits = visitData.map(visit => {
      const dbody = visit.dbody;
      const visitDate = formatTWDate(dbody.d9);
      return (visitDate) ? { 
        patient_id: dbody.d3, 
        visit_date: visitDate 
      } : null;
    }).filter(v => v);
    
    logger.log(`Found ${visits.length} visits.`);

    // --- 4. Process Diagnoses and Prescriptions ---
    const diagnoses = [];
    const prescriptions = [];
    
    for (const visit of visitData) {
      const dbody = visit.dbody;
      if (!dbody) continue;

      const visitDate = formatTWDate(dbody.d9);
      if (!visitDate) continue;

      // Extract Diagnoses (d19 to d22)
      for (let i = 19; i <= 22; i++) {
        const diagCode = dbody[`d${i}`];
        if (diagCode) {
          diagnoses.push({ 
            patient_id: dbody.d3, 
            visit_date: visitDate, 
            icd10_code: diagCode, 
            diagnosis_description: 'N/A' 
          });
        }
      }

      // Extract Prescriptions (pdata)
      if (dbody.pdata) {
        const meds = Array.isArray(dbody.pdata) ? dbody.pdata : [dbody.pdata];
        for (const p of meds) {
          if (p.p4) {
            prescriptions.push({
              patient_id: dbody.d3,
              visit_date: visitDate,
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

    logger.log(`Found ${diagnoses.length} diagnosis records.`);
    logger.log(`Found ${prescriptions.length} prescription records.`);

    // --- 5. Save to JSON files ---
    const outputDir = path.join(__dirname, '..', 'data', 'output');
    await fs.ensureDir(outputDir);
    
    await fs.writeJson(path.join(outputDir, 'patients.json'), patients, { spaces: 2 });
    await fs.writeJson(path.join(outputDir, 'visits.json'), visits, { spaces: 2 });
    await fs.writeJson(path.join(outputDir, 'diagnoses.json'), diagnoses, { spaces: 2 });
    await fs.writeJson(path.join(outputDir, 'prescriptions.json'), prescriptions, { spaces: 2 });
    
    logger.log("✅ All data saved to JSON files in data/output/");

  } catch (err) {
    logger.error(`ETL process failed: ${err.message}`);
  }

  logger.log("✅ Clinic Data ETL Process Finished");
})();