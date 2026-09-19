const test = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

test('irrelevant opportunity is rejected before reaching AI (no AI call, no notification)', async () => {
  const fake = injectFakePrisma();
  const userService = require('../src/services/userService');

  // Mock aiService to detect whether it was ever invoked.
  const aiServicePath = require.resolve('../src/services/aiService');
  let aiCalled = false;
  require.cache[aiServicePath] = {
    id: aiServicePath,
    filename: aiServicePath,
    loaded: true,
    exports: {
      analyzeWithAI: async () => {
        aiCalled = true;
        return { relevanceScore: 100, companyQualityScore: 100, shouldNotify: true, reason: 'x' };
      },
    },
  };

  // Seed user with excluded company
  await userService.getOrCreateUser('+14155552671');
  await userService.updateUserPreferences('+14155552671', {
    excludedCompanies: ['ExcludedCorp'],
  });

  const { runSource } = require('../src/services/discoveryService');

  // Fake source returning one opportunity from an excluded company.
  const fakeSource = {
    name: 'fake-source',
    discover: async () => [
      {
        type: 'JOB',
        title: 'Backend Engineer',
        company: 'ExcludedCorp',
        url: 'https://excludedcorp.example.com/job/1',
        location: 'Remote',
        remote: true,
        source: 'fake-source',
      },
    ],
  };

  const stats = await runSource(fakeSource);

  assert.equal(aiCalled, false, 'AI should never be called for a deterministically-rejected opportunity');
  assert.equal(stats.totalNotified, 0);
  assert.equal(stats.totalRejectedByFilter, 1);
});
