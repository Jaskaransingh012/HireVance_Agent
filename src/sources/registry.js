const GreenhouseSource = require('./jobs/greenhouseSource');
const LeverSource = require('./jobs/leverSource');
const DevpostSource = require('./hackathons/devpostSource');
const DevfolioSource = require('./hackathons/devfolioSource');
const MLHSource = require('./hackathons/mlhSource');
const UnstopSource = require('./hackathons/unstopSource');
const DoraHacksSource = require('./hackathons/doraHacksSource');

/**
 * Central place to enable/disable/add sources. Add a new company to a
 * job board simply by adding another entry below - no other code changes
 * needed. Board tokens/slugs are public identifiers, not secrets.
 */
const JOB_SOURCES = [
  new GreenhouseSource({ boardToken: 'stripe', companyName: 'Stripe' }),
  new GreenhouseSource({ boardToken: 'airbnb', companyName: 'Airbnb' }),
  new GreenhouseSource({ boardToken: 'openai', companyName: 'OpenAI' }),
  new GreenhouseSource({ boardToken: 'anthropic', companyName: 'Anthropic' }),
  new LeverSource({ companySlug: 'netflix', companyName: 'Netflix' }),
  new LeverSource({ companySlug: 'reddit', companyName: 'Reddit' }),
  // Add more Greenhouse/Lever companies here, or GenericHtmlSource /
  // PlaywrightHtmlSource instances for career pages without a public API.
];

const HACKATHON_SOURCES = [
  new DevpostSource({ maxPages: 3 }), // Devpost - global hackathons
  new DevfolioSource({ maxPages: 2 }), // Devfolio - India & global
  new MLHSource({ season: '2026' }), // Major League Hacking - student hackathons
  new UnstopSource({ category: 'hackathons' }), // Unstop (Dare2Compete) - India-focused
  new DoraHacksSource({ limit: 20 }), // DoraHacks - Web3 & AI hackathons
];

module.exports = { JOB_SOURCES, HACKATHON_SOURCES };
