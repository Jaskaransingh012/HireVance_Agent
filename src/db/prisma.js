const { PrismaClient } = require('@prisma/client');

// Single shared PrismaClient instance for the whole process.
// Avoids exhausting Postgres connections when reused across modules,
// and survives node --watch reloads via the global cache trick.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
