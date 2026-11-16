const { pool } = require('../config/db');
const { getMatchExplanation, isEligible, matchScore } = require('../utils/matching');

const STUDENT_COUNT = 20000;
const DRIVE_COUNT = 2000;
const APPLICATION_COUNT = STUDENT_COUNT * 2;
const RUNS = 15;
const STUDENT_ID = 10001;
const COMPANY_ID = 42;
const BRANCH = 'Computer Science';

async function insertRows(connection, table, columns, rows, batchSize = 500) {
  const columnNames = columns.join(', ');
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const rowPlaceholders = `(${columns.map(() => '?').join(', ')})`;
    const placeholders = batch.map(() => rowPlaceholders).join(', ');
    const values = batch.flat();
    await connection.execute(
      `INSERT INTO ${table} (${columnNames}) VALUES ${placeholders}`,
      values
    );
  }
}

function median(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measure(connection, query) {
  const durations = [];
  for (let run = 0; run < RUNS; run += 1) {
    const start = process.hrtime.bigint();
    await query();
    durations.push(Number(process.hrtime.bigint() - start) / 1e6);
  }
  return median(durations);
}

async function warmUp(connection) {
  for (const query of Object.values(queries)) {
    await query(connection);
  }
}

async function setupTemporaryTables(connection) {
  await connection.query(`
    CREATE TEMPORARY TABLE bench_students (
      student_id INT UNSIGNED NOT NULL,
      branch VARCHAR(100) NOT NULL,
      cgpa DECIMAL(4, 2) NOT NULL,
      skills VARCHAR(255) NOT NULL,
      PRIMARY KEY (student_id)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TEMPORARY TABLE bench_companies (
      company_id INT UNSIGNED NOT NULL,
      name VARCHAR(150) NOT NULL,
      PRIMARY KEY (company_id)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TEMPORARY TABLE bench_drives (
      drive_id INT UNSIGNED NOT NULL,
      company_id INT UNSIGNED NOT NULL,
      drive_date DATE NOT NULL,
      min_cgpa DECIMAL(4, 2) NOT NULL,
      eligible_branches JSON NOT NULL,
      skills VARCHAR(255) NOT NULL,
      PRIMARY KEY (drive_id)
    ) ENGINE=InnoDB
  `);
  await connection.query(`
    CREATE TEMPORARY TABLE bench_applications (
      application_id INT UNSIGNED NOT NULL,
      student_id INT UNSIGNED NOT NULL,
      drive_id INT UNSIGNED NOT NULL,
      status ENUM('Applied', 'Shortlisted', 'Selected', 'Rejected') NOT NULL,
      applied_at DATETIME NOT NULL,
      PRIMARY KEY (application_id),
      UNIQUE KEY uq_bench_student_drive (student_id, drive_id)
    ) ENGINE=InnoDB
  `);

  const students = Array.from({ length: STUDENT_COUNT }, (_, index) => {
    const studentId = index + 1;
    return [
      studentId,
      studentId % 3 === 0 ? 'Information Technology' : BRANCH,
      6 + (studentId % 41) / 10,
      studentId % 2 === 0 ? 'javascript,sql' : 'python,sql'
    ];
  });
  const companies = Array.from({ length: 100 }, (_, index) => [
    index + 1,
    `Company ${index + 1}`
  ]);
  const drives = Array.from({ length: DRIVE_COUNT }, (_, index) => {
    const driveId = index + 1;
    return [
      driveId,
      (driveId % 100) + 1,
      `2027-${String((driveId % 12) + 1).padStart(2, '0')}-${String((driveId % 28) + 1).padStart(2, '0')}`,
      6 + (driveId % 31) / 10,
      JSON.stringify(driveId % 10 === 0 ? ['ALL'] : [BRANCH, 'Information Technology']),
      driveId % 2 === 0 ? 'javascript,sql' : 'python,sql'
    ];
  });
  const applications = Array.from({ length: APPLICATION_COUNT }, (_, index) => {
    const applicationId = index + 1;
    const studentId = Math.floor(index / 2) + 1;
    const driveId = ((studentId * 7 + index % 2) % DRIVE_COUNT) + 1;
    return [
      applicationId,
      studentId,
      driveId,
      ['Applied', 'Shortlisted', 'Selected', 'Rejected'][applicationId % 4],
      `2026-${String((applicationId % 12) + 1).padStart(2, '0')}-${String((applicationId % 28) + 1).padStart(2, '0')} 12:00:00`
    ];
  });

  await insertRows(connection, 'bench_students', ['student_id', 'branch', 'cgpa', 'skills'], students);
  await insertRows(connection, 'bench_companies', ['company_id', 'name'], companies);
  await insertRows(connection, 'bench_drives',
    ['drive_id', 'company_id', 'drive_date', 'min_cgpa', 'eligible_branches', 'skills'], drives);
  await insertRows(connection, 'bench_applications',
    ['application_id', 'student_id', 'drive_id', 'status', 'applied_at'], applications);
}

const queries = {
  'student lookup by ID': async connection => {
    await connection.execute(
      'SELECT student_id, branch, cgpa, skills FROM bench_students WHERE student_id = ? LIMIT 1',
      [STUDENT_ID]
    );
  },
  'applications by student': async connection => {
    await connection.execute(
      `SELECT application_id, student_id, drive_id, status, applied_at
       FROM bench_applications
       WHERE student_id = ?
       ORDER BY applied_at DESC, application_id DESC`,
      [STUDENT_ID]
    );
  },
  'drives by company': async connection => {
    await connection.execute(
      `SELECT drive_id, company_id, drive_date, min_cgpa, eligible_branches, skills
       FROM bench_drives
       WHERE company_id = ?
       ORDER BY drive_date, drive_id`,
      [COMPANY_ID]
    );
  },
  matching: async connection => {
    const [drives] = await connection.execute(
      `SELECT d.drive_id AS driveId, c.name AS companyName,
              d.min_cgpa AS minCgpa, d.eligible_branches AS eligibleBranches, d.skills
       FROM bench_drives d
       JOIN bench_companies c ON c.company_id = d.company_id`
    );
    const student = { branch: BRANCH, cgpa: 8.2, skills: 'javascript,sql' };
    drives
      .filter(drive => isEligible(student, drive))
      .map(drive => ({
        driveId: drive.driveId,
        companyName: drive.companyName,
        score: matchScore(student, drive),
        explanation: getMatchExplanation(student, drive)
      }))
      .sort((a, b) => b.score - a.score || a.driveId - b.driveId);
  }
};

async function main() {
  const connection = await pool.getConnection();
  const results = [];

  try {
    await setupTemporaryTables(connection);
    await warmUp(connection);

    for (const [name, query] of Object.entries(queries)) {
      results.push({ name, before: await measure(connection, () => query(connection)) });
    }

    await connection.query(
      'CREATE INDEX idx_bench_applications_student_applied ON bench_applications (student_id, applied_at, application_id)'
    );
    await connection.query(
      'CREATE INDEX idx_bench_applications_status ON bench_applications (status)'
    );
    await connection.query(
      'CREATE INDEX idx_bench_applications_applied ON bench_applications (applied_at, application_id)'
    );
    await connection.query(
      'CREATE INDEX idx_bench_drives_company_date ON bench_drives (company_id, drive_date, drive_id)'
    );
    await connection.query(
      'CREATE INDEX idx_bench_drives_date ON bench_drives (drive_date, drive_id)'
    );
    await warmUp(connection);

    for (const result of results) {
      result.after = await measure(connection, () => queries[result.name](connection));
    }

    console.log(`Temporary benchmark dataset: ${STUDENT_COUNT} students, ${DRIVE_COUNT} drives, ${APPLICATION_COUNT} applications.`);
    console.log(`Median of ${RUNS} runs; all data and indexes are session-scoped temporary tables.`);
    console.log('Query | Before (ms) | After (ms) | Speed-up');
    for (const { name, before, after } of results) {
      console.log(`${name} | ${before.toFixed(3)} | ${after.toFixed(3)} | ${(before / after).toFixed(2)}x`);
    }
  } finally {
    try {
      for (const table of [
        'bench_applications',
        'bench_drives',
        'bench_companies',
        'bench_students'
      ]) {
        await connection.query(`DROP TEMPORARY TABLE IF EXISTS ${table}`);
      }
    } finally {
      connection.release();
      await pool.end();
    }
  }
}

main().catch(error => {
  console.error('Benchmark failed:', error);
  process.exitCode = 1;
});
