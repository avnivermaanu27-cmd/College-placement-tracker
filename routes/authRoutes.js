const express = require('express');
const {
  getCurrentUser,
  login,
  registerStudent
} = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/students/register', registerStudent);
router.post('/login', login);
router.get('/auth/me', authenticateToken, getCurrentUser);
router.get(
  '/auth/admin-check',
  authenticateToken,
  authorizeRoles('admin'),
  (req, res) => res.json({ message: 'Admin authorization successful.' })
);

module.exports = router;
