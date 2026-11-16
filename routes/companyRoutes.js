const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  updateCompany
} = require('../controllers/companyController');

const router = express.Router();

router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'student', 'company'),
  asyncHandler(listCompanies)
);
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'student', 'company'),
  asyncHandler(getCompany)
);
router.post('/', authenticateToken, authorizeRoles('admin'), asyncHandler(createCompany));
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'company'),
  asyncHandler(updateCompany)
);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(deleteCompany));

module.exports = router;
