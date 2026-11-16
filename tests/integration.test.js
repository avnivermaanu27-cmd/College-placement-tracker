const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'integration-test-secret-with-at-least-32-characters';

const app = require('../server');
const { pool } = require('../config/db');

const initialData = () => ({
  students: [
    { student_id: 1, user_id: 101, name: 'Student One', email: 'one@example.com', branch: 'Computer Science', cgpa: 8.5, skills: 'JavaScript', is_placed: false },
    { student_id: 2, user_id: 102, name: 'Student Two', email: 'two@example.com', branch: 'Computer Science', cgpa: 8, skills: 'SQL', is_placed: false },
    { student_id: 3, user_id: 103, name: 'Student Three', email: 'three@example.com', branch: 'Computer Science', cgpa: 6, skills: '', is_placed: false }
  ],
  companies: [
    { company_id: 1, user_id: 201, name: 'Company One' },
    { company_id: 2, user_id: 202, name: 'Company Two' }
  ],
  drives: [
    { drive_id: 1, company_id: 1, drive_date: '2027-01-15', min_cgpa: 7, eligible_branches: ['Computer Science'], skills: '' },
    { drive_id: 2, company_id: 2, drive_date: '2027-02-15', min_cgpa: 7, eligible_branches: ['Computer Science'], skills: '' }
  ],
  applications: [],
  nextApplicationId: 1
});

let data = initialData();
let server;
let originalExecute;
let originalGetConnection;

function mysqlResult(rows) {
  return [rows, []];
}

function findApplication(applicationId) {
  return data.applications.find(application => application.application_id === Number(applicationId));
}

async function execute(query, values = []) {
  const sql = query.replace(/\s+/g, ' ').trim().toLowerCase();

  if (sql.startsWith('select company_id from companies where user_id =')) {
    return mysqlResult(data.companies
      .filter(company => company.user_id === Number(values[0]))
      .map(company => ({ company_id: company.company_id })));
  }
  if (sql.startsWith('select student_id, branch, cgpa from students where user_id =')) {
    return mysqlResult(data.students
      .filter(student => student.user_id === Number(values[0]))
      .map(({ student_id, branch, cgpa }) => ({ student_id, branch, cgpa })));
  }
  if (sql.startsWith('select drive_id, min_cgpa, eligible_branches from placement_drives')) {
    return mysqlResult(data.drives
      .filter(drive => drive.drive_id === Number(values[0]))
      .map(({ drive_id, min_cgpa, eligible_branches }) => ({
        drive_id,
        min_cgpa,
        eligible_branches
      })));
  }
  if (sql.startsWith('insert into applications')) {
    const [studentId, driveId] = values.map(Number);
    if (data.applications.some(application =>
      application.student_id === studentId && application.drive_id === driveId
    )) {
      const error = new Error('Duplicate application.');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }

    const application = {
      application_id: data.nextApplicationId++,
      student_id: studentId,
      drive_id: driveId,
      status: 'Applied'
    };
    data.applications.push(application);
    return [{ insertId: application.application_id }, []];
  }
  if (sql.startsWith('select a.application_id as applicationid')) {
    let applications = data.applications.slice();
    if (sql.includes('where s.user_id = ?')) {
      const student = data.students.find(item => item.user_id === Number(values[0]));
      applications = applications.filter(item => student && item.student_id === student.student_id);
    } else if (sql.includes('where d.company_id = ?')) {
      applications = applications.filter(item =>
        data.drives.find(drive => drive.drive_id === item.drive_id)?.company_id === Number(values[0])
      );
    }

    return mysqlResult(applications.map(application => {
      const student = data.students.find(item => item.student_id === application.student_id);
      const drive = data.drives.find(item => item.drive_id === application.drive_id);
      const company = data.companies.find(item => item.company_id === drive.company_id);
      return {
        applicationId: application.application_id,
        studentId: student.student_id,
        studentName: student.name,
        studentEmail: student.email,
        branch: student.branch,
        cgpa: student.cgpa,
        isPlaced: student.is_placed,
        driveId: drive.drive_id,
        companyId: company.company_id,
        companyName: company.name,
        driveDate: drive.drive_date,
        status: application.status
      };
    }));
  }
  if (sql.startsWith('select d.drive_id as driveid')) {
    return mysqlResult(data.drives.map(drive => ({
      driveId: drive.drive_id,
      companyId: drive.company_id,
      companyName: data.companies.find(company => company.company_id === drive.company_id).name,
      driveDate: drive.drive_date,
      minCgpa: drive.min_cgpa,
      eligibleBranches: drive.eligible_branches,
      skills: drive.skills
    })));
  }
  if (sql.startsWith('select count(*) as totalstudents')) {
    const placedStudents = data.students.filter(student => student.is_placed).length;
    return mysqlResult([{
      totalStudents: data.students.length,
      placedStudents,
      unplacedStudents: data.students.length - placedStudents,
      totalCompanies: data.companies.length,
      totalDrives: data.drives.length,
      totalApplications: data.applications.length
    }]);
  }
  if (sql.startsWith('select d.drive_id as driveid, c.name as companyname')) {
    return mysqlResult(data.drives.map(drive => ({
      driveId: drive.drive_id,
      companyName: data.companies.find(company => company.company_id === drive.company_id).name,
      count: data.applications.filter(application => application.drive_id === drive.drive_id).length
    })));
  }
  if (sql.startsWith('select status, count(*) as count from applications')) {
    const counts = new Map();
    for (const application of data.applications) {
      counts.set(application.status, (counts.get(application.status) || 0) + 1);
    }
    return mysqlResult(Array.from(counts, ([status, count]) => ({ status, count })));
  }

  throw new Error(`Unexpected test database query: ${query}`);
}

