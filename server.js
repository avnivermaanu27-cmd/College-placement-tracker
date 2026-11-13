require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/db');
const { validateJwtSecret } = require('./config/jwt');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driveRoutes = require('./routes/driveRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/applications', applicationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'College Placement Tracker API is running.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || error.status || 500;
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    message: statusCode < 500 ? error.message : 'Internal server error.'
  });
});

async function startServer() {
  try {
    validateJwtSecret();
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