/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://intelliresume.net',
  generateRobotsTxt: false, // We've already created our custom robots.txt
  exclude: [
    '/admin/*',
    '/auth/*',
    '/resume-template-capture',
    '/resume-preview-capture',
    '/profile',
    '/resume/edit/*',
    '/builder/new',     // Exclude duplicate paths
    '/builder/import',  // Exclude duplicate paths
    '/builder/target'   // Exclude duplicate paths
  ],
  generateIndexSitemap: false,
  outDir: 'public',
  changefreq: 'weekly',
  priority: 0.7,
  transform: async (config, path) => {
    // Custom priority for specific pages
    if (path === '/') {
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      }
    }
    
    if (path === '/about' || path === '/subscription' || path === '/contact') {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      }
    }
    
    // Special priority for the canonical entry points
    if (path === '/new-resume-builder' || path === '/resume-import' || path === '/job-targeting') {
      return {
        loc: path,
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: new Date().toISOString(),
      }
    }

    // Default transformation for all other paths
    return {
      loc: path,
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date().toISOString(),
    }
  },
} 