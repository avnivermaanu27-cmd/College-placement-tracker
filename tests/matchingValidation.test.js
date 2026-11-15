const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { matchScore } = require('../utils/matching');

const cases = [
  {
    name: 'full match',
    student: { cgpa: 10, branch: 'Computer Science', skills: 'javascript, sql, python' },
    drive: { minCgpa: 8, eligibleBranches: ['Computer Science'], skills: 'javascript,sql,python' },
    expected: 100
  },
  {
    name: 'partial skills match',
    student: { cgpa: 8, branch: 'Computer Science', skills: 'javascript,sql' },
    drive: { minCgpa: 7, eligibleBranches: ['Computer Science'], skills: 'javascript,sql,python,react' },
    expected: 77
  },
  {
    name: 'drive open to ALL branches',
    student: { cgpa: 9, branch: 'Electronics', skills: 'python' },
    drive: { minCgpa: 8, eligibleBranches: ['ALL'], skills: 'python,sql' },
    expected: 71
  },
  {
    name: 'low CGPA',
    student: { cgpa: 7.5, branch: 'Computer Science', skills: 'javascript' },
    drive: { minCgpa: 8, eligibleBranches: ['Computer Science'], skills: 'javascript' },
    expected: 0
  },
  {
    name: 'wrong branch',
    student: { cgpa: 9, branch: 'Electronics', skills: 'javascript' },
    drive: { minCgpa: 8, eligibleBranches: ['Computer Science'], skills: 'javascript' },
    expected: 0
  },
  {
    name: 'zero matching skills',
    student: { cgpa: 8.5, branch: 'Computer Science', skills: 'python' },
    drive: { minCgpa: 8, eligibleBranches: ['Computer Science'], skills: 'html,css,sql' },
    expected: 64
  },
  {
    name: 'skill spaces and letter case are ignored',
    student: { cgpa: 8.4, branch: 'Computer Science', skills: ' JavaScript , SQL ' },
    drive: { minCgpa: 7, eligibleBranches: ['Computer Science'], skills: 'javascript, sql' },
    expected: 93.6
  }
];

let passed = 0;

for (const testCase of cases) {
  test(testCase.name, () => {
    const got = matchScore(testCase.student, testCase.drive);
    assert.equal(got, testCase.expected);
    passed += 1;
    console.log(`PASS ${testCase.name}: expected ${testCase.expected}, got ${got}`);
  });
}

after(() => {
  if (passed === cases.length) {
    console.log(`${passed}/${cases.length} matching tests passed`);
  }
});
