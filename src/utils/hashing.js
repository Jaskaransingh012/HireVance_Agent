const crypto = require('crypto');

/**
 * Normalize a string for fingerprinting: lowercase, trim, collapse
 * whitespace, strip punctuation that doesn't carry meaning.
 */
function normalizeForFingerprint(value) {
  if (!value) return '';
  return value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a SHA-256 fingerprint from an ordered list of field values.
 * Fields are normalized and joined with a delimiter unlikely to appear
 * in real content, so "Foo|Bar" and "Foo | Bar" don't collide.
 */
function buildFingerprint(fields) {
  const normalized = fields.map(normalizeForFingerprint).join('::');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Fingerprint for jobs/internships: company + title + location + employmentType
 */
function fingerprintJob({ company, title, location, employmentType }) {
  return buildFingerprint([company, title, location, employmentType]);
}

/**
 * Fingerprint for hackathons/competitions: organizer + title + startDate
 */
function fingerprintHackathon({ organizer, title, startDate }) {
  const dateStr = startDate ? new Date(startDate).toISOString().slice(0, 10) : '';
  return buildFingerprint([organizer, title, dateStr]);
}

module.exports = {
  normalizeForFingerprint,
  buildFingerprint,
  fingerprintJob,
  fingerprintHackathon,
};
