const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { getRecommendations } = require('../controllers/recommendationController');

const router = express.Router();

router.use(authenticateToken);
router.get(
  '/:studentId',
  authorizeRoles('admin', 'student'),
  asyncHandler(getRecommendations)
);

module.exports = router;
