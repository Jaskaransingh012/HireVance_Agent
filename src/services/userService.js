const prisma = require('../db/prisma');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('user');

/**
 * Get or create a user by phone number. Phone numbers should be in
 * international format (E.164), e.g. "+14155552671" or "14155552671".
 */
async function getOrCreateUser(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);

  let user = await prisma.user.findUnique({
    where: { phoneNumber: normalized },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: normalized,
        lastMessageAt: new Date(),
      },
    });
    logger.info('New user created', { phoneNumber: normalized, userId: user.id });
  }

  return user;
}

/**
 * Update user preferences with new values (merge operation).
 */
async function updateUserPreferences(phoneNumber, preferences) {
  const normalized = normalizePhoneNumber(phoneNumber);

  const user = await prisma.user.update({
    where: { phoneNumber: normalized },
    data: {
      ...preferences,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    },
  });

  logger.info('User preferences updated', { phoneNumber: normalized, userId: user.id });
  return user;
}

/**
 * Get all active users for the discovery pipeline.
 */
async function getAllActiveUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
  });
}

/**
 * Get a single user by phone number.
 */
async function getUserByPhoneNumber(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  return prisma.user.findUnique({
    where: { phoneNumber: normalized },
  });
}

/**
 * Update user's lastMessageAt timestamp.
 */
async function touchUser(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  await prisma.user.update({
    where: { phoneNumber: normalized },
    data: { lastMessageAt: new Date() },
  });
}

/**
 * Deactivate a user (they can still reactivate by messaging again).
 */
async function deactivateUser(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  await prisma.user.update({
    where: { phoneNumber: normalized },
    data: { isActive: false },
  });
  logger.info('User deactivated', { phoneNumber: normalized });
}

/**
 * Reactivate a user.
 */
async function activateUser(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  await prisma.user.update({
    where: { phoneNumber: normalized },
    data: { isActive: true, lastMessageAt: new Date() },
  });
  logger.info('User reactivated', { phoneNumber: normalized });
}

/**
 * Normalize phone number to a consistent format.
 * Strips "whatsapp:" prefix if present, ensures it starts with "+".
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';

  // Remove "whatsapp:" prefix if present
  let normalized = phoneNumber.replace(/^whatsapp:/i, '').trim();

  // Ensure it starts with "+"
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }

  return normalized;
}

/**
 * Check if user preferences pass basic validation/completeness.
 * Returns { valid: boolean, reason?: string }.
 */
function validatePreferences(user) {
  if (!user.desiredRoles?.length && !user.keywords?.length && !user.desiredOpportunityTypes?.length) {
    return {
      valid: false,
      reason: 'No preferences set - need at least roles, keywords, or opportunity types',
    };
  }
  return { valid: true };
}

module.exports = {
  getOrCreateUser,
  updateUserPreferences,
  getAllActiveUsers,
  getUserByPhoneNumber,
  touchUser,
  deactivateUser,
  activateUser,
  normalizePhoneNumber,
  validatePreferences,
};
