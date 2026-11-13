const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { getReports } = require('../controllers/reportController');

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles('admin'), asyncHandler(getReports));

module.exports = router;
