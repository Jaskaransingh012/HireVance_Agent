const prisma = require('../db/prisma');
const { normalizeOpportunity } = require('./normalizationService');
const { upsertOpportunity } = require('./deduplicationService');
const { getAllActiveUsers } = require('./userService');
const { analyzeWithAI } = require('./aiService');
const { notifyUser } = require('./notificationService');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('discovery');

/**
 * Check if opportunity passes user's basic filters (pre-AI screening).
 * Returns { pass: boolean, reason?: string }.
 */
function passesBasicFilters(opportunity, user) {
  // Excluded companies are a hard no.
  if (
    user.excludedCompanies?.length &&
    user.excludedCompanies.some(
      (c) => c.toLowerCase() === (opportunity.company || '').toLowerCase()
    )
  ) {
    return { pass: false, reason: 'company excluded by user preferences' };
  }

  // Opportunity type filter, if the user restricted to specific types.
  if (
    user.desiredOpportunityTypes?.length &&
    !user.desiredOpportunityTypes.includes(opportunity.type)
  ) {
    return { pass: false, reason: 'opportunity type not desired by user' };
  }

  // Remote-only preference.
  if (user.remoteOnly && !opportunity.remote) {
    return { pass: false, reason: 'not remote and user requires remoteOnly' };
  }

  // Deadline already passed.
  if (opportunity.deadline && new Date(opportunity.deadline) < new Date()) {
    return { pass: false, reason: 'deadline has passed' };
  }

  // Location filter: if desiredLocations set, opportunity location (or
  // remote flag) must roughly match one of them.
  if (user.desiredLocations?.length && !opportunity.remote) {
    const loc = (opportunity.location || '').toLowerCase();
    const matches = user.desiredLocations.some((l) => loc.includes(l.toLowerCase()));
    if (!matches) {
      return { pass: false, reason: 'location not in user desired locations' };
    }
  }

  // Keyword/role filter: if desiredRoles or keywords set, title/description
  // must contain at least one, as a cheap relevance pre-screen. This is
  // intentionally permissive (OR match) - the AI does the nuanced scoring.
  const roleSignals = [...(user.desiredRoles || []), ...(user.keywords || [])];
  if (roleSignals.length) {
    const haystack = `${opportunity.title} ${opportunity.description || ''}`.toLowerCase();
    const matches = roleSignals.some((kw) => haystack.includes(kw.toLowerCase()));
    if (!matches) {
      return { pass: false, reason: 'no keyword/role match for user' };
    }
  }

  return { pass: true };
}

/**
 * Run the full pipeline for a single source. Failures for this source are
 * isolated here so that one bad source never stops the others (the caller,
 * runDiscoveryCycle, iterates sources independently).
 *
 * Now multi-user: for each new opportunity, check against ALL active users.
 */
async function runSource(source) {
  const stats = {
    source: source.name,
    found: 0,
    alreadyKnown: 0,
    new: 0,
    totalUsersChecked: 0,
    totalRejectedByFilter: 0,
    totalNotified: 0,
    errors: 0,
  };

  logger.info(`Checking ${source.name}`);
  const rawOpportunities = await source.discover(); // never throws - returns [] on failure
  stats.found = rawOpportunities.length;

  const users = await getAllActiveUsers();
  if (users.length === 0) {
    logger.info(`No active users - skipping notification flow for ${source.name}`);
  }

  for (const raw of rawOpportunities) {
    try {
      const normalized = normalizeOpportunity(raw);
      const { opportunity, isNew } = await upsertOpportunity(normalized);

      if (!isNew) {
        stats.alreadyKnown += 1;
        continue; // Already seen before - never re-notify any user, per requirements.
      }
      stats.new += 1;

      // For each active user, check if this opportunity is relevant to them
      for (const user of users) {
        stats.totalUsersChecked += 1;

        const filterResult = passesBasicFilters(opportunity, user);
        if (!filterResult.pass) {
          stats.totalRejectedByFilter += 1;
          logger.debug('Rejected by basic filter for user', {
            userId: user.id,
            title: opportunity.title,
            reason: filterResult.reason,
          });
          continue;
        }

        const analysis = await analyzeWithAI(opportunity, user);

        if (!analysis.shouldNotify || analysis.relevanceScore < user.minimumRelevanceScore) {
          logger.debug('AI declined to notify user', {
            userId: user.id,
            title: opportunity.title,
            score: analysis.relevanceScore,
            threshold: user.minimumRelevanceScore,
          });
          continue;
        }

        const sent = await notifyUser(user, opportunity, analysis);
        if (sent) stats.totalNotified += 1;
      }
    } catch (err) {
      stats.errors += 1;
      logger.error('Failed processing opportunity', { message: err.message });
      // Continue with the next opportunity - one bad record must not
      // abort the whole batch.
    }
  }

  await touchSourceLastChecked(source.name).catch(() => {});

  logger.info(
    `[${source.name}] found=${stats.found} new=${stats.new} known=${stats.alreadyKnown} ` +
    `usersChecked=${stats.totalUsersChecked} rejected=${stats.totalRejectedByFilter} ` +
    `notified=${stats.totalNotified} errors=${stats.errors}`
  );

  return stats;
}

async function touchSourceLastChecked(name) {
  await prisma.source.upsert({
    where: { name },
    update: { lastCheckedAt: new Date() },
    create: { name, url: '', type: 'jobs', lastCheckedAt: new Date() },
  });
}

/**
 * Run every enabled source of a given category ("jobs" | "hackathons").
 * Sources run sequentially to stay well within rate limits and keep
 * resource usage low on a small VPS; each is isolated via try/catch
 * inside runSource, so one failing source never blocks the rest.
 */
async function runDiscoveryCycle(sources) {
  const results = [];
  for (const source of sources) {
    try {
      results.push(await runSource(source));
    } catch (err) {
      // Should be unreachable since runSource isolates errors internally,
      // but guard anyway so the cycle always completes.
      logger.error(`Unexpected top-level failure for ${source.name}`, { message: err.message });
      results.push({ source: source.name, error: err.message });
    }
  }
  return results;
}

module.exports = { runSource, runDiscoveryCycle, passesBasicFilters };
