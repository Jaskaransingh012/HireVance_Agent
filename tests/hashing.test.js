const test = require('node:test');
const assert = require('node:assert/strict');
const { fingerprintJob, fingerprintHackathon } = require('../src/utils/hashing');

test('same job fields produce same fingerprint regardless of casing/whitespace', () => {
  const a = fingerprintJob({
    company: 'Stripe',
    title: 'Software Engineer Intern',
    location: 'Remote',
    employmentType: 'INTERNSHIP',
  });
  const b = fingerprintJob({
    company: '  stripe ',
    title: 'software engineer   intern',
    location: 'remote',
    employmentType: 'internship',
  });
  assert.equal(a, b);
});

test('different jobs produce different fingerprints', () => {
  const a = fingerprintJob({
    company: 'Stripe',
    title: 'Software Engineer Intern',
    location: 'Remote',
    employmentType: 'INTERNSHIP',
  });
  const b = fingerprintJob({
    company: 'Airbnb',
    title: 'Software Engineer Intern',
    location: 'Remote',
    employmentType: 'INTERNSHIP',
  });
  assert.notEqual(a, b);
});

test('hackathon fingerprint uses organizer + title + startDate (day precision)', () => {
  const a = fingerprintHackathon({
    organizer: 'Devpost',
    title: 'AI Hack Week',
    startDate: '2026-10-20T09:00:00Z',
  });
  const b = fingerprintHackathon({
    organizer: 'Devpost',
    title: 'AI Hack Week',
    startDate: '2026-10-20T15:30:00Z',
  });
  assert.equal(a, b, 'same day should produce same fingerprint regardless of time');
});
