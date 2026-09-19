const path = require('path');
const { makeFakePrisma } = require('./fakePrisma');

/**
 * Replaces the shared prisma module in Node's require cache with a fresh
 * fake instance, and clears any already-cached service modules that hold
 * a reference to it, so `require('../src/services/...')` inside a test
 * file gets wired to the fake DB instead of trying to hit real Postgres.
 */
function injectFakePrisma() {
  const prismaPath = require.resolve('../../src/db/prisma');
  const fake = makeFakePrisma();
  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: fake,
  };

  // Bust cache for modules that require prisma directly or transitively,
  // so they re-require and pick up the fake instance above.
  const srcDir = path.resolve(__dirname, '../../src');
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(srcDir) && key !== prismaPath) {
      delete require.cache[key];
    }
  }

  return fake;
}

module.exports = { injectFakePrisma };
