FROM node:20-slim AS base

# Playwright needs a handful of OS libs to run headless Chromium.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --omit=dev \
    && npx prisma generate \
    && npx playwright install --with-deps chromium

COPY src ./src

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
