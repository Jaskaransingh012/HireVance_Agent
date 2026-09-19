const prisma = require('../db/prisma');
const { sendWhatsAppMessage } = require('./whatsappService');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('notify');

/**
 * Reserve a "NEW" notification slot for this opportunity + user combo BEFORE
 * sending anything. The (opportunityId, userId, channel, type) unique constraint
 * means that if two workers race here, only one create() succeeds - the other
 * gets a P2002 error and simply skips sending. This is what makes the
 * "two workers, one notification per user" guarantee hold even under real
 * concurrency, not just sequential calls.
 */
async function reserveNotificationSlot(opportunityId, userId, channel = 'whatsapp', type = 'NEW') {
  try {
    const reservation = await prisma.notification.create({
      data: { opportunityId, userId, channel, type, status: 'PENDING' },
    });
    return reservation;
  } catch (err) {
    if (err.code === 'P2002') {
      logger.debug('Notification already reserved/sent for this user, skipping', { opportunityId, userId });
      return null;
    }
    throw err;
  }
}

async function markNotificationStatus(id, status) {
  await prisma.notification.update({
    where: { id },
    data: { status, sentAt: status === 'SENT' ? new Date() : null },
  });
}

function formatJobMessage(opportunity, analysis, user) {
  const emoji = opportunity.type === 'INTERNSHIP' ? '🎓' : '💼';
  const deadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';

  return [
    `${emoji} *NEW ${opportunity.type.toUpperCase()}*`,
    '',
    `*${opportunity.company}*`,
    `_${opportunity.title}_`,
    '',
    `📍 ${opportunity.remote ? '🌐 Remote' : opportunity.location || 'Location unspecified'}`,
    `⭐ *Match Score:* ${analysis.relevanceScore}/100`,
    `🏢 *Company Rating:* ${analysis.companyQualityScore}/100`,
    '',
    `💡 *Why it's relevant:*`,
    analysis.reason,
    '',
    `⏰ *Deadline:* ${deadline}`,
    '',
    '🔗 *Apply Now*',
    opportunity.url,
  ].join('\n');
}

function formatHackathonMessage(opportunity, analysis, user) {
  const deadline = opportunity.deadline
    ? new Date(opportunity.deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Check event page';

  return [
    '🏆 *NEW HACKATHON*',
    '',
    `*${opportunity.title}*`,
    opportunity.company ? `_Organized by ${opportunity.company}_` : '',
    '',
    `📍 ${opportunity.remote ? '🌐 Online' : opportunity.location || 'Location unspecified'}`,
    `⭐ *Match Score:* ${analysis.relevanceScore}/100`,
    '',
    `💡 *Why it's relevant:*`,
    analysis.reason,
    '',
    `⏰ *Registration Deadline:* ${deadline}`,
    '',
    '🔗 *Register Now*',
    opportunity.url,
  ].join('\n');
}

/**
 * Full notify flow for a single user: reserve slot -> send -> mark sent/failed.
 * Returns true if a notification was actually sent, false if skipped
 * (already notified) or failed.
 */
async function notifyUser(user, opportunity, analysis) {
  const reservation = await reserveNotificationSlot(opportunity.id, user.id);
  if (!reservation) {
    return false; // Another worker already claimed this notification for this user.
  }

  const message =
    opportunity.type === 'HACKATHON' || opportunity.type === 'COMPETITION'
      ? formatHackathonMessage(opportunity, analysis, user)
      : formatJobMessage(opportunity, analysis, user);

  try {
    await sendWhatsAppMessage(user.phoneNumber, message);
    await markNotificationStatus(reservation.id, 'SENT');
    logger.info('Notification sent', {
      userId: user.id,
      phoneNumber: user.phoneNumber,
      opportunityId: opportunity.id,
      title: opportunity.title,
    });
    return true;
  } catch (err) {
    logger.error('WhatsApp send failed', { userId: user.id, message: err.message });
    await markNotificationStatus(reservation.id, 'FAILED');
    return false;
  }
}

module.exports = {
  notifyUser,
  reserveNotificationSlot,
  markNotificationStatus,
  formatJobMessage,
  formatHackathonMessage,
};
