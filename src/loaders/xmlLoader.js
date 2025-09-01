const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');
const iconv = require('iconv-lite');
const logger = require('../utils/logger');

// XML parser configuration
const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  allowBooleanAttributes: true,
  // Do not parse tag values to specific types, read everything as string
  parseTagValue: false 
};

const parser = new XMLParser(options);

function loadXML(filePath) {
  try {
    logger.log(`Reading XML file: ${filePath}`);
    // Read file as a buffer and decode from Big5
    const fileBuffer = fs.readFileSync(filePath);
    const xmlDataStr = iconv.decode(fileBuffer, 'Big5');

    const jsonObj = parser.parse(xmlDataStr);
    logger.log("Successfully parsed XML file.");
    return jsonObj;

  } catch (err) {
    logger.error(`Error loading or parsing XML file ${filePath}: ${err.message}`);
    return null; // Return null on error
  }
}

module.exports = { loadXML };
