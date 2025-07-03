import React from 'react';
import dynamic from 'next/dynamic';

// Server-side safe version that doesn't use router
const StructuredDataSSR = () => {
  // Organization schema - Enhanced with more details
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "IntelliResume",
    "url": "https://intelliresume.net",
    "logo": "https://intelliresume.net/logo.svg",
    "description": "Intelligent AI-powered resume builder that creates professional, ATS-optimized resumes tailored for specific job applications.",
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

  // Software application schema - Enhanced with more specific details
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "IntelliResume",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Resume Builder",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to create, subscription required to download",
      "url": "https://intelliresume.net/subscription"
    },
    "description": "Intelligent AI-powered resume builder that creates ATS-optimized resumes",
    "operatingSystem": "Web browser",
    "featureList": "ATS-optimized templates, AI resume tailoring, Multiple resume versions",
    "screenshot": "https://intelliresume.net/resume-screenshot.svg"
  };

  // Product schema - More specific for resume builder service
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "IntelliResume AI Resume Builder",
    "description": "Professional resume builder with AI-powered features to create ATS-optimized resumes tailored for specific job applications.",
    "image": "https://intelliresume.net/resume-builder-preview.svg",
    "brand": {
      "@type": "Brand",
      "name": "IntelliResume"
    },
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": "4.99",
      "highPrice": "13.99",
      "priceCurrency": "USD",
      "offerCount": "3",
      "offers": [
        {
          "@type": "Offer",
          "name": "One-Time Download",
          "price": "6.99",
          "priceCurrency": "USD",
          "description": "Single resume download",
          "url": "https://intelliresume.net/subscription"
        },
        {
          "@type": "Offer",
          "name": "Short-Term Job Hunt",
          "price": "4.99",
          "priceCurrency": "USD",
          "description": "Weekly subscription with unlimited downloads",
          "url": "https://intelliresume.net/subscription"
        },
        {
          "@type": "Offer",
          "name": "Long-Term Job Hunt",
          "price": "13.99",
          "priceCurrency": "USD",
          "description": "Monthly subscription with unlimited downloads",
          "url": "https://intelliresume.net/subscription"
        }
      ]
    },
    "hasFeature": [
      "AI-powered resume optimization",
      "ATS-friendly templates",
      "Job-specific tailoring",
      "Resume versioning"
    ]
  };

  // FAQ schema - Kept the same with additional questions
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How does IntelliResume work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "IntelliResume uses AI to help you create professional, ATS-optimized resumes in minutes. Simply enter your information, and our AI will format it perfectly."
        }
      },
      {
        "@type": "Question",
        "name": "Is IntelliResume free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can create resumes for free, but downloading requires a subscription plan starting at $4.99/week."
        }
      },
      {
        "@type": "Question",
        "name": "How do I tailor my resume for a specific job?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Upload your existing resume and paste the job description. Our AI will analyze both and suggest targeted changes to match the job requirements."
        }
      },
      {
        "@type": "Question",
        "name": "What makes IntelliResume different from other resume builders?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "IntelliResume uses advanced AI to not just format your resume, but to actually optimize the content for applicant tracking systems (ATS). Our templates are specifically designed to pass through ATS filters while remaining visually appealing to hiring managers."
        }
      },
      {
        "@type": "Question",
        "name": "Can I create multiple versions of my resume?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! With IntelliResume, you can create multiple versions of your resume tailored for different job applications. This allows you to highlight the most relevant skills and experiences for each position."
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
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