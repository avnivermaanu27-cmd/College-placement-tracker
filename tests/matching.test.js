const test = require('node:test');
const assert = require('node:assert/strict');
const { getMatchExplanation, isEligible, matchScore } = require('../utils/matching');

const student = {
  branch: 'Computer Science',
  cgpa: 8.4,
  skills: ' JavaScript, SQL '
};

test('scores an eligible student and explains the matched criteria', () => {
  const drive = {
    minCgpa: 7.5,
    eligibleBranches: ['Computer Science'],
    skills: 'javascript, python, sql'
  };

  assert.equal(isEligible(student, drive), true);
  assert.equal(matchScore(student, drive), 83.6);
  assert.equal(getMatchExplanation(student, drive), 'CGPA 8.4, branch listed, 2/3 skills');
});

test('returns zero for students below the CGPA or branch requirement', () => {
  const drive = {
    minCgpa: 9,
    eligibleBranches: ['Computer Science'],
    skills: 'javascript'
  };
  assert.equal(isEligible(student, drive), false);
  assert.equal(matchScore(student, drive), 0);

  assert.equal(isEligible(student, { ...drive, minCgpa: 7, eligibleBranches: ['Electronics'] }), false);
});

test('scores ALL-branch drives and drives with no required skills', () => {
  const drive = { minCgpa: 7, eligibleBranches: ['ALL'], skills: '' };
  assert.equal(isEligible(student, drive), true);
  assert.equal(matchScore(student, drive), 68.6);
  assert.equal(getMatchExplanation(student, drive), 'CGPA 8.4, open to all branches, no required skills');
});
