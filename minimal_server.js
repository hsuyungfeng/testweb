const express = require('express');
const app = express();
const port = 3008;

app.get('/', (req, res) => {
  res.send('Minimal server is working!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Minimal server running at http://0.0.0.0:${port}`);
  console.log('Process ID:', process.pid);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});