const cheerio = require('cheerio');
const BaseSource = require('../baseSource');
const { getWithRetry } = require('../../utils/httpClient');

/**
 * Template source for a plain-HTML (non-JS-rendered) career page.
 * Uses Cheerio because a normal HTTP GET already returns the full listing
 * markup - no headless browser required.
 *
 * Configure via a small CSS-selector "recipe" per company so this one
 * class can be reused instead of writing bespoke scrapers everywhere.
 *
 * Example recipe:
 * {
 *   name: 'acme',
 *   companyName: 'Acme Corp',
 *   url: 'https://acme.example.com/careers',
 *   listSelector: '.job-listing',
 *   titleSelector: '.job-title',
 *   linkSelector: 'a',
 *   locationSelector: '.job-location',
 * }
 */
class GenericHtmlSource extends BaseSource {
  constructor(recipe) {
    super({ name: `html:${recipe.name}`, type: 'jobs' });
    this.recipe = recipe;
  }

  async fetch() {
    const res = await getWithRetry(this.recipe.url);
    return res.data;
  }

  async parse(html) {
    const $ = cheerio.load(html);
    const { listSelector, titleSelector, linkSelector, locationSelector } = this.recipe;
    const results = [];

    $(listSelector).each((_, el) => {
      const node = $(el);
      const title = node.find(titleSelector).first().text().trim();
      let href = node.find(linkSelector).first().attr('href') || '';
      const location = locationSelector ? node.find(locationSelector).first().text().trim() : null;

      if (!title || !href) return;

      // Resolve relative URLs against the source page.
      try {
        href = new URL(href, this.recipe.url).toString();
      } catch {
        return;
      }

      results.push({
        type: /intern/i.test(title) ? 'INTERNSHIP' : 'JOB',
        title,
        company: this.recipe.companyName,
        description: null,
        url: href,
        location: location || null,
        remote: /remote/i.test(location || ''),
        employmentType: /intern/i.test(title) ? 'INTERNSHIP' : 'FULL_TIME',
        deadline: null,
        source: this.name,
        externalId: null,
      });
    });

    return results;
  }
}

module.exports = GenericHtmlSource;
