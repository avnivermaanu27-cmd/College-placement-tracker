function getEligibleBranches(value) {
  const branches = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(branches) || branches.some(branch => typeof branch !== 'string')) {
    throw new Error('Placement drive has invalid eligible branches.');
  }
  return branches.map(branch => branch.trim());
}

function getSkills(value) {
  return typeof value === 'string'
    ? value.split(',').map(skill => skill.trim().toLowerCase()).filter(Boolean)
    : [];
}

function isEligible(student, drive) {
  const cgpa = Number(student.cgpa);
  const minCgpa = Number(drive.minCgpa);
  if (!Number.isFinite(cgpa) || !Number.isFinite(minCgpa) || cgpa < minCgpa) {
    return false;
  }

  const branches = getEligibleBranches(drive.eligibleBranches);
  const allowsAllBranches = branches.some(branch => branch.toUpperCase() === 'ALL');
  return allowsAllBranches || branches.includes(String(student.branch).trim());
}

function getMatchDetails(student, drive) {
  if (!isEligible(student, drive)) {
    return { score: 0, explanation: 'Not eligible' };
  }

  const branches = getEligibleBranches(drive.eligibleBranches);
  const allowsAllBranches = branches.some(branch => branch.toUpperCase() === 'ALL');
  const branchIsListed = branches.includes(String(student.branch).trim());
  const requiredSkills = getSkills(drive.skills);
  const studentSkills = new Set(getSkills(student.skills));
  const matchingSkills = requiredSkills.filter(skill => studentSkills.has(skill)).length;
  const cgpa = Number(student.cgpa);
  const cgpaScore = 40 * cgpa / 10;
  const branchScore = branchIsListed ? 30 : 20;
  const skillsScore = requiredSkills.length === 0
    ? 15
    : 30 * matchingSkills / requiredSkills.length;

  return {
    score: Math.round((cgpaScore + branchScore + skillsScore) * 10) / 10,
    explanation: `CGPA ${cgpa.toFixed(1)}, ${allowsAllBranches && !branchIsListed ? 'open to all branches' : 'branch listed'}, ${
      requiredSkills.length === 0 ? 'no required skills' : `${matchingSkills}/${requiredSkills.length} skills`
    }`
  };
}

function matchScore(student, drive) {
  return getMatchDetails(student, drive).score;
}

function getMatchExplanation(student, drive) {
  return getMatchDetails(student, drive).explanation;
}

module.exports = { getMatchExplanation, isEligible, matchScore };
