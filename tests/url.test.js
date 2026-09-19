const test = require('node:test');
const assert = require('node:assert/strict');
const { canonicalizeUrl } = require('../src/utils/url');

test('strips utm tracking params', () => {
  const a = canonicalizeUrl('https://example.com/job/123?utm_source=linkedin');
  const b = canonicalizeUrl('https://example.com/job/123');
  assert.equal(a, b);
});

test('strips fragments', () => {
  const a = canonicalizeUrl('https://example.com/job/123#apply');
  const b = canonicalizeUrl('https://example.com/job/123');
  assert.equal(a, b);
});

test('removes trailing slash', () => {
  const a = canonicalizeUrl('https://example.com/job/123/');
  const b = canonicalizeUrl('https://example.com/job/123');
  assert.equal(a, b);
});

test('keeps meaningful query params', () => {
  const a = canonicalizeUrl('https://example.com/job?id=123');
  const b = canonicalizeUrl('https://example.com/job?id=456');
  assert.notEqual(a, b);
});

test('lowercases host', () => {
  const a = canonicalizeUrl('https://Example.COM/job/123');
  const b = canonicalizeUrl('https://example.com/job/123');
  assert.equal(a, b);
});
