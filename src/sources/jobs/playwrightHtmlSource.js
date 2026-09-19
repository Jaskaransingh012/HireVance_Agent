const BaseSource = require('../baseSource');
const { makeLogger } = require('../../utils/logger');
const config = require('../../config');

/**
 * Template source for career pages that render listings client-side with
 * JavaScript, where a plain HTTP GET (Cheerio) would return an empty shell.
 * Only use this when GenericHtmlSource genuinely doesn't work - it's slower
 * and heavier than a plain HTTP request.
 *
 * `chromium` is imported lazily so environments without Playwright browsers
 * installed don't crash at require-time; discover() will just fail cleanly
 * and get logged, without taking down the whole discovery cycle.
 *
 * Recipe shape mirrors GenericHtmlSource but selectors are evaluated in-page.
 */
class PlaywrightHtmlSource extends BaseSource {
  constructor(recipe) {
    super({ name: `playwright:${recipe.name}`, type: 'jobs' });
    this.recipe = recipe;
    this.logger = makeLogger(`source:${this.name}`);
  }

  async fetch() {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ userAgent: config.http.userAgent });
      const page = await context.newPage();
      await page.goto(this.recipe.url, {
        waitUntil: 'networkidle',
        timeout: config.http.timeoutMs,
      });
      // Give client-side rendering a moment if `waitUntil` fired early.
      await page.waitForSelector(this.recipe.listSelector, { timeout: 10000 }).catch(() => {});
      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }

  async parse(html) {
    // Reuse the same Cheerio-based parsing logic as GenericHtmlSource once
    // we have the fully-rendered HTML in hand.
    const GenericHtmlSource = require('./genericHtmlSource');
    const helper = new GenericHtmlSource(this.recipe);
    return helper.parse(html);
  }
}

module.exports = PlaywrightHtmlSource;
