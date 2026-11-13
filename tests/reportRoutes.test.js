const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';

const reportRoutes = require('../routes/reportRoutes');

test('GET /api/reports returns 403 to a student', async t => {
  const app = express();
  app.use('/api/reports', reportRoutes);
  const server = app.listen(0, '127.0.0.1');

  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const token = jwt.sign(
    { role: 'student' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', subject: '2' }
  );
  const response = await new Promise((resolve, reject) => {
    const request = http.get({
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/reports',
      headers: { authorization: `Bearer ${token}` }
    }, resolve);
    request.once('error', reject);
  });

  response.resume();
  assert.equal(response.statusCode, 403);
});
