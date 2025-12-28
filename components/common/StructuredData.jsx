import React from 'react';
import dynamic from 'next/dynamic';

/**
 * StructuredData - JSON-LD schema markup for RN job board
 * Provides machine-readable data for search engines (Google, Bing)
 * Focused on RN job board functionality - no resume builder references
 */

// Server-side safe version that doesn't use router
const StructuredDataSSR = () => {
  // Organization schema - Describes IntelliResume Health as an RN job board
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "IntelliResume Health",
    "url": "https://intelliresume.net",
    "logo": "https://intelliresume.net/logo.svg",
    "description": "Free RN-only job board featuring direct nursing positions from top hospitals like Cleveland Clinic, Northwell Health, and Adventist Health.",
    "sameAs": [
      "https://x.com/intelliresume",
      "https://linkedin.com/company/intelliresume",
      "https://facebook.com/intelliresume"
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "US"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "url": "https://intelliresume.net/contact"
    },
    "foundingDate": "2024",
    "founder": {
      "@type": "Person",
      "name": "Nick Githinji"
    }
  };

  // WebSite schema with SearchAction - Tells Google the site has job search functionality
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "IntelliResume Health",
    "url": "https://intelliresume.net",
    "description": "Free RN-only job board with direct nursing positions from top hospitals nationwide.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://intelliresume.net/jobs/nursing?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  // FAQ schema - Questions nurses ask about finding RN jobs
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is IntelliResume Health free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our RN job board is 100% free. Browse and apply to nursing jobs at no cost. There's no signup required to search jobs."
        }
      },
      {
        "@type": "Question",
        "name": "Where do the RN jobs come from?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "All jobs are sourced directly from hospital career pages - Cleveland Clinic, Northwell Health, Adventist Health, Hartford Healthcare, and more top healthcare employers. No agencies, no job boards, no middlemen!"
        }
      },
      {
        "@type": "Question",
        "name": "How often are jobs updated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We refresh job listings regularly to ensure you see the latest nursing opportunities. Jobs that are no longer available are marked unavailable."
        }
      },
      {
        "@type": "Question",
        "name": "Can I apply directly to hospitals?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Every job links directly to the employer's application page. We don't collect applications - you apply straight to the hospital's career portal."
        }
      },
      {
        "@type": "Question",
        "name": "What types of nursing jobs are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We list RN positions across all specialties including ICU, ER, Med-Surg, OR, NICU, Mental Health, and more. Filter by specialty, location, job type, and experience level to find your perfect match."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
};

// Client-side only component that adds breadcrumbs
const BreadcrumbsSchema = () => {
  // We need to import useRouter inside the component to avoid SSR issues
  const { useRouter } = require('next/router');
  const router = useRouter();
  const currentPath = router.asPath;
  
  // Generate breadcrumbs based on current path
  const generateBreadcrumbs = () => {
    // Skip breadcrumbs for homepage
    if (currentPath === '/') return null;
    
    // Split the path into segments
    const pathSegments = currentPath.split('/').filter(segment => segment);
    
    // Create breadcrumb list items
    const breadcrumbItems = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://intelliresume.net"
      }
    ];
    
    // Build the breadcrumb trail
    let pathSoFar = '';
    pathSegments.forEach((segment, index) => {
      pathSoFar += `/${segment}`;
      
      // Format the name (capitalize first letter, replace hyphens with spaces)
      const name = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
      
      breadcrumbItems.push({
        "@type": "ListItem",
        "position": index + 2,
        "name": name,
        "item": `https://intelliresume.net${pathSoFar}`
      });
    });
    
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbItems
    };
  };
  
  const breadcrumbSchema = generateBreadcrumbs();

  if (!breadcrumbSchema) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  );
};

// Import the breadcrumbs component dynamically with ssr: false
const ClientBreadcrumbs = dynamic(
  () => Promise.resolve(BreadcrumbsSchema),
  { ssr: false }
);

// Main component that renders both the SSR schemas and client-side breadcrumbs
const StructuredData = () => {
  return (
    <>
      <StructuredDataSSR />
      <ClientBreadcrumbs />
    </>
  );
};

export default StructuredData;
