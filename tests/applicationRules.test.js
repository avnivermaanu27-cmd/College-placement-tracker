const test = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('../config/db');
const {
  createApplication,
  updateApplication
} = require('../controllers/applicationController');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

async function updateWithMock({ role = 'admin', currentStatus, nextStatus, driveCompanyId = 4 }) {
  const calls = [];
  const connection = {
    async beginTransaction() {
      calls.push('begin');
    },
    async execute(query, values) {
      calls.push({ query, values });
      if (query.startsWith('SELECT a.application_id')) {
        return [[{
          application_id: 12,
          student_id: 8,
          status: currentStatus,
          companyId: driveCompanyId
        }]];
      }
      return [{ affectedRows: 1 }];
    },
    async commit() {
      calls.push('commit');
    },
    async rollback() {
      calls.push('rollback');
    },
    release() {
      calls.push('release');
    }
  };
  const originalExecute = pool.execute;
  const originalGetConnection = pool.getConnection;
  pool.execute = async () => [[{ company_id: 3 }]];
  pool.getConnection = async () => connection;

  try {
    const res = createResponse();
    await updateApplication({
      params: { id: '12' },
      body: { status: nextStatus },
      user: { userId: 31, role }
    }, res);
    return { res, calls };
  } finally {
    pool.execute = originalExecute;
    pool.getConnection = originalGetConnection;
  }
}

test('company receives 403 when updating an application for another company drive', async () => {
  const { res, calls } = await updateWithMock({
    role: 'company',
    currentStatus: 'Applied',
    nextStatus: 'Shortlisted',
    driveCompanyId: 4
  });

  assert.equal(res.statusCode, 403);
  assert.equal(calls.some(call =>
    typeof call === 'object' && call.query.startsWith('UPDATE applications')
  ), false);
  assert.ok(calls.includes('rollback'));
});

test('application statuses allow only the specified forward transitions', async () => {
  const allowed = [
    ['Applied', 'Shortlisted'],
    ['Applied', 'Rejected'],
    ['Shortlisted', 'Selected'],
    ['Shortlisted', 'Rejected']
  ];
  const blocked = [
    ['Applied', 'Selected'],
    ['Shortlisted', 'Applied'],
    ['Selected', 'Shortlisted'],
    ['Selected', 'Rejected'],
    ['Rejected', 'Shortlisted'],
    ['Rejected', 'Selected']
  ];

  for (const [currentStatus, nextStatus] of allowed) {
    const { res, calls } = await updateWithMock({ currentStatus, nextStatus });
    assert.equal(res.statusCode, 200, `${currentStatus} -> ${nextStatus}`);
    assert.ok(calls.some(call =>
      typeof call === 'object' && call.query.startsWith('UPDATE applications')
    ));
  }

  for (const [currentStatus, nextStatus] of blocked) {
    const { res, calls } = await updateWithMock({ currentStatus, nextStatus });
    assert.equal(res.statusCode, 422, `${currentStatus} -> ${nextStatus}`);
    assert.equal(calls.some(call =>
      typeof call === 'object' && call.query.startsWith('UPDATE applications')
    ), false);
    assert.ok(calls.includes('rollback'));
  }
});

async function applyWithMock(student, drive) {
  const calls = [];
  const originalExecute = pool.execute;
  pool.execute = async query => {
    calls.push(query);
    if (query.includes('FROM students')) {
      return [[student]];
    }
    if (query.includes('FROM placement_drives')) {
      return [[drive]];
    }
    throw new Error('Unexpected database query.');
  };

  try {
    const res = createResponse();
    await createApplication({
      body: { driveId: 5 },
      user: { userId: 6, role: 'student' }
    }, res);
    return { res, calls };
  } finally {
    pool.execute = originalExecute;
  }
}

test('application eligibility failures return 422 for low CGPA and ineligible branch', async () => {
  const student = { student_id: 6, cgpa: 7.5, branch: 'Computer Science' };
  const drive = { drive_id: 5, min_cgpa: 8, eligible_branches: ['Computer Science'] };
  const lowCgpa = await applyWithMock(student, drive);
  assert.equal(lowCgpa.res.statusCode, 422);
  assert.match(lowCgpa.res.body.message, /CGPA/);

  const wrongBranch = await applyWithMock(
    { ...student, cgpa: 9, branch: 'Electronics' },
    { ...drive, min_cgpa: 7 }
  );
  assert.equal(wrongBranch.res.statusCode, 422);
  assert.match(wrongBranch.res.body.message, /branch/);
  assert.equal(wrongBranch.calls.some(query => query.startsWith('INSERT INTO applications')), false);
});
