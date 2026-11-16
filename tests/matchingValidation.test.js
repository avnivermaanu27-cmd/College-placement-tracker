const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { isEligible, matchScore } = require('../utils/matching');
const { isValidCgpa } = require('../utils/validation');

test('CGPA validation rejects values below zero', () => {
  assert.equal(isValidCgpa(-1), false);
});

test('CGPA validation rejects values above ten', () => {
  assert.equal(isValidCgpa(11), false);
});

test('CGPA validation rejects NaN', () => {
  assert.equal(isValidCgpa(NaN), false);
});

test('CGPA validation rejects infinite values', () => {
  assert.equal(isValidCgpa(Infinity), false);
});

test('eligibility includes a student exactly at the minimum CGPA', () => {
  assert.equal(isEligible(
    { cgpa: 8, branch: 'Computer Science' },
    { minCgpa: 8, eligibleBranches: ['Computer Science'] }
  ), true);
});

test('eligibility rejects non-finite CGPA values', () => {
  assert.equal(isEligible(
    { cgpa: NaN, branch: 'Computer Science' },
    { minCgpa: 8, eligibleBranches: ['Computer Science'] }
  ), false);
});

test('matching score supports whitespace-padded, case-insensitive ALL branches', () => {
  assert.equal(matchScore(
    { cgpa: 8, branch: 'Electronics', skills: '' },
    { minCgpa: 7, eligibleBranches: [' all '], skills: '' }
  ), 67);
});

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