function createToken(userId, role) {
  return jwt.sign({ role }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: '1h'
  });
}

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const headers = {};
    if (data !== null) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method,
      path,
      headers
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode,
          body: text ? JSON.parse(text) : null
        });
      });
    });
    req.on('error', reject);
    if (data !== null) {
      req.write(data);
    }
    req.end();
  });
}

const studentOne = () => createToken(101, 'student');
const studentTwo = () => createToken(102, 'student');
const lowCgpaStudent = () => createToken(103, 'student');
const companyOne = () => createToken(201, 'company');
const admin = () => createToken(301, 'admin');

test.before(async () => {
  originalExecute = pool.execute;
  originalGetConnection = pool.getConnection;
  pool.execute = execute;
  pool.getConnection = async () => ({
    beginTransaction: async () => {},
    execute: async (query, values = []) => {
      const sql = query.replace(/\s+/g, ' ').trim().toLowerCase();
      if (sql.startsWith('select a.application_id, a.student_id, a.status, d.company_id as companyid')) {
        const application = findApplication(values[0]);
        if (!application) {
          return mysqlResult([]);
        }
        return mysqlResult([{
          application_id: application.application_id,
          student_id: application.student_id,
          status: application.status,
          companyId: data.drives.find(drive => drive.drive_id === application.drive_id).company_id
        }]);
      }
      if (sql.startsWith('update applications set status =')) {
        const application = findApplication(values[1]);
        application.status = values[0];
        return [{ affectedRows: 1 }, []];
      }
      if (sql.startsWith('update students set is_placed = true')) {
        const student = data.students.find(item => item.student_id === Number(values[0]));
        student.is_placed = true;
        return [{ affectedRows: 1 }, []];
      }
      return execute(query, values);
    },
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
});

test.beforeEach(() => {
  data = initialData();
});

test.after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  pool.execute = originalExecute;
  pool.getConnection = originalGetConnection;
});

test('eligible student applies, is shortlisted and selected, and admin report shows one placed', async () => {
  const application = await request('POST', '/api/applications', { driveId: 1 }, studentOne());
  assert.equal(application.status, 201);

  const shortlisted = await request('PUT', `/api/applications/${application.body.application.applicationId}`,
    { status: 'Shortlisted' }, companyOne());
  assert.equal(shortlisted.status, 200);

  const selected = await request('PUT', `/api/applications/${application.body.application.applicationId}`,
    { status: 'Selected' }, companyOne());
  assert.equal(selected.status, 200);

  const report = await request('GET', '/api/reports', undefined, admin());
  assert.equal(report.status, 200);
  assert.equal(report.body.placedStudents, 1);
  assert.equal(report.body.applicationsByStatus.Selected, 1);
});

test('one applicant is selected and another rejected with matching report counts', async () => {
  const first = await request('POST', '/api/applications', { driveId: 1 }, studentOne());
  const second = await request('POST', '/api/applications', { driveId: 1 }, studentTwo());
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  await request('PUT', `/api/applications/${first.body.application.applicationId}`,
    { status: 'Shortlisted' }, companyOne());
  const selected = await request('PUT', `/api/applications/${first.body.application.applicationId}`,
    { status: 'Selected' }, companyOne());
  const rejected = await request('PUT', `/api/applications/${second.body.application.applicationId}`,
    { status: 'Rejected' }, companyOne());
  assert.equal(selected.status, 200);
  assert.equal(rejected.status, 200);

  const report = await request('GET', '/api/reports', undefined, admin());
  assert.equal(report.body.totalApplications, 2);
  assert.equal(report.body.placedStudents, 1);
  assert.equal(report.body.applicationsByStatus.Selected, 1);
  assert.equal(report.body.applicationsByStatus.Rejected, 1);
});

test('student cannot apply twice to the same drive', async () => {
  assert.equal((await request('POST', '/api/applications', { driveId: 1 }, studentOne())).status, 201);
  const duplicate = await request('POST', '/api/applications', { driveId: 1 }, studentOne());
  assert.equal(duplicate.status, 409);
});

test('student below the drive minimum CGPA is blocked', async () => {
  const response = await request('POST', '/api/applications', { driveId: 1 }, lowCgpaStudent());
  assert.equal(response.status, 422);
  assert.equal(data.applications.length, 0);
});

test('student sees only their own applications', async () => {
  await request('POST', '/api/applications', { driveId: 1 }, studentOne());
  await request('POST', '/api/applications', { driveId: 1 }, studentTwo());

  const response = await request('GET', '/api/applications', undefined, studentOne());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.applications.map(application => application.studentId), [1]);
});

test('company sees only its own drives', async () => {
  const response = await request('GET', '/api/drives', undefined, companyOne());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.drives.map(drive => drive.companyId), [1]);
});

test('student cannot use admin APIs', async () => {
  const reports = await request('GET', '/api/reports', undefined, studentOne());
  const adminCheck = await request('GET', '/api/auth/admin-check', undefined, studentOne());
  assert.equal(reports.status, 403);
  assert.equal(adminCheck.status, 403);
});

test('protected APIs return 401 without a token after client logout', async () => {
  for (const path of ['/api/applications', '/api/reports', '/api/drives']) {
    const response = await request('GET', path);
    assert.equal(response.status, 401, path);
  }
});
