const express = require('express');
const app = express();
const port = 3006;

app.get('/', (req, res) => {
  res.send('Test server is working!');
});

app.listen(port, () => {
  console.log(`Test server running at http://localhost:${port}`);
});