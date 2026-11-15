const { pool } = require('../config/db');
const { getObjectBody, getPositiveId } = require('../utils/validation');

const allowedStatusTransitions = {
  Applied: ['Shortlisted', 'Rejected'],
  Shortlisted: ['Selected', 'Rejected'],
  Selected: [],
  Rejected: []
};

const applicationFields = `
  a.application_id AS applicationId,
  a.student_id AS studentId,
  s.name AS studentName,
  s.email AS studentEmail,
  s.branch,
  s.cgpa,
  s.is_placed AS isPlaced,
  a.drive_id AS driveId,
  c.company_id AS companyId,
  c.name AS companyName,
  d.drive_date AS driveDate,
  a.status,
  a.applied_at AS appliedAt
`;

function getEligibleBranches(value) {
  const branches = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(branches) || branches.some(branch => typeof branch !== 'string')) {
    throw new Error('Placement drive has invalid eligible branches.');
  }
  return branches;
}

async function getCompanyForUser(userId) {
  const [companies] = await pool.execute(
    'SELECT company_id FROM companies WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return companies.length ? companies[0].company_id : null;
}

async function createApplication(req, res) {
  const body = getObjectBody(req.body);
  if (!body || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'driveId')) {
    return res.status(400).json({ message: 'A drive ID is required.' });
  }

  const driveId = getPositiveId(body.driveId);
  if (!driveId) {
    return res.status(400).json({ message: 'Drive ID must be a positive integer.' });
  }

  const [students] = await pool.execute(
    'SELECT student_id, branch, cgpa FROM students WHERE user_id = ? LIMIT 1',
    [req.user.userId]
  );
  if (students.length === 0) {
    return res.status(404).json({ message: 'Student profile not found.' });
  }
  const student = students[0];

  const [drives] = await pool.execute(
    `SELECT drive_id, min_cgpa, eligible_branches
     FROM placement_drives
     WHERE drive_id = ? LIMIT 1`,
    [driveId]
  );
  if (drives.length === 0) {
    return res.status(404).json({ message: 'Placement drive not found.' });
  }

  const drive = drives[0];
  if (Number(student.cgpa) < Number(drive.min_cgpa)) {
    return res.status(422).json({ message: 'Your CGPA is below the minimum required for this drive.' });
  }
  const eligibleBranches = getEligibleBranches(drive.eligible_branches);
  if (!eligibleBranches.includes(student.branch)) {
    return res.status(422).json({ message: 'Your branch is not eligible for this drive.' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO applications (student_id, drive_id, status)
       VALUES (?, ?, 'Applied')`,
      [student.student_id, driveId]
    );

    return res.status(201).json({
      message: 'Application submitted successfully.',
      application: {
        applicationId: result.insertId,
        studentId: student.student_id,
        driveId,
        status: 'Applied'
      }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You have already applied to this drive.' });
    }
    throw error;
  }
}

async function listApplications(req, res) {
  let query = `SELECT ${applicationFields}
     FROM applications a
     JOIN students s ON s.student_id = a.student_id
     JOIN placement_drives d ON d.drive_id = a.drive_id
     JOIN companies c ON c.company_id = d.company_id`;
  const values = [];

  if (req.user.role === 'student') {
    query += ' WHERE s.user_id = ?';
    values.push(req.user.userId);
  } else if (req.user.role === 'company') {
    const companyId = await getCompanyForUser(req.user.userId);
    if (!companyId) {
      return res.status(403).json({ message: 'This company account is not linked to a company profile.' });
    }
    query += ' WHERE d.company_id = ?';
    values.push(companyId);
  }

  query += ' ORDER BY a.applied_at DESC, a.application_id DESC';
  const [applications] = await pool.execute(query, values);
  return res.json({ applications });
}

async function updateApplication(req, res) {
  const applicationId = getPositiveId(req.params.id);
  if (!applicationId) {
    return res.status(400).json({ message: 'Application ID must be a positive integer.' });
  }

  const body = getObjectBody(req.body);
  const statuses = new Set(Object.keys(allowedStatusTransitions));
  if (
    !body ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'status') ||
    !statuses.has(body.status)
  ) {
    return res.status(400).json({
      message: 'Status must be Shortlisted, Selected, or Rejected.'
    });
  }

  const isAdmin = req.user.role === 'admin';
  const companyId = isAdmin ? null : await getCompanyForUser(req.user.userId);
  if (!isAdmin && !companyId) {
    return res.status(403).json({ message: 'This company account is not linked to a company profile.' });
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;
  let transactionCommitted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [applications] = await connection.execute(
      `SELECT a.application_id, a.student_id, a.status, d.company_id AS companyId
       FROM applications a
       JOIN placement_drives d ON d.drive_id = a.drive_id
       WHERE a.application_id = ?
       LIMIT 1
       FOR UPDATE`,
      [applicationId]
    );
    if (applications.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ message: 'Application not found.' });
    }

    const application = applications[0];
    if (!isAdmin && Number(application.companyId) !== Number(companyId)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(403).json({ message: 'You can only update applications for your own drives.' });
    }

    const allowedStatuses = allowedStatusTransitions[application.status] || [];
    if (!allowedStatuses.includes(body.status)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(422).json({
        message: `Application status cannot change from ${application.status} to ${body.status}.`
      });
    }

    await connection.execute(
      'UPDATE applications SET status = ? WHERE application_id = ?',
      [body.status, applicationId]
    );
    if (body.status === 'Selected') {
      await connection.execute(
        'UPDATE students SET is_placed = TRUE WHERE student_id = ?',
        [application.student_id]
      );
    }

    await connection.commit();
    transactionCommitted = true;

    return res.json({
      message: 'Application status updated successfully.',
      application: {
        applicationId,
        studentId: application.student_id,
        status: body.status
      }
    });
  } catch (error) {
    if (transactionStarted && !transactionCommitted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Failed to roll back application status update.', rollbackError);
      }
    }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { createApplication, listApplications, updateApplication };
