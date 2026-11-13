const { pool } = require('../config/db');

const applicationStatuses = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];

async function getReports(req, res) {
  const [totalRows, driveRows, statusRows] = await Promise.all([
    pool.execute(
      `SELECT
         COUNT(*) AS totalStudents,
         COALESCE(SUM(is_placed = TRUE), 0) AS placedStudents,
         COALESCE(SUM(is_placed = FALSE), 0) AS unplacedStudents,
         (SELECT COUNT(*) FROM companies) AS totalCompanies,
         (SELECT COUNT(*) FROM placement_drives) AS totalDrives,
         (SELECT COUNT(*) FROM applications) AS totalApplications
       FROM students`
    ),
    pool.execute(
      `SELECT
         d.drive_id AS driveId,
         c.name AS companyName,
         COUNT(a.application_id) AS count
       FROM placement_drives d
       JOIN companies c ON c.company_id = d.company_id
       LEFT JOIN applications a ON a.drive_id = d.drive_id
       GROUP BY d.drive_id, c.name
       ORDER BY d.drive_id`
    ),
    pool.execute(
      `SELECT status, COUNT(*) AS count
       FROM applications
       GROUP BY status`
    )
  ]);

  const totals = totalRows[0][0];
  const totalStudents = Number(totals.totalStudents);
  const placedStudents = Number(totals.placedStudents);
  const applicationsByStatus = Object.fromEntries(
    applicationStatuses.map(status => [status, 0])
  );

  for (const row of statusRows[0]) {
    applicationsByStatus[row.status] = Number(row.count);
  }

  return res.json({
    totalStudents,
    placedStudents,
    unplacedStudents: Number(totals.unplacedStudents),
    placementPercentage: totalStudents === 0
      ? 0
      : Math.round((placedStudents / totalStudents) * 10000) / 100,
    totalCompanies: Number(totals.totalCompanies),
    totalDrives: Number(totals.totalDrives),
    totalApplications: Number(totals.totalApplications),
    applicationsPerDrive: driveRows[0].map(row => ({
      driveId: Number(row.driveId),
      companyName: row.companyName,
      count: Number(row.count)
    })),
    applicationsByStatus
  });
}

module.exports = { getReports };
