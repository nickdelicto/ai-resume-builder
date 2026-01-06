/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // Exclude the _app_reference directory from the build
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'].filter(ext => !ext.includes('_app_reference')),

  async redirects() {
    return [
      // Removed blog articles - redirect to their categories
      {
        source: '/blog/healthcare/nurse-practitioner-resume-example',
        destination: '/blog/resume-examples',
        permanent: true,
      },
      {
        source: '/blog/resume-examples/nurse-practitioner-resume-example',
        destination: '/blog/resume-examples',
        permanent: true,
      },
      {
        source: '/blog/career-advice/interview-preparation-tips',
        destination: '/blog/career-advice',
        permanent: true,
      },
      {
        source: '/blog/career-advice/job-interview-tips',
        destination: '/blog/career-advice',
        permanent: true,
      },
      {
        source: '/blog/technology/data-analyst-job-description',
        destination: '/blog/job-descriptions',
        permanent: true,
      },
      {
        source: '/blog/marketing/marketing-manager-resume',
        destination: '/blog/resume-examples',
        permanent: true,
      },
      // Handle URLs with encoded quotes
      {
        source: '/blog/%22:category%22/%22:slug%22',
        destination: '/blog/:category/:slug',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig 