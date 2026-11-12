const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set to a secret with at least 32 characters.');
  }

  return secret;
}

function validateJwtSecret() {
  getJwtSecret();
}

function createAuthToken(user) {
  return jwt.sign(
    { role: user.role },
    getJwtSecret(),
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      subject: String(user.user_id)
    }
  );
}

module.exports = { createAuthToken, getJwtSecret, validateJwtSecret };
