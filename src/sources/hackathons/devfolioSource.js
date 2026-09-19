const BaseSource = require('../baseSource');
const cheerio = require('cheerio');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Devfolio is a popular hackathon platform in India and globally.
 * Their public explore page lists open hackathons.
 */
class DevfolioSource extends BaseSource {
  constructor({ maxPages = 2 } = {}) {
    super({ name: 'devfolio', type: 'hackathons' });
    this.maxPages = maxPages;
  }

  async fetch() {
    // Devfolio's explore page - we'll scrape the HTML
    const url = 'https://devfolio.co/hackathons';
    const res = await getWithRetry(url);
    return res.data;
  }

  async parse(html) {
    const $ = cheerio.load(html);
    const hackathons = [];

    // Devfolio uses cards with specific classes (may need updates if they change their frontend)
    // Looking for hackathon cards on their explore page
    $('a[href*="/hackathons/"]').each((_, el) => {
      const card = $(el);
      const href = card.attr('href');
      if (!href || href === '/hackathons') return;

      const fullUrl = href.startsWith('http') ? href : `https://devfolio.co${href}`;

      // Try to extract title from card content
      const title = card.find('h3, h2, [class*="title"]').first().text().trim() ||
                    card.text().trim().split('\n')[0];

      if (!title || title.length < 3) return;

      // Extract dates if available
      const dateText = card.find('[class*="date"], time').text().trim();

      hackathons.push({
        type: 'HACKATHON',
        title,
        company: 'Devfolio',
        description: `Listed on Devfolio hackathon platform`,
        url: fullUrl,
        location: 'Online', // Most Devfolio hackathons are online
        remote: true,
        employmentType: null,
        deadline: null, // Would need to parse dateText more carefully
        source: this.name,
        externalId: extractIdFromUrl(fullUrl),
        organizer: 'Devfolio',
      });
    });

    return hackathons;
  }
}

function extractIdFromUrl(url) {
  const match = url.match(/hackathons\/([^/?]+)/);
  return match ? match[1] : null;
}

module.exports = DevfolioSource;
