const prisma = require('../db/prisma');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('dedup');

/**
 * Given a normalized opportunity, either:
 *  - find the existing DB row (by fingerprint, then canonicalUrl, then
 *    source+externalId as a fallback) and bump lastSeenAt, or
 *  - create a new row.
 *
 * Returns { opportunity, isNew }.
 *
 * The fingerprint column has a UNIQUE constraint, so even if two workers
 * race to insert the same new opportunity simultaneously, only one insert
 * succeeds; the loser catches the unique-violation and re-fetches instead.
 */
async function upsertOpportunity(normalized) {
  const existing = await findExisting(normalized);

  if (existing) {
    const updated = await prisma.opportunity.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
    return { opportunity: updated, isNew: false };
  }

  try {
    const created = await prisma.opportunity.create({ data: normalized });
    logger.debug('Created new opportunity', { id: created.id, title: created.title });
    return { opportunity: created, isNew: true };
  } catch (err) {
    // P2002 = unique constraint violation (fingerprint or canonicalUrl).
    // This means a concurrent process just inserted the same opportunity -
    // treat it as "already known", not an error.
    if (err.code === 'P2002') {
      const raceWinner = await findExisting(normalized);
      if (raceWinner) {
        return { opportunity: raceWinner, isNew: false };
      }
    }
    throw err;
  }
}

async function findExisting(normalized) {
  // 1. Fingerprint is the strongest signal (content-based identity).
  let found = await prisma.opportunity.findUnique({
    where: { fingerprint: normalized.fingerprint },
  });
  if (found) return found;

  // 2. Canonical URL catches cases where content changed slightly but
  //    it's clearly the same posting (e.g. title edited).
  found = await prisma.opportunity.findUnique({
    where: { canonicalUrl: normalized.canonicalUrl },
  });
  if (found) return found;

  // 3. Source + externalId, when the source provides a stable ID.
  if (normalized.externalId) {
    found = await prisma.opportunity.findFirst({
      where: { source: normalized.source, externalId: normalized.externalId },
    });
    if (found) return found;
  }

  return null;
}

module.exports = { upsertOpportunity };
