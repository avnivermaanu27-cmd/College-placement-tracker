const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createApplication,
  listApplications,
  updateApplication
} = require('../controllers/applicationController');

const router = express.Router();

router.use(authenticateToken);
router.get('/', authorizeRoles('admin', 'student', 'company'), asyncHandler(listApplications));
router.post('/', authorizeRoles('student'), asyncHandler(createApplication));
router.put('/:id', authorizeRoles('admin', 'company'), asyncHandler(updateApplication));

module.exports = router;
