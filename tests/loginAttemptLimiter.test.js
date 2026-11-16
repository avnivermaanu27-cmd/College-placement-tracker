const test = require('node:test');
const assert = require('node:assert/strict');
const {
  clearLoginFailures,
  isLoginLocked,
  recordLoginFailure
} = require('../middleware/loginAttemptLimiter');

test('login limiter locks after five failures and clearing failures resets the key', () => {
  const key = `unit-test-${process.pid}`;
  const now = 1000;
  clearLoginFailures(key);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.equal(recordLoginFailure(key, now), false);
  }
  assert.equal(recordLoginFailure(key, now), true);
  assert.equal(isLoginLocked(key, now + 1), true);

  clearLoginFailures(key);
  assert.equal(isLoginLocked(key, now + 1), false);
  assert.equal(recordLoginFailure(key, now + 1), false);
  clearLoginFailures(key);
});
