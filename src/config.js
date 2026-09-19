require('dotenv').config();

function requireEnv(name, fallback = undefined) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://jobagent:jobagent@localhost:5432/jobagent'),

  // OpenRouter (OpenAI-compatible) LLM config
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    siteUrl: process.env.OPENROUTER_SITE_URL || 'https://github.com/job-agent',
    appName: process.env.OPENROUTER_APP_NAME || 'job-discovery-agent',
  },

  // WhatsApp Cloud API (Meta Graph API)
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'job_agent_verify_token_secure',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  },

  cron: {
    jobsInterval: process.env.JOBS_CRON || '*/30 * * * *',
    hackathonsInterval: process.env.HACKATHONS_CRON || '0 * * * *',
  },

  http: {
    timeoutMs: parseInt(process.env.HTTP_TIMEOUT_MS || '15000', 10),
    userAgent:
      process.env.HTTP_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 JobAgent/2.0',
  },
};

module.exports = config;
