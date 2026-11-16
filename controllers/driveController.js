const { pool } = require('../config/db');
const {
  getObjectBody,
  getPositiveId,
  isValidCgpa,
  isValidDate,
  isValidSkills
} = require('../utils/validation');

const driveFields = `
  d.drive_id AS driveId,
  d.company_id AS companyId,
  c.name AS companyName,
  d.drive_date AS driveDate,
  d.min_cgpa AS minCgpa,
  d.eligible_branches AS eligibleBranches,
  d.skills
`;

function validateDriveFields(body, { creating = false, allowCompanyId = false } = {}) {
  const allowedFields = new Set(['driveDate', 'minCgpa', 'eligibleBranches', 'skills']);
  if (allowCompanyId) {
    allowedFields.add('companyId');
  }
  if (Object.keys(body).some(field => !allowedFields.has(field))) {
    return 'Only drive date, minimum CGPA, eligible branches, and (for admins) company ID are accepted.';
  }
  if (creating && (!Object.hasOwn(body, 'driveDate') || !Object.hasOwn(body, 'minCgpa') ||
      !Object.hasOwn(body, 'eligibleBranches'))) {
    return 'Drive date, minimum CGPA, and eligible branches are required.';
  }
  if (Object.keys(body).length === 0) {
    return 'Provide at least one drive field.';
  }
  if (Object.hasOwn(body, 'driveDate') && !isValidDate(body.driveDate)) {
    return 'Drive date must be a real date in YYYY-MM-DD format.';
  }
  if (Object.hasOwn(body, 'minCgpa') && !isValidCgpa(body.minCgpa)) {
    return 'Minimum CGPA must be a number between 0 and 10.';
  }
  if (Object.hasOwn(body, 'skills') && !isValidSkills(body.skills)) {
    return 'Skills must be valid text between 1 and 255 characters.';
  }
  if (Object.hasOwn(body, 'eligibleBranches')) {
    if (
      !Array.isArray(body.eligibleBranches) ||
      body.eligibleBranches.length === 0 ||
      body.eligibleBranches.some(branch =>
        typeof branch !== 'string' || !branch.trim() || branch.trim().length > 100
      )
    ) {
      return 'Eligible branches must be a non-empty list of names, each 100 characters or fewer.';
    }
  }
  if (Object.hasOwn(body, 'companyId') && getPositiveId(body.companyId) === null) {
    return 'Company ID must be a positive integer.';
  }

  return null;
}

async function getCompanyForUser(userId) {
  const [companies] = await pool.execute(
    'SELECT company_id FROM companies WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return companies.length ? companies[0].company_id : null;
}

async function ensureCompanyExists(companyId, res) {
  const [companies] = await pool.execute(
    'SELECT company_id FROM companies WHERE company_id = ? LIMIT 1',
    [companyId]
  );
  if (companies.length === 0) {
    res.status(404).json({ message: 'Company not found.' });
    return false;
  }
  return true;
}

async function listDrives(req, res) {
  const [drives] = await pool.execute(
    `SELECT ${driveFields}
     FROM placement_drives d
     JOIN companies c ON c.company_id = d.company_id
     ORDER BY d.drive_date, d.drive_id`
  );
  return res.json({ drives });
}

async function getDrive(req, res) {
  const driveId = getPositiveId(req.params.id);
  if (!driveId) {
    return res.status(400).json({ message: 'Drive ID must be a positive integer.' });
  }

  const [drives] = await pool.execute(
    `SELECT ${driveFields}
     FROM placement_drives d
     JOIN companies c ON c.company_id = d.company_id
     WHERE d.drive_id = ? LIMIT 1`,
    [driveId]
  );
  if (drives.length === 0) {
    return res.status(404).json({ message: 'Placement drive not found.' });
  }

  return res.json({ drive: drives[0] });
}

async function createDrive(req, res) {
  const body = getObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ message: 'A JSON object is required.' });
  }

  const isAdmin = req.user.role === 'admin';
  const validationError = validateDriveFields(body, {
    creating: true,
    allowCompanyId: isAdmin
  });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  let companyId = body.companyId;
  if (isAdmin) {
    companyId = getPositiveId(companyId);
    if (!companyId) {
      return res.status(400).json({ message: 'A valid company ID is required for this drive.' });
    }
    if (!(await ensureCompanyExists(companyId, res))) {
      return;
    }
  } else {
    companyId = await getCompanyForUser(req.user.userId);
    if (!companyId) {
      return res.status(403).json({ message: 'This company account is not linked to a company profile.' });
    }
  }

  const branches = body.eligibleBranches.map(branch => branch.trim());
  const skills = typeof body.skills === 'string' ? body.skills.trim() : '';
  const [result] = await pool.execute(
    `INSERT INTO placement_drives
      (company_id, drive_date, min_cgpa, eligible_branches, skills)
     VALUES (?, ?, ?, ?, ?)`,
    [companyId, body.driveDate, body.minCgpa, JSON.stringify(branches), skills]
  );

  return res.status(201).json({
    message: 'Placement drive created successfully.',
    drive: {
      driveId: result.insertId,
      companyId,
      driveDate: body.driveDate,
      minCgpa: body.minCgpa,
      eligibleBranches: branches,
      skills
    }
  });
}

