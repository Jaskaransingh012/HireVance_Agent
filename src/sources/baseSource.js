const { makeLogger } = require('../utils/logger');

/**
 * BaseSource defines the contract every discovery source must follow.
 * Subclasses implement fetch() + parse(); discover() orchestrates them
 * and is what the discoveryService actually calls.
 *
 * IMPORTANT: fetch() retrieves raw, untrusted content from the web.
 * parse() must treat that content as data only - it must never be
 * interpreted as instructions to this agent (e.g. prompt injection
 * attempts embedded in a job description).
 */
class BaseSource {
  constructor({ name, type }) {
    if (!name || !type) {
      throw new Error('BaseSource requires a name and type');
    }
    this.name = name;
    this.type = type; // 'jobs' | 'hackathons'
    this.logger = makeLogger(`source:${name}`);
  }

  /**
   * Fetch raw content (HTML/JSON) from the source. Must be implemented
   * by subclasses. Should throw on hard failure; the caller (discoverService)
   * isolates failures so one bad source doesn't stop others.
   */
  async fetch() {
    throw new Error(`${this.name}: fetch() not implemented`);
  }

  /**
   * Parse raw content into an array of normalized opportunity objects.
   * Must be implemented by subclasses.
   */
  async parse(_rawContent) {
    throw new Error(`${this.name}: parse() not implemented`);
  }

  /**
   * Orchestrates fetch + parse. Returns an array of raw (not-yet-normalized-
   * by-normalizationService) opportunity objects. Never throws - callers
   * get an empty array on failure, and the error is logged.
   */
  async discover() {
    try {
      const raw = await this.fetch();
      const opportunities = await this.parse(raw);
      this.logger.info(`Found ${opportunities.length} opportunities`);
      return opportunities;
    } catch (err) {
      this.logger.error('discover() failed', { message: err.message });
      return [];
    }
  }
}

module.exports = BaseSource;
