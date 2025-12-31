/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Use only the pages directory for routing
  // In Next.js 14.2+ we don't need appDir: false
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },

  // 301 Redirects for old specialty slugs (after normalization migration)
  async redirects() {
    return [
      // Step Down → Stepdown
      {
        source: '/jobs/nursing/specialty/step-down',
        destination: '/jobs/nursing/specialty/stepdown',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/step-down',
        destination: '/jobs/nursing/:state/stepdown',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/step-down',
        destination: '/jobs/nursing/:state/:city/stepdown',
        permanent: true,
      },

      // L&D → Labor & Delivery (l-d → labor-delivery)
      {
        source: '/jobs/nursing/specialty/l-d',
        destination: '/jobs/nursing/specialty/labor-delivery',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/l-d',
        destination: '/jobs/nursing/:state/labor-delivery',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/l-d',
        destination: '/jobs/nursing/:state/:city/labor-delivery',
        permanent: true,
      },

      // Psychiatric → Mental Health
      {
        source: '/jobs/nursing/specialty/psychiatric',
        destination: '/jobs/nursing/specialty/mental-health',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/psychiatric',
        destination: '/jobs/nursing/:state/mental-health',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/psychiatric',
        destination: '/jobs/nursing/:state/:city/mental-health',
        permanent: true,
      },

      // Rehab → Rehabilitation
      {
        source: '/jobs/nursing/specialty/rehab',
        destination: '/jobs/nursing/specialty/rehabilitation',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/rehab',
        destination: '/jobs/nursing/:state/rehabilitation',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/rehab',
        destination: '/jobs/nursing/:state/:city/rehabilitation',
        permanent: true,
      },

      // Cardiac Care → Cardiac
      {
        source: '/jobs/nursing/specialty/cardiac-care',
        destination: '/jobs/nursing/specialty/cardiac',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/cardiac-care',
        destination: '/jobs/nursing/:state/cardiac',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/cardiac-care',
        destination: '/jobs/nursing/:state/:city/cardiac',
        permanent: true,
      },

      // Progressive Care → Stepdown
      {
        source: '/jobs/nursing/specialty/progressive-care',
        destination: '/jobs/nursing/specialty/stepdown',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/progressive-care',
        destination: '/jobs/nursing/:state/stepdown',
        permanent: true,
      },
      {
        source: '/jobs/nursing/:state/:city/progressive-care',
        destination: '/jobs/nursing/:state/:city/stepdown',
        permanent: true,
      },
    ];
  },
}

export default nextConfig;