async function updateDrive(req, res) {
  const driveId = getPositiveId(req.params.id);
  if (!driveId) {
    return res.status(400).json({ message: 'Drive ID must be a positive integer.' });
  }

  const body = getObjectBody(req.body);
  if (!body) {
    return res.status(400).json({ message: 'A JSON object is required.' });
  }

  const isAdmin = req.user.role === 'admin';
  const validationError = validateDriveFields(body, { allowCompanyId: isAdmin });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const companyId = isAdmin ? null : await getCompanyForUser(req.user.userId);
  if (!isAdmin && !companyId) {
    return res.status(403).json({ message: 'This company account is not linked to a company profile.' });
  }
  const driveQuery = isAdmin
    ? 'SELECT drive_id FROM placement_drives WHERE drive_id = ? LIMIT 1'
    : 'SELECT drive_id FROM placement_drives WHERE drive_id = ? AND company_id = ? LIMIT 1';
  const driveValues = isAdmin ? [driveId] : [driveId, companyId];
  const [existingDrives] = await pool.execute(driveQuery, driveValues);
  if (existingDrives.length === 0) {
    return res.status(404).json({ message: 'Placement drive not found.' });
  }

  const updates = [];
  const values = [];
  if (Object.hasOwn(body, 'companyId')) {
    const companyId = getPositiveId(body.companyId);
    if (!(await ensureCompanyExists(companyId, res))) {
      return;
    }
    updates.push('company_id = ?');
    values.push(companyId);
  }
  if (Object.hasOwn(body, 'driveDate')) {
    updates.push('drive_date = ?');
    values.push(body.driveDate);
  }
  if (Object.hasOwn(body, 'minCgpa')) {
    updates.push('min_cgpa = ?');
    values.push(body.minCgpa);
  }
  if (Object.hasOwn(body, 'eligibleBranches')) {
    updates.push('eligible_branches = ?');
    values.push(JSON.stringify(body.eligibleBranches.map(branch => branch.trim())));
  }
  if (Object.hasOwn(body, 'skills')) {
    updates.push('skills = ?');
    values.push(body.skills.trim());
  }

  values.push(driveId);
  let query = `UPDATE placement_drives SET ${updates.join(', ')} WHERE drive_id = ?`;
  if (!isAdmin) {
    query += ' AND company_id = ?';
    values.push(companyId);
  }

  await pool.execute(query, values);

  const finalDriveQuery = `SELECT ${driveFields}
     FROM placement_drives d
     JOIN companies c ON c.company_id = d.company_id
     WHERE d.drive_id = ?${isAdmin ? '' : ' AND d.company_id = ?'} LIMIT 1`;
  const [drives] = await pool.execute(
    finalDriveQuery,
    isAdmin ? [driveId] : [driveId, companyId]
  );
  if (drives.length === 0) {
    return res.status(404).json({ message: 'Placement drive not found.' });
  }
  return res.json({ message: 'Placement drive updated successfully.', drive: drives[0] });
}

async function deleteDrive(req, res) {
  const driveId = getPositiveId(req.params.id);
  if (!driveId) {
    return res.status(400).json({ message: 'Drive ID must be a positive integer.' });
  }

  let query = 'DELETE FROM placement_drives WHERE drive_id = ?';
  const values = [driveId];
  if (req.user.role === 'company') {
    const companyId = await getCompanyForUser(req.user.userId);
    if (!companyId) {
      return res.status(403).json({ message: 'This company account is not linked to a company profile.' });
    }
    query += ' AND company_id = ?';
    values.push(companyId);
  }

  const [result] = await pool.execute(query, values);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Placement drive not found.' });
  }

  return res.json({
    message: 'Placement drive deleted successfully. Its application records have also been removed.'
  });
}

module.exports = { createDrive, deleteDrive, getDrive, listDrives, updateDrive };
