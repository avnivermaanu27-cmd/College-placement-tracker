const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getObjectBody,
  getPositiveId,
  isValidCgpa,
  isValidDate
} = require('../utils/validation');

test('getObjectBody accepts only JSON object-shaped values', () => {
  assert.deepEqual(getObjectBody({ name: 'Student' }), { name: 'Student' });
  assert.equal(getObjectBody(null), null);
  assert.equal(getObjectBody(['not', 'an', 'object']), null);
});

test('getPositiveId accepts positive safe integers only', () => {
  assert.equal(getPositiveId('12'), 12);
  assert.equal(getPositiveId(12), 12);
  assert.equal(getPositiveId('0'), null);
  assert.equal(getPositiveId('-1'), null);
  assert.equal(getPositiveId('1.5'), null);
  assert.equal(getPositiveId('9007199254740992'), null);
});

test('isValidCgpa enforces the inclusive 0 to 10 range', () => {
  assert.equal(isValidCgpa(0), true);
  assert.equal(isValidCgpa(10), true);
  assert.equal(isValidCgpa(10.1), false);
  assert.equal(isValidCgpa('8.5'), false);
});

test('isValidDate rejects impossible calendar dates', () => {
  assert.equal(isValidDate('2028-02-29'), true);
  assert.equal(isValidDate('2027-02-29'), false);
  assert.equal(isValidDate('2027-13-01'), false);
  assert.equal(isValidDate('15-01-2027'), false);
});
