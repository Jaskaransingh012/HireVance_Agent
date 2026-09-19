const express = require('express');
const config = require('./config');
const prisma = require('./db/prisma');
const { startScheduler } = require('./scheduler/scheduler');
const { verifyWebhook, extractIncomingMessages } = require('./services/whatsappService');
const { handleIncomingMessage } = require('./services/conversationService');
const { makeLogger } = require('./utils/logger');

const logger = makeLogger('server');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
  } catch (err) {
    logger.error('Health check failed', { message: err.message });
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// WhatsApp webhook verification (GET /webhook) - Meta calls this to verify your endpoint
app.get('/webhook', (req, res) => {
  verifyWebhook(req, res);
});

// WhatsApp incoming message handler (POST /webhook) - Meta sends user messages here
app.post('/webhook', async (req, res) => {
  // Immediately respond 200 to Meta to prevent retries
  res.sendStatus(200);

  try {
    const messages = extractIncomingMessages(req.body);

    if (messages.length === 0) {
      logger.debug('Webhook received but no text messages found', { body: req.body });
      return;
    }

    // Process each incoming message asynchronously (don't block webhook response)
    for (const msg of messages) {
      logger.info('Incoming WhatsApp message', {
        from: msg.from,
        messageId: msg.messageId,
        name: msg.name,
      });

      // Handle in background - don't await (already sent 200 to Meta)
      handleIncomingMessage(msg.from, msg.text, msg.name).catch((err) => {
        logger.error('Failed to handle incoming message', {
          from: msg.from,
          error: err.message,
        });
      });
    }
  } catch (err) {
    logger.error('Webhook processing error', { message: err.message });
  }
});

// List discovered opportunities (paginated)
app.get('/opportunities', async (req, res) => {
  try {
    const { type, status, limit = '50', offset = '0' } = req.query;
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 50, 200),
      skip: parseInt(offset, 10) || 0,
    });

    res.json({ count: opportunities.length, opportunities });
  } catch (err) {
    logger.error('GET /opportunities failed', { message: err.message });
    res.status(500).json({ error: 'internal_error' });
  }
});

// Stats endpoint
app.get('/stats', async (_req, res) => {
  try {
    const [totalOpportunities, totalUsers, totalNotifications, byType, bySource] = await Promise.all([
      prisma.opportunity.count(),
      prisma.user.count(),
      prisma.notification.count({ where: { status: 'SENT' } }),
      prisma.opportunity.groupBy({ by: ['type'], _count: true }),
      prisma.opportunity.groupBy({ by: ['source'], _count: true }),
    ]);

    res.json({
      totalOpportunities,
      totalUsers,
      totalNotificationsSent: totalNotifications,
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count])),
      bySource: Object.fromEntries(bySource.map((r) => [r.source, r._count])),
    });
  } catch (err) {
    logger.error('GET /stats failed', { message: err.message });
    res.status(500).json({ error: 'internal_error' });
  }
});

// Admin: List all users
app.get('/admin/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        isActive: true,
        desiredRoles: true,
        keywords: true,
        desiredOpportunityTypes: true,
        remoteOnly: true,
        onboardedAt: true,
        lastMessageAt: true,
      },
    });
    res.json({ count: users.length, users });
  } catch (err) {
    logger.error('GET /admin/users failed', { message: err.message });
    res.status(500).json({ error: 'internal_error' });
  }
});

// Admin: Trigger discovery manually (for testing)
app.post('/admin/trigger', async (_req, res) => {
  try {
    const { discoverJobs, discoverHackathons } = require('./scheduler/scheduler');

    // Fire both in background
    discoverJobs().catch((err) => logger.error('Manual jobs discovery failed', { message: err.message }));
    discoverHackathons().catch((err) => logger.error('Manual hackathons discovery failed', { message: err.message }));

    res.json({ status: 'triggered', message: 'Discovery cycles started in background' });
  } catch (err) {
    logger.error('POST /admin/trigger failed', { message: err.message });
    res.status(500).json({ error: 'internal_error' });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  res.status(500).json({ error: 'internal_error' });
});

function start() {
  app.listen(config.port, () => {
    logger.info(`🚀 Job Agent Server listening on port ${config.port}`);
    logger.info(`📱 WhatsApp webhook ready at /webhook`);
    logger.info(`🔍 Starting discovery scheduler...`);
    startScheduler();
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
