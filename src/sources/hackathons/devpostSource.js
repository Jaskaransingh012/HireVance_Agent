const BaseSource = require('../baseSource');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Devpost's own frontend calls a JSON endpoint to list open hackathons:
 *   https://devpost.com/api/hackathons?status[]=open&order_by=recently-added
 * This is plain JSON, so no Playwright/Cheerio is needed.
 */
class DevpostSource extends BaseSource {
  constructor({ maxPages = 2 } = {}) {
    super({ name: 'devpost', type: 'hackathons' });
    this.maxPages = maxPages;
  }

  async fetch() {
    const pages = [];
    for (let page = 1; page <= this.maxPages; page += 1) {
      const url = `https://devpost.com/api/hackathons?status[]=open&order_by=recently-added&page=${page}`;
      const res = await getWithRetry(url);
      const list = res.data?.hackathons || [];
      pages.push(...list);
      if (list.length === 0) break;
    }
    return pages;
  }

  async parse(raw) {
    const hackathons = Array.isArray(raw) ? raw : [];
    return hackathons.map((h) => this._toOpportunity(h)).filter(Boolean);
  }

  _toOpportunity(h) {
    if (!h?.url || !h?.title) return null;

    const organizer = h.organization_name || 'Devpost';
    const isOnline = h.displayed_location?.location?.toLowerCase().includes('online');

    return {
      type: 'HACKATHON',
      title: String(h.title).trim(),
      company: organizer,
      description: h.themes?.map((t) => t.name).join(', ') || null,
      url: h.url,
      location: h.displayed_location?.location || 'Online',
      remote: !!isOnline,
      employmentType: null,
      deadline: h.submission_period_dates || null,
      startDate: h.time_left_to_submission ? null : h.submission_period_dates, // best-effort; refined by AI if needed
      source: this.name,
      externalId: String(h.id),
      organizer,
    };
  }
}

module.exports = DevpostSource;
