const fs = require("fs-extra");
const config = require("../config");
const logger = require("../utils/logger");

function getState() {
  try {
    if (!fs.existsSync(config.stateFile)) {
      logger.log("State file not found, starting from scratch.");
      return {};
    }
    return fs.readJsonSync(config.stateFile);
  } catch (err) {
    logger.error(`Error reading state file: ${err.message}`);
    return {}; // Return empty state on error
  }
}

function setState(newState) {
  try {
    fs.writeJsonSync(config.stateFile, newState, { spaces: 2 });
  } catch (err) {
    logger.error(`Error writing state file: ${err.message}`);
  }
}

module.exports = { getState, setState };
