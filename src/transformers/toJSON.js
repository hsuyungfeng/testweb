function toJSON(records) {
  return JSON.stringify(records, null, 2);
}

module.exports = { toJSON };
