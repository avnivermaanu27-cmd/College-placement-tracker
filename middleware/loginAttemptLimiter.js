const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 10000;
const attemptsByKey = new Map();

function isLoginLocked(key, now = Date.now()) {
  const record = attemptsByKey.get(key);
  if (!record) {
    return false;
  }

  if (record.lockedUntil > now) {
    return true;
  }

  if (record.lockedUntil || now - record.windowStartedAt >= ATTEMPT_WINDOW_MS) {
    attemptsByKey.delete(key);
  }
  return false;
}

function recordLoginFailure(key, now = Date.now()) {
  let record = attemptsByKey.get(key);
  if (!record || now - record.windowStartedAt >= ATTEMPT_WINDOW_MS) {
    record = { failedAttempts: 0, windowStartedAt: now, lockedUntil: 0 };
  }

  record.failedAttempts += 1;
  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
  }

  if (!attemptsByKey.has(key) && attemptsByKey.size >= MAX_TRACKED_KEYS) {
    attemptsByKey.delete(attemptsByKey.keys().next().value);
  }
  attemptsByKey.set(key, record);
  return Boolean(record.lockedUntil);
}

function clearLoginFailures(key) {
  attemptsByKey.delete(key);
}

module.exports = { clearLoginFailures, isLoginLocked, recordLoginFailure };
