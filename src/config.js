require('dotenv').config();
const path = require('path');

module.exports = {
  postgres: {
    user: process.env.PG_USER || 'clinic_user',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'clinic_data',
    password: process.env.PG_PASSWORD || 'password123',
    port: process.env.PG_PORT || 5432,
  },
  dataPaths: {
    // Note: These paths are relative and might need robust construction in the scripts that use them.
    input: process.env.INPUT_PATH || './data/input/',
    output: process.env.OUTPUT_PATH || './data/output/',
  },
  // Construct a robust path to the state file, relative to the project root
  stateFile: path.join(__dirname, '..', 'data', 'state.json'),
};
