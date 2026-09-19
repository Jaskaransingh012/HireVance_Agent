const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

describe('User Service & Multi-User Management', () => {
  let fakePrisma;
  let userService;

  beforeEach(() => {
    fakePrisma = injectFakePrisma();
    userService = require('../src/services/userService');
  });

  test('creates new user on first message and normalizes phone number', async () => {
    const user = await userService.getOrCreateUser('+14155552671');
    assert.equal(user.phoneNumber, '+14155552671');
    assert.equal(user.isActive, true);
    assert.equal(fakePrisma._internal.users.length, 1);

    // Strips whatsapp: prefix if present
    const user2 = await userService.getOrCreateUser('whatsapp:+447700900077');
    assert.equal(user2.phoneNumber, '+447700900077');
    assert.equal(fakePrisma._internal.users.length, 2);
  });

  test('returns existing user if already present (idempotent)', async () => {
    const u1 = await userService.getOrCreateUser('+14155552671');
    const u2 = await userService.getOrCreateUser('+14155552671');
    assert.equal(u1.id, u2.id);
    assert.equal(fakePrisma._internal.users.length, 1);
  });

  test('updates user preferences accurately', async () => {
    await userService.getOrCreateUser('+14155552671');
    const updated = await userService.updateUserPreferences('+14155552671', {
      desiredRoles: ['Backend Engineer', 'AI Engineer'],
      keywords: ['nodejs', 'python', 'fastapi'],
      remoteOnly: true,
      minimumRelevanceScore: 85,
    });

    assert.deepEqual(updated.desiredRoles, ['Backend Engineer', 'AI Engineer']);
    assert.deepEqual(updated.keywords, ['nodejs', 'python', 'fastapi']);
    assert.equal(updated.remoteOnly, true);
    assert.equal(updated.minimumRelevanceScore, 85);
  });

  test('pause and resume toggles isActive correctly', async () => {
    await userService.getOrCreateUser('+14155552671');
    await userService.deactivateUser('+14155552671');

    let activeUsers = await userService.getAllActiveUsers();
    assert.equal(activeUsers.length, 0);

    await userService.activateUser('+14155552671');
    activeUsers = await userService.getAllActiveUsers();
    assert.equal(activeUsers.length, 1);
    assert.equal(activeUsers[0].phoneNumber, '+14155552671');
  });
});
