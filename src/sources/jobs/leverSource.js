const BaseSource = require('../baseSource');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Lever also exposes a public JSON API for company postings:
 *   https://api.lever.co/v0/postings/{company}?mode=json
 */
class LeverSource extends BaseSource {
  constructor({ companySlug, companyName }) {
    super({ name: `lever:${companySlug}`, type: 'jobs' });
    this.companySlug = companySlug;
    this.companyName = companyName || companySlug;
  }

  async fetch() {
    const url = `https://api.lever.co/v0/postings/${this.companySlug}?mode=json`;
    const res = await getWithRetry(url);
    return res.data;
  }

  async parse(raw) {
    const postings = Array.isArray(raw) ? raw : [];
    return postings.map((p) => this._toOpportunity(p)).filter(Boolean);
  }

  _toOpportunity(posting) {
    if (!posting?.hostedUrl || !posting?.text) return null;

    const title = String(posting.text).trim();
    const location = posting.categories?.location?.trim() || null;
    const commitment = posting.categories?.commitment || null;
    const description = stripHtml(posting.descriptionPlain || posting.description || '');
    const employmentType = classifyEmploymentType(title, commitment);

    return {
      type: employmentType === 'INTERNSHIP' ? 'INTERNSHIP' : 'JOB',
      title,
      company: this.companyName,
      description,
      url: posting.hostedUrl,
      location,
      remote: /remote/i.test(location || ''),
      employmentType,
      deadline: null,
      source: this.name,
      externalId: posting.id,
    };
  }
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

function classifyEmploymentType(title, commitment) {
  const t = `${title} ${commitment || ''}`.toLowerCase();
  if (/intern/.test(t)) return 'INTERNSHIP';
  if (/new grad|graduate/.test(t)) return 'NEW_GRAD';
  return 'FULL_TIME';
}

module.exports = LeverSource;
