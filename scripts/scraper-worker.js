const { Worker } = require('bullmq');
const { spawn } = require('child_process');
const path = require('path');
const { sendAlert } = require('../lib/services/alertService');

const connection = {
  host: 'localhost',
  port: 6379,
};

const SCRAPER_MAP = {
  'uhs': 'scrape-and-classify.sh uhs',
  'adventist-healthcare': 'scrape-and-classify.sh adventist-healthcare',
  'cleveland-clinic': 'scrape-and-classify.sh cleveland-clinic',
  'guthrie': 'scrape-and-classify.sh guthrie',
  'hartford-healthcare': 'scrape-and-classify.sh hartford-healthcare',
  'mass-general-brigham': 'scrape-and-classify.sh mass-general-brigham',
  'mount-sinai': 'scrape-and-classify.sh mount-sinai',
  'northwell-health': 'scrape-and-classify.sh northwell-health',
  'nyc-health-hospitals': 'scrape-and-classify.sh nyc-health-hospitals',
  'nyu-langone-health': 'scrape-and-classify.sh nyu-langone-health',
  'strong-memorial-hospital': 'scrape-and-classify.sh strong-memorial-hospital',
  'upstate-medical-university': 'scrape-and-classify.sh upstate-medical-university',
  'yale-new-haven-health': 'scrape-and-classify.sh yale-new-haven-health',
  'newyork-presbyterian': 'scrape-and-classify.sh newyork-presbyterian',
  'montefiore-einstein': 'scrape-and-classify.sh montefiore-einstein',
  'kaleida-health': 'scrape-and-classify.sh kaleida-health',
  'hackensack-meridian-health': 'scrape-and-classify.sh hackensack-meridian-health',
  'centene': 'scrape-and-classify.sh centene',
  'unitedhealthgroup': 'scrape-and-classify.sh unitedhealthgroup',
};

const scriptsDir = path.join(__dirname);

function runScraper(employer) {
  return new Promise((resolve, reject) => {
    const scraperCmd = SCRAPER_MAP[employer];
    if (!scraperCmd) {
      return reject(new Error('Unknown employer: ' + employer));
    }

    const parts = scraperCmd.split(' ');
    const script = parts[0];
    const args = parts.slice(1);
    const scriptPath = path.join(scriptsDir, script);

    console.log('[' + new Date().toISOString() + '] Starting: ' + employer);
    console.log('  Command: bash ' + scriptPath + ' ' + args.join(' '));

    const proc = spawn('bash', [scriptPath].concat(args), {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
    });

    proc.on('close', function(code) {
      if (code === 0) {
        console.log('[' + new Date().toISOString() + '] Completed: ' + employer);
        resolve();
      } else {
        reject(new Error('Scraper ' + employer + ' exited with code ' + code));
      }
    });

    proc.on('error', function(err) {
      reject(err);
    });
  });
}

const worker = new Worker(
  'scraper-jobs',
  async function(job) {
    const employer = job.data.employer;
    console.log('\n' + '='.repeat(60));
    console.log('Processing job: ' + job.id + ' - ' + employer);
    console.log('='.repeat(60) + '\n');

    await runScraper(employer);
  },
  {
    connection: connection,
    concurrency: 2,
    // Long-running scrapers (Cleveland Clinic, Hartford) can take 90+ minutes
    // Default lock is 30s which causes false "stalled" failures
    // Set to 2 hours to handle even the slowest scrapers
    lockDuration: 7200000, // 2 hours in milliseconds
  }
);

worker.on('completed', function(job) {
  console.log('Job ' + job.id + ' (' + job.data.employer + ') completed');
});

worker.on('failed', async function(job, err) {
  const employer = job.data.employer;
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const attempts = job.attemptsMade || 1;
  const maxAttempts = job.opts?.attempts || 4;
  const willRetry = attempts < maxAttempts;

  console.error('Job ' + job.id + ' (' + employer + ') failed:', err.message);

  // Send email alert
  const subject = `Scraper Failed: ${employer}` + (willRetry ? ' (will retry)' : ' (FINAL)');
  const body = `
SCRAPER FAILURE ALERT
=====================

Employer:     ${employer}
Job ID:       ${job.id}
Time (EST):   ${timestamp}
Attempt:      ${attempts}/${maxAttempts}
Will Retry:   ${willRetry ? 'Yes' : 'NO - Final failure'}

ERROR:
${err.message}

COMMANDS TO INVESTIGATE:
------------------------
# Check the log file:
cat logs/${employer}_scraper_*.log | tail -50

# Manual retry:
node scripts/scraper-scheduler.js ${employer}

# Check queue status:
redis-cli LLEN bull:scraper-jobs:wait
redis-cli ZCARD bull:scraper-jobs:failed
`.trim();

  try {
    await sendAlert(subject, body);
  } catch (emailErr) {
    console.error('Failed to send alert email:', emailErr.message);
  }
  
});

worker.on('error', function(err) {
  console.error('Worker error:', err);
});

console.log('Scraper worker started, waiting for jobs...');
console.log('   Queue: scraper-jobs');
console.log('   Concurrency: 2');
console.log('   Available employers: ' + Object.keys(SCRAPER_MAP).join(', '));
