const { pool } = require('../config/db');
const { getObjectBody, getPositiveId, isValidSafeText } = require('../utils/validation');

const companyFields = `
  company_id AS companyId,
  name,
  location,
  package
`;

async function listCompanies(req, res) {
  const [companies] = await pool.execute(
    `SELECT ${companyFields} FROM companies ORDER BY company_id`
  );
  return res.json({ companies });
}

async function getCompany(req, res) {
  const companyId = getPositiveId(req.params.id);
  if (!companyId) {
    return res.status(400).json({ message: 'Company ID must be a positive integer.' });
  }

  const [companies] = await pool.execute(
    `SELECT ${companyFields} FROM companies WHERE company_id = ? LIMIT 1`,
    [companyId]
  );
  if (companies.length === 0) {
    return res.status(404).json({ message: 'Company not found.' });
  }

  return res.json({ company: companies[0] });
}

function validateCompanyFields(body, { creating = false, allowUserId = false } = {}) {
  const allowedFields = new Set(['name', 'location', 'package']);
  if (allowUserId) {
    allowedFields.add('userId');
  }
  if (Object.keys(body).some(field => !allowedFields.has(field))) {
    return 'Only name, location, package, and an optional company user ID are accepted.';
  }
  if (creating && (!Object.hasOwn(body, 'name') || !Object.hasOwn(body, 'location') ||
      !Object.hasOwn(body, 'package'))) {
    return 'Name, location, and package are required.';
  }
  if (Object.keys(body).length === 0) {
    return 'Provide at least one company field.';
  }
  if (Object.hasOwn(body, 'name') &&
      !isValidSafeText(body.name)) {
    return 'Company name must be valid text between 1 and 50 characters.';
  }
  if (Object.hasOwn(body, 'location') &&
      !isValidSafeText(body.location)) {
    return 'Location must be valid text between 1 and 50 characters.';
  }
  if (Object.hasOwn(body, 'package') &&
      (typeof body.package !== 'number' || !Number.isFinite(body.package) ||
       body.package < 0 || body.package > 99999999.99)) {
    return 'Package must be a number between 0 and 99999999.99.';
  }
  if (Object.hasOwn(body, 'userId') && body.userId !== null && getPositiveId(body.userId) === null) {
    return 'Company user ID must be a positive integer or null.';
  }

  return null;
}

async function validateCompanyUserId(userId, res) {
  if (userId === null) {
    return true;
  }

  const [users] = await pool.execute(
    'SELECT user_id FROM users WHERE user_id = ? AND role = ? LIMIT 1',
    [userId, 'company']
  );
  if (users.length === 0) {
    res.status(400).json({ message: 'The specified user must be an existing company account.' });
    return false;
  }

  return true;
}

async function createCompany(req, res) {
  const body = getObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ message: 'A JSON object is required.' });
  }

  const validationError = validateCompanyFields(body, { creating: true, allowUserId: true });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const userId = body.userId === undefined ? null : body.userId;
  if (userId !== null && !(await validateCompanyUserId(userId, res))) {
    return;
  }

  const name = body.name.trim();
  const location = body.location.trim();

  try {
    const [result] = await pool.execute(
      'INSERT INTO companies (user_id, name, location, package) VALUES (?, ?, ?, ?)',
      [userId, name, location, body.package]
    );

    return res.status(201).json({
      message: 'Company created successfully.',
      company: { companyId: result.insertId, name, location, package: body.package }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That company account is already linked to a company.' });
    }
    throw error;
  }
}

async function updateCompany(req, res) {
  const companyId = getPositiveId(req.params.id);
  if (!companyId) {
    return res.status(400).json({ message: 'Company ID must be a positive integer.' });
  }

  const body = getObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ message: 'A JSON object is required.' });
  }

  const isAdmin = req.user.role === 'admin';
  const validationError = validateCompanyFields(body, { allowUserId: isAdmin });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (Object.hasOwn(body, 'userId') &&
      !(await validateCompanyUserId(body.userId, res))) {
    return;
  }

  const companyValues = isAdmin
    ? [companyId]
    : [companyId, req.user.userId];
  const companyQuery = isAdmin
    ? 'SELECT company_id FROM companies WHERE company_id = ? LIMIT 1'
    : 'SELECT company_id FROM companies WHERE company_id = ? AND user_id = ? LIMIT 1';
  const [existingCompanies] = await pool.execute(companyQuery, companyValues);
  if (existingCompanies.length === 0) {
    return res.status(404).json({ message: 'Company not found.' });
  }

  const updates = [];
  const values = [];
  for (const [field, column] of [['name', 'name'], ['location', 'location'], ['package', 'package']]) {
    if (Object.hasOwn(body, field)) {
      updates.push(`${column} = ?`);
      values.push(typeof body[field] === 'string' ? body[field].trim() : body[field]);
    }
  }
  if (Object.hasOwn(body, 'userId')) {
    updates.push('user_id = ?');
    values.push(body.userId);
  }

  values.push(companyId);
  let query = `UPDATE companies SET ${updates.join(', ')} WHERE company_id = ?`;
  if (!isAdmin) {
    query += ' AND user_id = ?';
    values.push(req.user.userId);
  }

  try {
    await pool.execute(query, values);

    const companyReadQuery = isAdmin
      ? `SELECT ${companyFields} FROM companies WHERE company_id = ? LIMIT 1`
      : `SELECT ${companyFields} FROM companies WHERE company_id = ? AND user_id = ? LIMIT 1`;
    const companyReadValues = isAdmin ? [companyId] : [companyId, req.user.userId];
    const [companies] = await pool.execute(companyReadQuery, companyReadValues);
    if (companies.length === 0) {
      return res.status(404).json({ message: 'Company not found.' });
    }
    return res.json({ message: 'Company updated successfully.', company: companies[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That company account is already linked to a company.' });
    }
    throw error;
  }
}

async function deleteCompany(req, res) {
  const companyId = getPositiveId(req.params.id);
  if (!companyId) {
    return res.status(400).json({ message: 'Company ID must be a positive integer.' });
  }

  const [result] = await pool.execute('DELETE FROM companies WHERE company_id = ?', [companyId]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Company not found.' });
  }

  return res.json({
    message: 'Company deleted successfully. Its placement drives and related applications are removed.'
  });
}

module.exports = { createCompany, deleteCompany, getCompany, listCompanies, updateCompany };
