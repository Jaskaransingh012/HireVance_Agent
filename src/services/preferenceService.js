const prisma = require('../db/prisma');

let cachedPreferences = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Load the single UserPreference row (creating a permissive default if
 * none exists yet), with a short in-memory cache since it's read on every
 * discovered opportunity.
 */
async function getPreferences() {
  const now = Date.now();
  if (cachedPreferences && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedPreferences;
  }

  let prefs = await prisma.userPreference.findFirst();
  if (!prefs) {
    prefs = await prisma.userPreference.create({ data: {} });
  }

  cachedPreferences = prefs;
  cacheLoadedAt = now;
  return prefs;
}

function invalidateCache() {
  cachedPreferences = null;
}

/**
 * Deterministic, cheap filters applied BEFORE any OpenAI call.
 * Returns { pass: boolean, reason?: string }.
 */
function passesBasicFilters(opportunity, prefs) {
  // Excluded companies are a hard no.
  if (
    prefs.excludedCompanies?.length &&
    prefs.excludedCompanies.some(
      (c) => c.toLowerCase() === (opportunity.company || '').toLowerCase()
    )
  ) {
    return { pass: false, reason: 'company excluded by preferences' };
  }

  // Opportunity type filter, if the user restricted to specific types.
  if (
    prefs.desiredOpportunityTypes?.length &&
    !prefs.desiredOpportunityTypes.includes(opportunity.type)
  ) {
    return { pass: false, reason: 'opportunity type not desired' };
  }

  // Remote-only preference.
  if (prefs.remoteOnly && !opportunity.remote) {
    return { pass: false, reason: 'not remote and remoteOnly is set' };
  }

  // Deadline already passed.
  if (opportunity.deadline && new Date(opportunity.deadline) < new Date()) {
    return { pass: false, reason: 'deadline has passed' };
  }

  // Location filter: if desiredLocations set, opportunity location (or
  // remote flag) must roughly match one of them.
  if (prefs.desiredLocations?.length && !opportunity.remote) {
    const loc = (opportunity.location || '').toLowerCase();
    const matches = prefs.desiredLocations.some((l) => loc.includes(l.toLowerCase()));
    if (!matches) {
      return { pass: false, reason: 'location not desired' };
    }
  }

  // Keyword/role filter: if desiredRoles or keywords set, title/description
  // must contain at least one, as a cheap relevance pre-screen. This is
  // intentionally permissive (OR match) - the AI does the nuanced scoring.
  const roleSignals = [...(prefs.desiredRoles || []), ...(prefs.keywords || [])];
  if (roleSignals.length) {
    const haystack = `${opportunity.title} ${opportunity.description || ''}`.toLowerCase();
    const matches = roleSignals.some((kw) => haystack.includes(kw.toLowerCase()));
    if (!matches) {
      return { pass: false, reason: 'no keyword/role match' };
    }
  }

  return { pass: true };
}

module.exports = { getPreferences, invalidateCache, passesBasicFilters };
