const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

describe('Multi-User Notification Deduplication', () => {
  let fakePrisma;
  let userService;
  let notificationService;
  let deduplicationService;

  beforeEach(() => {
    fakePrisma = injectFakePrisma();
    userService = require('../src/services/userService');
    notificationService = require('../src/services/notificationService');
    deduplicationService = require('../src/services/deduplicationService');
  });

  test('same opportunity notifies multiple users with different preferences', async () => {
    // Create two users
    const user1 = await userService.getOrCreateUser('+14155552671');
    const user2 = await userService.getOrCreateUser('+447700900077');

    // Create an opportunity
    const { opportunity } = await deduplicationService.upsertOpportunity({
      type: 'JOB',
      title: 'Backend Engineer',
      company: 'Acme Corp',
      description: 'Build scalable systems',
      url: 'https://example.com/job/123',
      canonicalUrl: 'https://example.com/job/123',
      location: 'Remote',
      remote: true,
      employmentType: 'FULL_TIME',
      deadline: null,
      source: 'test',
      externalId: 'test-123',
      fingerprint: 'abc123',
    });

    // Reserve notifications for both users
    const reservation1 = await notificationService.reserveNotificationSlot(opportunity.id, user1.id);
    const reservation2 = await notificationService.reserveNotificationSlot(opportunity.id, user2.id);

    assert.ok(reservation1, 'User1 should get a notification slot');
    assert.ok(reservation2, 'User2 should get a notification slot');
    assert.notEqual(reservation1.id, reservation2.id, 'Each user gets a distinct notification');

    // Try to reserve again for user1 (should fail, no double notifications)
    const duplicateReservation = await notificationService.reserveNotificationSlot(opportunity.id, user1.id);
    assert.equal(duplicateReservation, null, 'Duplicate reservation for same user should be rejected');

    assert.equal(fakePrisma._internal.notifications.length, 2);
  });

  test('concurrent workers discover same opportunity for same user - only one notification', async () => {
    const user = await userService.getOrCreateUser('+14155552671');

    const { opportunity } = await deduplicationService.upsertOpportunity({
      type: 'HACKATHON',
      title: 'AI Hackathon',
      company: 'Devpost',
      description: 'Build AI apps',
      url: 'https://devpost.com/hackathon/ai-2026',
      canonicalUrl: 'https://devpost.com/hackathon/ai-2026',
      location: 'Online',
      remote: true,
      employmentType: null,
      deadline: new Date('2026-12-31'),
      source: 'devpost',
      externalId: 'ai-2026',
      fingerprint: 'def456',
    });

    // Simulate two workers racing to notify the same user
    const [res1, res2] = await Promise.all([
      notificationService.reserveNotificationSlot(opportunity.id, user.id),
      notificationService.reserveNotificationSlot(opportunity.id, user.id),
    ]);

    // One succeeds, one gets null (unique constraint prevents double insert)
    const succeeded = [res1, res2].filter(Boolean);
    assert.equal(succeeded.length, 1, 'Only one worker should successfully reserve the notification slot');
    assert.equal(fakePrisma._internal.notifications.length, 1);
  });

  test('user deactivates and reactivates - no duplicate notifications on restart', async () => {
    const user = await userService.getOrCreateUser('+14155552671');
    await userService.updateUserPreferences('+14155552671', {
      desiredRoles: ['Engineer'],
      keywords: ['backend'],
    });

    const { opportunity } = await deduplicationService.upsertOpportunity({
      type: 'JOB',
      title: 'Backend Engineer',
      company: 'Test Corp',
      description: 'Backend role',
      url: 'https://example.com/job/456',
      canonicalUrl: 'https://example.com/job/456',
      location: 'SF',
      remote: false,
      employmentType: 'FULL_TIME',
      deadline: null,
      source: 'test',
      externalId: 'test-456',
      fingerprint: 'ghi789',
    });

    // First notification
    const res1 = await notificationService.reserveNotificationSlot(opportunity.id, user.id);
    assert.ok(res1);

    // User pauses
    await userService.deactivateUser('+14155552671');

    // Simulate restart: user reactivates
    await userService.activateUser('+14155552671');

    // Try to notify again (should be rejected - already notified)
    const res2 = await notificationService.reserveNotificationSlot(opportunity.id, user.id);
    assert.equal(res2, null, 'Should not notify twice even after pause/resume');
  });
});
