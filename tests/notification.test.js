const test = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

function fakeAnalysis() {
  return { relevanceScore: 90, companyQualityScore: 85, shouldNotify: true, reason: 'Great fit' };
}

test('same opportunity found 10 times -> only one NEW notification sent per user', async () => {
  const fake = injectFakePrisma();
  const userService = require('../src/services/userService');
  const { notifyUser } = require('../src/services/notificationService');

  const user = await userService.getOrCreateUser('+14155552671');
  const opportunity = { id: 'opp_1', type: 'INTERNSHIP', title: 'SWE Intern', company: 'Stripe', url: 'https://x', remote: true };

  let sentCount = 0;
  for (let i = 0; i < 10; i += 1) {
    const sent = await notifyUser(user, opportunity, fakeAnalysis());
    if (sent) sentCount += 1;
  }

  assert.equal(sentCount, 1);
  assert.equal(fake._internal.notifications.length, 1);
});

test('two workers processing the same opportunity simultaneously for same user -> only one notification', async () => {
  const fake = injectFakePrisma();
  const userService = require('../src/services/userService');
  const { notifyUser } = require('../src/services/notificationService');

  const user = await userService.getOrCreateUser('+14155552671');
  const opportunity = { id: 'opp_race', type: 'JOB', title: 'Backend Engineer', company: 'Acme', url: 'https://x', remote: false };

  const [r1, r2] = await Promise.all([
    notifyUser(user, opportunity, fakeAnalysis()),
    notifyUser(user, opportunity, fakeAnalysis()),
  ]);

  const sentFlags = [r1, r2].filter(Boolean);
  assert.equal(sentFlags.length, 1);
  assert.equal(fake._internal.notifications.length, 1);
});

test('restart simulation: reservation already exists in DB -> no duplicate notification after restart', async () => {
  const fake = injectFakePrisma();
  const userService = require('../src/services/userService');
  const { notifyUser } = require('../src/services/notificationService');

  const user = await userService.getOrCreateUser('+14155552671');
  const opportunity = { id: 'opp_restart', type: 'JOB', title: 'Frontend Engineer', company: 'Acme', url: 'https://x', remote: false };

  // Simulate a notification already recorded from "before the restart".
  await fake.notification.create({
    data: { opportunityId: opportunity.id, userId: user.id, channel: 'whatsapp', type: 'NEW', status: 'SENT' },
  });

  const sent = await notifyUser(user, opportunity, fakeAnalysis());
  assert.equal(sent, false, 'should not re-notify after a simulated restart');
  assert.equal(fake._internal.notifications.length, 1);
});
