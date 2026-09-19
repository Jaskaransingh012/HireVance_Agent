const test = require('node:test');
const assert = require('node:assert/strict');
const { injectFakePrisma } = require('./helpers/injectFakePrisma');

injectFakePrisma(); // passesBasicFilters is pure, but discoveryService requires db/prisma at module load
const { passesBasicFilters } = require('../src/services/discoveryService');

function baseUser(overrides = {}) {
  return {
    desiredRoles: [],
    desiredLocations: [],
    desiredOpportunityTypes: [],
    excludedCompanies: [],
    remoteOnly: false,
    minimumRelevanceScore: 80,
    keywords: [],
    ...overrides,
  };
}

function baseOpportunity(overrides = {}) {
  return {
    type: 'INTERNSHIP',
    title: 'Software Engineer Intern',
    company: 'Stripe',
    location: 'Remote',
    remote: true,
    deadline: null,
    description: 'Backend internship',
    ...overrides,
  };
}

test('rejects senior role when user only wants internships (via keyword mismatch)', () => {
  const user = baseUser({ keywords: ['intern'] });
  const opp = baseOpportunity({
    title: 'Senior Software Engineer',
    type: 'JOB',
    description: 'Lead our backend platform team',
  });
  const result = passesBasicFilters(opp, user);
  assert.equal(result.pass, false);
});

test('rejects opportunity with passed deadline', () => {
  const user = baseUser();
  const opp = baseOpportunity({ deadline: new Date('2020-01-01') });
  const result = passesBasicFilters(opp, user);
  assert.equal(result.pass, false);
  assert.match(result.reason, /deadline/);
});

test('rejects excluded company', () => {
  const user = baseUser({ excludedCompanies: ['Stripe'] });
  const opp = baseOpportunity();
  const result = passesBasicFilters(opp, user);
  assert.equal(result.pass, false);
  assert.match(result.reason, /excluded/);
});

test('rejects non-remote when remoteOnly is set', () => {
  const user = baseUser({ remoteOnly: true });
  const opp = baseOpportunity({ remote: false, location: 'New York' });
  const result = passesBasicFilters(opp, user);
  assert.equal(result.pass, false);
});

test('passes a clean matching opportunity', () => {
  const user = baseUser({ keywords: ['software'] });
  const opp = baseOpportunity();
  const result = passesBasicFilters(opp, user);
  assert.equal(result.pass, true);
});
