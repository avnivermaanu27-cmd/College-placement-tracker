const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test('authenticateToken rejects requests without a Bearer token', () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('authenticateToken adds the verified user to the request', () => {
  const token = jwt.sign(
    { role: 'student' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', subject: '42' }
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createResponse();
  let nextCalled = false;

  authenticateToken(req, res, () => {
    nextCalled = true;
  });

  assert.deepEqual(req.user, { userId: 42, role: 'student' });
  assert.equal(nextCalled, true);
});

test('authorizeRoles blocks users with a different role', () => {
  const req = { user: { userId: 42, role: 'student' } };
  const res = createResponse();
  let nextCalled = false;

  authorizeRoles('admin')(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});
