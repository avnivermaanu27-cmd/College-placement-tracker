const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createDrive,
  deleteDrive,
  getDrive,
  listDrives,
  updateDrive
} = require('../controllers/driveController');

const router = express.Router();

router.get('/', asyncHandler(listDrives));
router.get('/:id', asyncHandler(getDrive));
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'company'),
  asyncHandler(createDrive)
);
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'company'),
  asyncHandler(updateDrive)
);
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'company'),
  asyncHandler(deleteDrive)
);

module.exports = router;
