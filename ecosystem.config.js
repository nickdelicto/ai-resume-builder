module.exports = {
  apps: [
    {
      name: 'scraper-worker',
      script: 'scripts/scraper-worker.js',
      cwd: '/home/delicto/apps/ai-resume-builder',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
