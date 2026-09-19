const cron = require('node-cron');
const config = require('../config');
const { runDiscoveryCycle } = require('../services/discoveryService');
const { JOB_SOURCES, HACKATHON_SOURCES } = require('../sources/registry');
const { makeLogger } = require('../utils/logger');

const logger = makeLogger('scheduler');

// Guards against overlapping runs: if a cycle takes longer than its own
// interval (e.g. many sources, slow network), the next cron tick skips
// instead of stacking concurrent runs against the same DB/OpenAI/Telegram.
let jobsRunning = false;
let hackathonsRunning = false;

async function discoverJobs() {
  if (jobsRunning) {
    logger.warn('Previous jobs discovery cycle still running - skipping this tick');
    return;
  }
  jobsRunning = true;
  try {
    await runDiscoveryCycle(JOB_SOURCES);
  } catch (err) {
    logger.error('Jobs discovery cycle failed', { message: err.message });
  } finally {
    jobsRunning = false;
  }
}

async function discoverHackathons() {
  if (hackathonsRunning) {
    logger.warn('Previous hackathons discovery cycle still running - skipping this tick');
    return;
  }
  hackathonsRunning = true;
  try {
    await runDiscoveryCycle(HACKATHON_SOURCES);
  } catch (err) {
    logger.error('Hackathons discovery cycle failed', { message: err.message });
  } finally {
    hackathonsRunning = false;
  }
}

function startScheduler() {
  cron.schedule(config.cron.jobsInterval, discoverJobs);
  cron.schedule(config.cron.hackathonsInterval, discoverHackathons);

  logger.info('Scheduler started', {
    jobsInterval: config.cron.jobsInterval,
    hackathonsInterval: config.cron.hackathonsInterval,
  });

  // Kick off an initial run shortly after boot so the agent doesn't sit
  // idle until the first cron tick (useful after a restart/deploy too).
  setTimeout(() => {
    discoverJobs();
    discoverHackathons();
  }, 5000);
}

module.exports = { startScheduler, discoverJobs, discoverHackathons };
