const BaseSource = require('../baseSource');
const cheerio = require('cheerio');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Unstop (formerly Dare2Compete) is a huge platform for student competitions,
 * hiring challenges, case competitions, and hackathons.
 */
class UnstopSource extends BaseSource {
  constructor({ category = 'hackathons' } = {}) {
    super({ name: `unstop:${category}`, type: 'hackathons' });
    this.category = category;
  }

  async fetch() {
    // Unstop explore page for hackathons & competitions
    const url = 'https://unstop.com/hackathons';
    const res = await getWithRetry(url);
    return res.data;
  }

  async parse(html) {
    const $ = cheerio.load(html);
    const results = [];

    // Parse competition and hackathon cards
    $('a[href*="/competitions/"], a[href*="/hackathons/"]').each((_, el) => {
      const node = $(el);
      const href = node.attr('href');
      if (!href) return;

      const fullUrl = href.startsWith('http') ? href : `https://unstop.com${href}`;
      const title = node.find('h2, h3, .heading, strong').first().text().trim();
      const org = node.find('.org-name, .sub-heading').first().text().trim();

      if (!title || title.length < 3) return;

      results.push({
        type: 'HACKATHON',
        title,
        company: org || 'Unstop',
        description: `Unstop competition / hackathon`,
        url: fullUrl,
        location: 'Online / Global',
        remote: true,
        employmentType: null,
        deadline: null,
        source: this.name,
        externalId: href,
        organizer: org || 'Unstop',
      });
    });

    return results;
  }
}

module.exports = UnstopSource;
