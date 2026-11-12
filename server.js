require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/db');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'College Placement Tracker API is running.' });
});

async function startServer() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to MySQL. Check your .env settings and database.', error);
    process.exitCode = 1;
  }
}

startServer();