const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { createAuthToken } = require('../config/jwt');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRequestBody(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

function getEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function registerStudent(req, res, next) {
  createStudentAccount(req, res).catch(next);
}

async function createStudentAccount(req, res) {
  const body = getRequestBody(req.body);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = getEmail(body.email);
  const branch = typeof body.branch === 'string' ? body.branch.trim() : '';
  const password = body.password;
  const cgpa = body.cgpa;

  if (!name || name.length > 150) {
    return res.status(400).json({ message: 'Name is required and must be 150 characters or fewer.' });
  }

  if (!emailPattern.test(email) || email.length > 255) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  if (!branch || branch.length > 100) {
    return res.status(400).json({ message: 'Branch is required and must be 100 characters or fewer.' });
  }

  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and no more than 72 bytes.' });
  }

  if (typeof cgpa !== 'number' || !Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
    return res.status(400).json({ message: 'CGPA must be a number between 0 and 10.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const connection = await pool.getConnection();
  let transactionStarted = false;
  let transactionCommitted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [userResult] = await connection.execute(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, 'student']
    );

    const [studentResult] = await connection.execute(
      'INSERT INTO students (user_id, name, email, branch, cgpa) VALUES (?, ?, ?, ?, ?)',
      [userResult.insertId, name, email, branch, cgpa]
    );

    const user = {
      user_id: userResult.insertId,
      email,
      role: 'student'
    };
    const token = createAuthToken(user);

    await connection.commit();
    transactionCommitted = true;

    return res.status(201).json({
      message: 'Student account created successfully.',
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        studentId: studentResult.insertId,
        name,
        branch,
        cgpa
      }
    });
  } catch (error) {
    if (transactionStarted && !transactionCommitted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to roll back student registration transaction.', rollbackError);
      }
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    throw error;
  } finally {
    connection.release();
  }
}

function login(req, res, next) {
  authenticateUser(req, res).catch(next);
}

async function authenticateUser(req, res) {
  const body = getRequestBody(req.body);
  const email = getEmail(body.email);
  const password = body.password;

  if (!emailPattern.test(email) || email.length > 255 || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'A valid email and password are required.' });
  }

  const [users] = await pool.execute(
    'SELECT user_id, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );

  if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const user = users[0];
  return res.json({
    message: 'Login successful.',
    token: createAuthToken(user),
    user: {
      userId: user.user_id,
      email: user.email,
      role: user.role
    }
  });
}

function getCurrentUser(req, res) {
  return res.json({ user: req.user });
}

module.exports = { getCurrentUser, login, registerStudent };
