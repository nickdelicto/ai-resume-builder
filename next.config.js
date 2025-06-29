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
}

module.exports = nextConfig 