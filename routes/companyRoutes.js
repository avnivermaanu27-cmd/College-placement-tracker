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

router.get('/', asyncHandler(listCompanies));
router.get('/:id', asyncHandler(getCompany));
router.post('/', authenticateToken, authorizeRoles('admin'), asyncHandler(createCompany));
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'company'),
  asyncHandler(updateCompany)
);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(deleteCompany));

module.exports = router;
