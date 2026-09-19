const BaseSource = require('../baseSource');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * DoraHacks is a major global Web3 & Open-Source AI Hackathon platform.
 * Their public JSON API provides open hackathon grants and events.
 */
class DoraHacksSource extends BaseSource {
  constructor({ limit = 20 } = {}) {
    super({ name: 'dorahacks', type: 'hackathons' });
    this.limit = limit;
  }

  async fetch() {
    // DoraHacks public hackathons endpoint
    const url = `https://dorahacks.io/api/hackathons?page=1&size=${this.limit}&status=active`;
    try {
      const res = await getWithRetry(url);
      return res.data;
    } catch {
      // Fallback or empty if API format changes
      return [];
    }
  }

  async parse(raw) {
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return list.map((h) => this._toOpportunity(h)).filter(Boolean);
  }

  _toOpportunity(h) {
    if (!h?.name && !h?.title) return null;

    const title = String(h.name || h.title).trim();
    const slug = h.slug || h.id;
    const url = h.url || (slug ? `https://dorahacks.io/hackathon/${slug}/detail` : null);
    if (!url) return null;

    return {
      type: 'HACKATHON',
      title,
      company: h.organizer || 'DoraHacks',
      description: h.description ? String(h.description).slice(0, 500) : 'Global Web3 & AI Hackathon on DoraHacks',
      url,
      location: 'Online / Global',
      remote: true,
      employmentType: null,
      deadline: h.endTime || h.deadline || null,
      source: this.name,
      externalId: String(h.id || slug),
      organizer: h.organizer || 'DoraHacks',
    };
  }
}

module.exports = DoraHacksSource;
