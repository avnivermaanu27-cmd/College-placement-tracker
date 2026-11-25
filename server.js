require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDatabase } = require('./config/db');
const { validateJwtSecret } = require('./config/jwt');
const securityHeaders = require('./middleware/securityHeaders');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const companyRoutes = require('./routes/companyRoutes');
const driveRoutes = require('./routes/driveRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(securityHeaders);
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/drives', driveRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recommendations', recommendationRoutes);

const { authenticateToken, authorizeRoles } = require('./middleware/authMiddleware');
app.get('/api/health', authenticateToken, authorizeRoles('admin', 'student', 'company'), (req, res) => {
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
    message: error.message || 'Internal server error.'
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

if (require.main === module) {
  startServer();
}

module.exports = app;