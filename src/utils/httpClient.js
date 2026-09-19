const axios = require('axios');
const config = require('../config');
const { makeLogger } = require('./logger');

const logger = makeLogger('http');

const client = axios.create({
  timeout: config.http.timeoutMs,
  headers: {
    'User-Agent': config.http.userAgent,
    Accept: 'application/json, text/html, */*',
  },
});

/**
 * GET with basic retry/backoff for transient failures (timeouts, 429, 5xx).
 * Non-transient errors (4xx other than 429) fail fast.
 */
async function getWithRetry(url, { retries = 2, backoffMs = 1000, ...axiosOpts } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await client.get(url, axiosOpts);
    } catch (err) {
      const status = err.response?.status;
      const transient = !status || status === 429 || status >= 500;
      attempt += 1;
      if (!transient || attempt > retries) {
        logger.warn(`GET failed (attempt ${attempt})`, { url, status: status || 'timeout' });
        throw err;
      }
      logger.warn(`GET failed, retrying (attempt ${attempt}/${retries})`, {
        url,
        status: status || 'timeout',
      });
      await new Promise((res) => setTimeout(res, backoffMs * attempt));
    }
  }
}

module.exports = { client, getWithRetry };
