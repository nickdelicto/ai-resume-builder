// This file replaces sitemap.xml.js to avoid conflicts with the static sitemap.xml in public folder
// The functionality remains the same but is now accessed at /sitemap-generator

import { getAllPostPaths } from '../lib/blog/api';

/**
 * Generates a sitemap XML for the website
 * This is a dynamic sitemap that includes all blog posts
 */
export default function SitemapGenerator() {
  // This component doesn't render anything visible
  return null;
}

/**
 * getServerSideProps generates the sitemap on each request
 */
export async function getServerSideProps({ res }) {
  // Base URL from environment or default
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
  
  // Get all blog post paths
  const blogPaths = await getAllPostPaths();
  
  // Static routes
  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/resume-builder',
    '/blog',
    '/blog/resume-examples',
    '/blog/job-descriptions',
    '/blog/career-advice',
  ];
  
  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticRoutes
    .map((route) => {
      return `
    <url>
      <loc>${baseUrl}${route}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>${route === '' ? '1.0' : '0.8'}</priority>
    </url>
  `;
    })
    .join('')}
  ${blogPaths
    .map(({ params }) => {
      return `
    <url>
      <loc>${baseUrl}/blog/${params.category}/${params.slug}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>
  `;
    })
    .join('')}
</urlset>`;

  // Set response headers
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600');
  
  // Write the XML to the response
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
} 