const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'security-test-secret-that-is-at-least-32-characters';

const app = require('../server');
const { pool } = require('../config/db');
const { isValidCgpa, isValidSafeText, isValidSkills } = require('../utils/validation');

let server;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const headers = {};
    if (data !== null) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method,
      path,
      headers
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let responseBody;
        try {
          responseBody = JSON.parse(text);
        } catch {
          responseBody = text;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: responseBody });
      });
    });
    req.on('error', reject);
    if (data !== null) {
      req.write(data);
    }
    req.end();
  });
}

function createToken(role = 'admin') {
  return jwt.sign({ role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: '7',
    expiresIn: '1h'
  });
}

test('safe-text validation rejects injection, XSS, controls, empty, and oversized input', () => {
  const attackStrings = [
    "'; DROP TABLE students;--",
    "' OR '1'='1",
    '<script>alert(1)</script>',
    '`quoted`',
    'semi;colon',
    'back\\slash',
    'comma,value',
    'comment/*marker',
    'line\nbreak',
    ''
  ];

  for (const value of attackStrings) {
    assert.equal(isValidSafeText(value), false, JSON.stringify(value));
  }
  assert.equal(isValidSafeText('x'.repeat(50)), true);
  assert.equal(isValidSafeText('x'.repeat(51)), false);
  assert.equal(isValidSkills('x'.repeat(255)), true);
  assert.equal(isValidSkills('x'.repeat(256)), false);
  assert.equal(isValidSkills('JavaScript,SQL'), false);
  assert.equal(isValidCgpa(NaN), false);
  assert.equal(isValidCgpa('8'), false);
  assert.equal(isValidCgpa(0), true);
  assert.equal(isValidCgpa(10), true);
  assert.equal(isValidCgpa(10.01), false);
});

test('registration and company writes reject unsafe names, skills, and locations without database access', async () => {
  const originalExecute = pool.execute;
  let databaseCalls = 0;
  pool.execute = async () => {
    databaseCalls += 1;
    throw new Error('Unexpected database access during validation test.');
  };

  try {
    const registration = await request('POST', '/api/students/register', {
      name: "'; DROP TABLE students;--",
      email: 'student@example.com',
      branch: 'Computer Science',
      skills: 'JavaScript',
      password: 'valid-password',
      cgpa: 8
    });
    assert.equal(registration.status, 400);

    const badSkills = await request('POST', '/api/students/register', {
      name: 'Student Name',
      email: 'student@example.com',
      branch: 'Computer Science',
      skills: '<script>alert(1)</script>',
      password: 'valid-password',
      cgpa: 8
    });
    assert.equal(badSkills.status, 400);

    const adminToken = createToken('admin');
    const badCompanyName = await request('POST', '/api/companies', {
      name: "' OR '1'='1",
      location: 'Toronto',
      package: 10
    }, adminToken);
    assert.equal(badCompanyName.status, 400);

    const badLocation = await request('POST', '/api/companies', {
      name: 'Safe Company',
      location: '<script>alert(1)</script>',
      package: 10
    }, adminToken);
    assert.equal(badLocation.status, 400);
    assert.equal(databaseCalls, 0);
  } finally {
    pool.execute = originalExecute;
  }
});

test('login query binds email and locks the client after five failed attempts', async () => {
  const originalExecute = pool.execute;
  const queries = [];
  pool.execute = async (query, values) => {
    queries.push({ query, values });
    return [[]];
  };

  try {
    const injectedEmail = "x'OR'1'='1@example.com";
    const first = await request('POST', '/api/login', {
      email: injectedEmail,
      password: 'wrong-password'
    });
    assert.equal(first.status, 401);
    assert.match(queries[0].query, /WHERE email = \? LIMIT 1/);
    assert.deepEqual(queries[0].values, [injectedEmail.toLowerCase()]);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request('POST', '/api/login', {
        email: 'user@example.com',
        password: 'wrong-password'
      });
      assert.equal(response.status, 401);
    }

    const fifthAttempt = await request('POST', '/api/login', {
      email: 'user@example.com',
      password: 'wrong-password'
    });
    assert.equal(fifthAttempt.status, 429);

    const queryCount = queries.length;
    const lockedAttempt = await request('POST', '/api/login', {
      email: 'user@example.com',
      password: 'wrong-password'
    });
    assert.equal(lockedAttempt.status, 429);
    assert.equal(queries.length, queryCount);
  } finally {
    pool.execute = originalExecute;
  }
});

test('API endpoints require authentication and role checks remain enforced', async () => {
  const protectedRequests = [
    ['GET', '/api/health'],
    ['GET', '/api/auth/me'],
    ['GET', '/api/auth/admin-check'],
    ['GET', '/api/students'],
    ['GET', '/api/companies'],
    ['GET', '/api/drives'],
    ['GET', '/api/applications'],
    ['GET', '/api/reports'],
    ['GET', '/api/recommendations/1']
  ];

  for (const [method, path] of protectedRequests) {
    const response = await request(method, path);
    assert.equal(response.status, 401, path);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
  }

  const forbiddenWrite = await request(
    'POST',
    '/api/companies',
    { name: 'Company', location: 'Toronto', package: 10 },
    createToken('student')
  );
  assert.equal(forbiddenWrite.status, 403);
});

test('JSON body size is capped', async () => {
  const body = `{"value":"${'x'.repeat(102400)}"}`;
  const response = await new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method: 'POST',
      path: '/api/login',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end(body);
  });

  assert.equal(response, 413);
});
