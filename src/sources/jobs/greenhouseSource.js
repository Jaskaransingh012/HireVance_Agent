const BaseSource = require('../baseSource');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Greenhouse exposes a public, documented JSON API for company job boards:
 *   https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
 * This is far more reliable than scraping HTML and is explicitly intended
 * for this kind of consumption, so no Playwright/Cheerio needed here.
 *
 * `boardToken` is the slug Greenhouse assigns a company, e.g. "stripe".
 */
class GreenhouseSource extends BaseSource {
  constructor({ boardToken, companyName }) {
    super({ name: `greenhouse:${boardToken}`, type: 'jobs' });
    this.boardToken = boardToken;
    this.companyName = companyName || boardToken;
  }

  async fetch() {
    const url = `https://boards-api.greenhouse.io/v1/boards/${this.boardToken}/jobs?content=true`;
    const res = await getWithRetry(url);
    return res.data;
  }

  async parse(raw) {
    const jobs = Array.isArray(raw?.jobs) ? raw.jobs : [];
    return jobs.map((job) => this._toOpportunity(job)).filter(Boolean);
  }

  _toOpportunity(job) {
    if (!job?.absolute_url || !job?.title) return null;

    const title = String(job.title).trim();
    const location = job.location?.name?.trim() || null;
    const description = stripHtml(job.content || '');
    const employmentType = classifyEmploymentType(title);

    return {
      type: employmentType === 'INTERNSHIP' ? 'INTERNSHIP' : 'JOB',
      title,
      company: this.companyName,
      description,
      url: job.absolute_url,
      location,
      remote: /remote/i.test(location || ''),
      employmentType,
      deadline: null, // Greenhouse rarely exposes an application deadline
      source: this.name,
      externalId: String(job.id),
    };
  }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000); // cap description length
}

function classifyEmploymentType(title) {
  const t = title.toLowerCase();
  if (/(intern|internship|co-op|coop)\b/.test(t)) return 'INTERNSHIP';
  if (/new grad|early career|university grad/.test(t)) return 'NEW_GRAD';
  return 'FULL_TIME';
}

module.exports = GreenhouseSource;
