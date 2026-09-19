const { canonicalizeUrl } = require('../utils/url');
const { fingerprintJob, fingerprintHackathon } = require('../utils/hashing');

const VALID_TYPES = new Set(['JOB', 'INTERNSHIP', 'HACKATHON', 'COMPETITION']);

/**
 * Normalize a raw opportunity object (as returned by any source's parse())
 * into the canonical shape stored in the DB, including canonicalUrl and
 * fingerprint. Treats every field as untrusted input from the web - no
 * field here is ever executed or interpreted as instructions.
 */
function normalizeOpportunity(raw) {
  const type = VALID_TYPES.has(raw.type) ? raw.type : coerceType(raw);

  const title = safeString(raw.title);
  const company = safeString(raw.company) || 'Unknown';
  const url = safeString(raw.url);
  if (!title || !url) {
    throw new Error('Opportunity missing required fields (title/url)');
  }

  const canonicalUrl = canonicalizeUrl(url);
  const location = safeString(raw.location) || null;
  const employmentType = safeString(raw.employmentType) || null;
  const deadline = parseDate(raw.deadline);
  const description = safeString(raw.description)?.slice(0, 6000) || null;

  const fingerprint =
    type === 'HACKATHON' || type === 'COMPETITION'
      ? fingerprintHackathon({
          organizer: raw.organizer || company,
          title,
          startDate: raw.startDate || deadline,
        })
      : fingerprintJob({ company, title, location, employmentType });

  return {
    type,
    title,
    company,
    description,
    url,
    canonicalUrl,
    location,
    remote: Boolean(raw.remote),
    employmentType,
    deadline,
    source: safeString(raw.source) || 'unknown',
    externalId: raw.externalId != null ? String(raw.externalId) : null,
    fingerprint,
  };
}

function coerceType(raw) {
  const t = `${raw.type || ''}`.toUpperCase();
  if (t.includes('INTERN')) return 'INTERNSHIP';
  if (t.includes('HACK')) return 'HACKATHON';
  if (t.includes('COMPET')) return 'COMPETITION';
  return 'JOB';
}

function safeString(value) {
  if (value == null) return null;
  return String(value).trim() || null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { normalizeOpportunity };
