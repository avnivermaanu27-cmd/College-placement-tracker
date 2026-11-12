const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  createStudent,
  deleteStudent,
  getMyStudentProfile,
  getStudent,
  listStudents,
  updateMyStudentProfile,
  updateStudent
} = require('../controllers/studentController');

const router = express.Router();

router.get('/me', authenticateToken, authorizeRoles('student'), asyncHandler(getMyStudentProfile));
router.put('/me', authenticateToken, authorizeRoles('student'), asyncHandler(updateMyStudentProfile));
router.get('/', authenticateToken, authorizeRoles('admin'), asyncHandler(listStudents));
router.post('/', authenticateToken, authorizeRoles('admin'), asyncHandler(createStudent));
router.get('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(getStudent));
router.put('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(updateStudent));
router.delete('/:id', authenticateToken, authorizeRoles('admin'), asyncHandler(deleteStudent));

module.exports = router;
