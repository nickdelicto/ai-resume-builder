import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

/**
 * Base Meta component for server-side rendering
 * @param {Object} props - Component props
 * @param {string} props.title - Page title (55-60 chars max)
 * @param {string} props.description - Page description (150-160 chars max)
 * @param {string} props.canonicalUrl - Override for canonical URL
 * @param {string} props.ogImage - Custom OG image path
 * @param {string} props.ogType - Open Graph type (default: website)
 * @param {Array} props.keywords - SEO keywords
 */
const MetaBase = ({ 
  title = "IntelliResume Health | Free RN-Only Job Board", 
  description = "Find your next RN job here. Free RN-only Job Board! Direct nursing positions from Cleveland Clinic, Northwell Health, Adventist & more top hospitals.",
  canonicalUrl,
  ogImage = "/og-image-jobs.png",
  ogType = "website",
  keywords = "RN jobs, nursing jobs, registered nurse jobs, free nursing job board, hospital jobs, nursing careers, direct employer jobs"
}) => {
  // Ensure title is not too long (55-60 chars max)
  const formattedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  
  // Ensure description is optimal length (150-160 chars)
  const formattedDescription = description.length > 160 ? description.substring(0, 157) + '...' : description;
  
  // Generate canonical URL - use provided URL or default to site root
  const siteUrl = "https://intelliresume.net";
  const canonical = canonicalUrl || siteUrl;

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{formattedTitle}</title>
      <meta name="title" content={formattedTitle} />
      <meta name="description" content={formattedDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={formattedTitle} />
      <meta property="og:description" content={formattedDescription} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonical} />
      <meta property="twitter:title" content={formattedTitle} />
      <meta property="twitter:description" content={formattedDescription} />
      <meta property="twitter:image" content={`${siteUrl}${ogImage}`} />
    </Head>
  );
};

/**
 * Client-side component that enhances canonical URLs with current path
 */
const MetaCanonical = (props) => {
  // Import router inside component to avoid SSR issues
  const { useRouter } = require('next/router');
  const router = useRouter();
  const currentPath = router.asPath;
  
  // Generate canonical URL with current path
  const siteUrl = "https://intelliresume.net";
  const canonical = props.canonicalUrl || `${siteUrl}${currentPath === '/' ? '' : currentPath}`;
  
  // Only render the canonical link
  return (
    <Head>
      <link rel="canonical" href={canonical} key="canonical" />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta property="twitter:url" content={canonical} key="twitter:url" />
    </Head>
  );
};

// Import the client component dynamically with ssr: false
const DynamicCanonical = dynamic(
  () => Promise.resolve(MetaCanonical),
  { ssr: false }
);

/**
 * Meta component that combines server and client rendering
 */
const Meta = (props) => {
  return (
    <>
      <MetaBase {...props} />
      <DynamicCanonical {...props} />
    </>
  );
};

export default Meta; 