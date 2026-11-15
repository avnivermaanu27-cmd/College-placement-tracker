const { pool } = require('../config/db');
const { getPositiveId } = require('../utils/validation');
const { getMatchExplanation, isEligible, matchScore } = require('../utils/matching');

async function getRecommendations(req, res) {
  const studentId = getPositiveId(req.params.studentId);
  if (!studentId) {
    return res.status(400).json({ message: 'Student ID must be a positive integer.' });
  }

  const [students] = await pool.execute(
    `SELECT student_id AS studentId, user_id AS userId, branch, cgpa, skills
     FROM students
     WHERE student_id = ? LIMIT 1`,
    [studentId]
  );
  if (students.length === 0) {
    return res.status(404).json({ message: 'Student not found.' });
  }

  const student = students[0];
  if (req.user.role === 'student' && Number(student.userId) !== req.user.userId) {
    return res.status(403).json({ message: 'You can only view your own recommendations.' });
  }

  const [drives] = await pool.execute(
    `SELECT d.drive_id AS driveId, c.name AS companyName,
            d.min_cgpa AS minCgpa, d.eligible_branches AS eligibleBranches, d.skills
     FROM placement_drives d
     JOIN companies c ON c.company_id = d.company_id`
  );

  const recommendations = drives
    .filter(drive => isEligible(student, drive))
    .map(drive => ({
      driveId: drive.driveId,
      companyName: drive.companyName,
      score: matchScore(student, drive),
      explanation: getMatchExplanation(student, drive)
    }))
    .sort((a, b) => b.score - a.score || a.driveId - b.driveId)
    .map((recommendation, index) => ({ rank: index + 1, ...recommendation }));

  return res.json({ recommendations });
}

module.exports = { getRecommendations };
