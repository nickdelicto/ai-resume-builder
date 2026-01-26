const { Worker } = require('bullmq');
const { spawn } = require('child_process');
const path = require('path');

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
  'northwell-health': 'scrape-and-classify.sh northwell-health',
  'nyu-langone-health': 'scrape-and-classify.sh nyu-langone-health',
  'strong-memorial-hospital': 'scrape-and-classify.sh strong-memorial-hospital',
  'upstate-medical-university': 'scrape-and-classify.sh upstate-medical-university',
  'yale-new-haven-health': 'scrape-and-classify.sh yale-new-haven-health',
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
  }
);

worker.on('completed', function(job) {
  console.log('Job ' + job.id + ' (' + job.data.employer + ') completed');
});

worker.on('failed', function(job, err) {
  console.error('Job ' + job.id + ' (' + job.data.employer + ') failed:', err.message);
});

worker.on('error', function(err) {
  console.error('Worker error:', err);
});

console.log('Scraper worker started, waiting for jobs...');
console.log('   Queue: scraper-jobs');
console.log('   Concurrency: 2');
console.log('   Available employers: ' + Object.keys(SCRAPER_MAP).join(', '));
