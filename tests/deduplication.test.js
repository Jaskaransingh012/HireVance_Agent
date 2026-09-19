const test = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');
const { normalizeOpportunity } = require('../src/services/normalizationService');

function sampleRaw(overrides = {}) {
  return {
    type: 'INTERNSHIP',
    title: 'Software Engineer Intern',
    company: 'Stripe',
    description: 'Great internship',
    url: 'https://stripe.com/job/123?utm_source=linkedin',
    location: 'Remote',
    remote: true,
    employmentType: 'INTERNSHIP',
    deadline: null,
    source: 'greenhouse:stripe',
    externalId: '123',
    ...overrides,
  };
}

test('same opportunity discovered twice -> only one database record', async () => {
  injectFakePrisma();
  const { upsertOpportunity } = require('../src/services/deduplicationService');

  const first = normalizeOpportunity(sampleRaw());
  const second = normalizeOpportunity(sampleRaw({ url: 'https://stripe.com/job/123' })); // no utm

  const r1 = await upsertOpportunity(first);
  const r2 = await upsertOpportunity(second);

  assert.equal(r1.isNew, true);
  assert.equal(r2.isNew, false);
  assert.equal(r1.opportunity.id, r2.opportunity.id);
});

test('opportunity with tracking params is treated as same opportunity', async () => {
  injectFakePrisma();
  const { upsertOpportunity } = require('../src/services/deduplicationService');

  const withUtm = normalizeOpportunity(
    sampleRaw({ url: 'https://stripe.com/job/123?utm_source=linkedin&utm_campaign=x' })
  );
  const withoutUtm = normalizeOpportunity(sampleRaw({ url: 'https://stripe.com/job/123' }));

  assert.equal(withUtm.canonicalUrl, withoutUtm.canonicalUrl);
  assert.equal(withUtm.fingerprint, withoutUtm.fingerprint);
});

test('same opportunity discovered 10 times -> upsert always resolves to one row', async () => {
  injectFakePrisma();
  const { upsertOpportunity } = require('../src/services/deduplicationService');

  let firstId = null;
  let newCount = 0;
  for (let i = 0; i < 10; i += 1) {
    const normalized = normalizeOpportunity(sampleRaw());
    const { opportunity, isNew } = await upsertOpportunity(normalized);
    if (isNew) newCount += 1;
    if (!firstId) firstId = opportunity.id;
    assert.equal(opportunity.id, firstId);
  }
  assert.equal(newCount, 1);
});

test('two concurrent workers processing the same new opportunity -> one create wins, one falls back to existing', async () => {
  const fake = injectFakePrisma();
  const { upsertOpportunity } = require('../src/services/deduplicationService');

  const normalized = normalizeOpportunity(sampleRaw());

  const [r1, r2] = await Promise.all([
    upsertOpportunity(normalized),
    upsertOpportunity(normalized),
  ]);

  const newFlags = [r1.isNew, r2.isNew].filter(Boolean);
  assert.equal(newFlags.length, 1, 'exactly one of the two concurrent upserts should be "new"');
  assert.equal(fake._internal.opportunities.length, 1);
});
