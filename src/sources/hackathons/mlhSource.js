const BaseSource = require('../baseSource');
const cheerio = require('cheerio');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Major League Hacking (MLH) is the official student hackathon league.
 * Their season events page lists upcoming student hackathons worldwide.
 */
class MLHSource extends BaseSource {
  constructor({ season = '2026' } = {}) {
    super({ name: `mlh:${season}`, type: 'hackathons' });
    this.season = season;
  }

  async fetch() {
    const url = `https://mlh.io/seasons/${this.season}/events`;
    const res = await getWithRetry(url);
    return res.data;
  }

  async parse(html) {
    const $ = cheerio.load(html);
    const hackathons = [];

    $('.event-wrapper, .event').each((_, el) => {
      const node = $(el);
      const title = node.find('.event-name, h3').first().text().trim();
      const href = node.find('a[href]').first().attr('href');
      const location = node.find('.event-location, [itemprop="address"]').text().trim();
      const date = node.find('.event-date, time').text().trim();

      if (!title || !href) return;

      const isDigital = /digital|online|virtual/i.test(location);

      hackathons.push({
        type: 'HACKATHON',
        title,
        company: 'Major League Hacking (MLH)',
        description: `MLH Member Event (${date || 'Upcoming'})`,
        url: href,
        location: location || 'Global',
        remote: isDigital,
        employmentType: null,
        deadline: null,
        source: this.name,
        externalId: href,
        organizer: 'MLH',
      });
    });

    return hackathons;
  }
}

module.exports = MLHSource;
