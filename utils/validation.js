function getObjectBody(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function getPositiveId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) {
    return null;
  }

  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

function isValidCgpa(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

module.exports = { getObjectBody, getPositiveId, isValidCgpa, isValidDate };
