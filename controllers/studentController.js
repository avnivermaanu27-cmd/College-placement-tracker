const { pool } = require('../config/db');
const { getObjectBody, getPositiveId, isValidCgpa, isValidSkills } = require('../utils/validation');

const studentFields = `
  student_id AS studentId,
  name,
  email,
  branch,
  cgpa,
  skills,
  is_placed AS isPlaced
`;

async function listStudents(req, res) {
  const [students] = await pool.execute(
    `SELECT ${studentFields} FROM students ORDER BY student_id`
  );
  return res.json({ students });
}

async function getStudent(req, res) {
  const studentId = getPositiveId(req.params.id);
  if (!studentId) {
    return res.status(400).json({ message: 'Student ID must be a positive integer.' });
  }

  const [students] = await pool.execute(
    `SELECT ${studentFields} FROM students WHERE student_id = ? LIMIT 1`,
    [studentId]
  );

  if (students.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }

  return res.json({ student: students[0] });
}

async function getMyStudentProfile(req, res) {
  const [students] = await pool.execute(
    `SELECT ${studentFields} FROM students WHERE user_id = ? LIMIT 1`,
    [req.user.userId]
  );

  if (students.length === 0) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }

  return res.json({ student: students[0] });
}

async function createStudent(req, res) {
  const body = getObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ message: 'A JSON object is required.' });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
  const skills = body.skills === undefined ? '' : body.skills;

  if (Object.keys(body).some(field => !['name', 'email', 'branch', 'cgpa', 'skills'].includes(field))) {
    return res.status(400).json({ message: 'Only name, email, branch, CGPA, and skills can be provided.' });
  }
  if (!name || name.length > 150) {
    return res.status(400).json({ message: 'Name is required and must be 150 characters or fewer.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (!branch || branch.length > 100) {
    return res.status(400).json({ message: 'Branch is required and must be 100 characters or fewer.' });
  }
  if (!isValidCgpa(body.cgpa)) {
    return res.status(400).json({ message: 'CGPA must be a number between 0 and 10.' });
  }
  if (!isValidSkills(skills)) {
    return res.status(400).json({ message: 'Skills must be a comma-separated string of 255 characters or fewer.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO students (name, email, branch, cgpa, skills) VALUES (?, ?, ?, ?, ?)',
      [name, email, branch, body.cgpa, skills.trim()]
    );

    return res.status(201).json({
      message: 'Student profile created successfully.',
      student: {
        studentId: result.insertId,
        name,
        email,
        branch,
        cgpa: body.cgpa,
        skills: skills.trim(),
        isPlaced: false
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A student with this email already exists.' });
    }
    throw error;
  }
}

async function updateStudent(req, res) {
  const studentId = getPositiveId(req.params.id);
  if (!studentId) {
    return res.status(400).json({ message: 'Student ID must be a positive integer.' });
  }

  const body = getObjectBody(req.body);
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ message: 'Provide at least one student field to update.' });
  }

  const allowedFields = new Set(['name', 'branch', 'cgpa', 'skills', 'isPlaced']);
  if (Object.keys(body).some(field => !allowedFields.has(field))) {
    return res.status(400).json({ message: 'Only name, branch, CGPA, skills, and placed status can be updated.' });
  }

  const updates = [];
  const values = [];

  if (Object.hasOwn(body, 'name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 150) {
      return res.status(400).json({ message: 'Name must be between 1 and 150 characters.' });
    }
    updates.push('name = ?');
    values.push(name);
  }

  if (Object.hasOwn(body, 'branch')) {
    const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
    if (!branch || branch.length > 100) {
      return res.status(400).json({ message: 'Branch must be between 1 and 100 characters.' });
    }
    updates.push('branch = ?');
    values.push(branch);
  }

  if (Object.hasOwn(body, 'cgpa')) {
    if (!isValidCgpa(body.cgpa)) {
      return res.status(400).json({ message: 'CGPA must be a number between 0 and 10.' });
    }
    updates.push('cgpa = ?');
    values.push(body.cgpa);
  }

  if (Object.hasOwn(body, 'skills')) {
    if (!isValidSkills(body.skills)) {
      return res.status(400).json({ message: 'Skills must be a comma-separated string of 255 characters or fewer.' });
    }
    updates.push('skills = ?');
    values.push(body.skills.trim());
  }

  if (Object.hasOwn(body, 'isPlaced')) {
    if (typeof body.isPlaced !== 'boolean') {
      return res.status(400).json({ message: 'Placed status must be true or false.' });
    }
    updates.push('is_placed = ?');
    values.push(body.isPlaced);
  }

  const [existingStudents] = await pool.execute(
    'SELECT student_id FROM students WHERE student_id = ? LIMIT 1',
    [studentId]
  );
  if (existingStudents.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }

  values.push(studentId);
  await pool.execute(
    `UPDATE students SET ${updates.join(', ')} WHERE student_id = ?`,
    values
  );

  const [students] = await pool.execute(
    `SELECT ${studentFields} FROM students WHERE student_id = ? LIMIT 1`,
    [studentId]
  );
  if (students.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }
  return res.json({ message: 'Student profile updated successfully.', student: students[0] });
}

async function updateMyStudentProfile(req, res) {
  const body = getObjectBody(req.body);
  if (!body || Object.keys(body).length === 0) {
    return res.status(400).json({ message: 'Provide at least one student field to update.' });
  }

  if (Object.keys(body).some(field => !['name', 'branch', 'cgpa', 'skills'].includes(field))) {
    return res.status(400).json({ message: 'Students can update only their name, branch, CGPA, and skills.' });
  }

  const [students] = await pool.execute(
    'SELECT student_id FROM students WHERE user_id = ? LIMIT 1',
    [req.user.userId]
  );

  if (students.length === 0) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }

  req.params.id = String(students[0].student_id);
  return updateStudent(req, res);
}

async function deleteStudent(req, res) {
  const studentId = getPositiveId(req.params.id);
  if (!studentId) {
    return res.status(400).json({ message: 'Student ID must be a positive integer.' });
  }

  const [result] = await pool.execute('DELETE FROM students WHERE student_id = ?', [studentId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }

  return res.json({
    message: 'Student deleted successfully. Their application records have also been removed.'
  });
}

module.exports = {
  createStudent,
  deleteStudent,
  getMyStudentProfile,
  getStudent,
  listStudents,
  updateMyStudentProfile,
  updateStudent
};
