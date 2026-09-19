const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

describe('Conversation Service & Domain Restriction', () => {
  let fakePrisma;
  let userService;
  let conversationService;
  let sentMessages = [];

  beforeEach(() => {
    fakePrisma = injectFakePrisma();
    sentMessages = [];

    // Mock whatsappService
    const whatsappServicePath = require.resolve('../src/services/whatsappService');
    require.cache[whatsappServicePath] = {
      id: whatsappServicePath,
      filename: whatsappServicePath,
      loaded: true,
      exports: {
        sendWhatsAppMessage: async (to, text) => {
          sentMessages.push({ to, text });
          return { ok: true };
        },
        verifyWebhook: () => {},
        extractIncomingMessages: () => [],
      },
    };

    userService = require('../src/services/userService');
    conversationService = require('../src/services/conversationService');
  });

  test('handles "help" command instantly without calling LLM', async () => {
    await conversationService.handleIncomingMessage('+14155552671', 'help');
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Welcome to Job & Hackathon Agent/i);
    assert.match(sentMessages[0].text, /Helpful Commands/i);
  });

  test('handles "status" command returning current preferences', async () => {
    await userService.getOrCreateUser('+14155552671');
    await userService.updateUserPreferences('+14155552671', {
      desiredRoles: ['Frontend Engineer'],
      keywords: ['react', 'nextjs'],
      remoteOnly: true,
    });

    await conversationService.handleIncomingMessage('+14155552671', 'status');
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0].text, /Frontend Engineer/);
    assert.match(sentMessages[0].text, /react, nextjs/);
    assert.match(sentMessages[0].text, /Remote Only/);
  });

  test('handles "pause" and "resume" commands', async () => {
    await userService.getOrCreateUser('+14155552671');

    await conversationService.handleIncomingMessage('+14155552671', 'pause');
    let user = await userService.getUserByPhoneNumber('+14155552671');
    assert.equal(user.isActive, false);
    assert.match(sentMessages[0].text, /Alerts Paused/);

    await conversationService.handleIncomingMessage('+14155552671', 'resume');
    user = await userService.getUserByPhoneNumber('+14155552671');
    assert.equal(user.isActive, true);
    assert.match(sentMessages[1].text, /Alerts Resumed/);
  });

  test('handles "clear" command to reset filters', async () => {
    await userService.getOrCreateUser('+14155552671');
    await userService.updateUserPreferences('+14155552671', {
      desiredRoles: ['Backend'],
      keywords: ['golang'],
    });

    await conversationService.handleIncomingMessage('+14155552671', 'clear');
    const user = await userService.getUserByPhoneNumber('+14155552671');
    assert.deepEqual(user.desiredRoles, []);
    assert.deepEqual(user.keywords, []);
    assert.match(sentMessages[0].text, /Filters Cleared/);
  });
});
