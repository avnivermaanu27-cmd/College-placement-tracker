const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

const validRoles = new Set(['student', 'admin', 'company']);

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'A valid Bearer token is required.' });
  }

  try {
    const payload = jwt.verify(match[1], getJwtSecret(), {
      algorithms: ['HS256']
    });

    if (
      typeof payload === 'string' ||
      !/^[1-9]\d*$/.test(payload.sub || '') ||
      !validRoles.has(payload.role)
    ) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    req.user = {
      userId: Number(payload.sub),
      role: payload.role
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication is required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource.' });
    }

    return next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
