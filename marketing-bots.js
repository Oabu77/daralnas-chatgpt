#!/usr/bin/env node
/**
 * Marketing Bots Orchestrator
 * Runs email campaigns and social content generation on a schedule.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const LOG_DIR = path.join(ROOT_DIR, 'logs/production');
const LOG_FILE = path.join(LOG_DIR, 'marketing-bots.log');

const EMAIL_INTERVAL_MINUTES = parseInt(process.env.BOT_EMAIL_INTERVAL_MINUTES || '360', 10); // 6 hours
const SOCIAL_INTERVAL_MINUTES = parseInt(process.env.BOT_SOCIAL_INTERVAL_MINUTES || '720', 10); // 12 hours

const EMAIL_CAMPAIGNS = [
  'enterprise_outreach',
  'developer_pitch',
  'startup_offer'
];

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(message);
}

function runNodeScript(script, args = [], extraEnv = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, ...extraEnv };
    const child = execFile('node', [script, ...args], { cwd: ROOT_DIR, env }, (err, stdout, stderr) => {
      if (stdout) log(stdout.trim());
      if (stderr) log(stderr.trim());
      if (err) log(`ERROR running ${script}: ${err.message}`);
      resolve();
    });

    child.on('error', (error) => {
      log(`FAILED to start ${script}: ${error.message}`);
      resolve();
    });
  });
}

async function runEmailCampaigns() {
  log('Starting email campaign cycle (dry-run)...');
  for (const campaign of EMAIL_CAMPAIGNS) {
    await runNodeScript('email-campaign.js', ['--campaign', campaign], { DRY_RUN: '1' });
  }
  log('Email campaign cycle complete.');
}

async function runSocialGenerator() {
  log('Starting social media generation cycle...');
  await runNodeScript('social-media-generator.js', ['--generate'], {});
  log('Social media generation complete.');
}

function scheduleJobs() {
  const emailIntervalMs = EMAIL_INTERVAL_MINUTES * 60 * 1000;
  const socialIntervalMs = SOCIAL_INTERVAL_MINUTES * 60 * 1000;

  setInterval(runEmailCampaigns, emailIntervalMs);
  setInterval(runSocialGenerator, socialIntervalMs);

  log(`Scheduled email campaigns every ${EMAIL_INTERVAL_MINUTES} minutes.`);
  log(`Scheduled social generation every ${SOCIAL_INTERVAL_MINUTES} minutes.`);
}

async function bootstrap() {
  ensureLogDir();
  log('Marketing bots starting...');

  await runEmailCampaigns();
  await runSocialGenerator();

  scheduleJobs();
}

bootstrap();
