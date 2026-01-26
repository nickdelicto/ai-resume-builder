const { Queue } = require('bullmq');

const connection = {
  host: 'localhost',
  port: 6379,
};

const queue = new Queue('scraper-jobs', { connection: connection });

const ALL_EMPLOYERS = [
  'uhs',
  'adventist-healthcare',
  'cleveland-clinic',
  'guthrie',
  'hartford-healthcare',
  'mass-general-brigham',
  'northwell-health',
  'nyu-langone-health',
  'strong-memorial-hospital',
  'upstate-medical-university',
  'yale-new-haven-health',
];

async function scheduleAllScrapers() {
  console.log('Scheduling scraper jobs for all employers...');
  console.log('Date: ' + new Date().toISOString());
  console.log('');

  for (const employer of ALL_EMPLOYERS) {
    const job = await queue.add(
      'scrape-' + employer,
      { employer: employer },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
      }
    );
    console.log('  Added job: ' + job.id + ' - ' + employer);
  }

  console.log('');
  console.log('Total jobs scheduled: ' + ALL_EMPLOYERS.length);
  console.log('Jobs will be processed by the worker in order.');

  await queue.close();
}

async function scheduleOne(employer) {
  console.log('Scheduling single scraper job: ' + employer);

  const job = await queue.add(
    'scrape-' + employer,
    { employer: employer },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 60000,
      },
    }
  );

  console.log('Added job: ' + job.id);
  await queue.close();
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--all') {
  scheduleAllScrapers();
} else {
  scheduleOne(args[0]);
}
