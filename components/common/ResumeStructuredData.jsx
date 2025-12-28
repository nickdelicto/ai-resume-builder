import React from 'react';

/**
 * ResumeStructuredData - JSON-LD schema markup specifically for resume builder pages
 * Use this component on resume builder pages instead of the main StructuredData
 * Provides machine-readable data for search engines about the AI resume builder tool
 */

const ResumeStructuredData = () => {
  // SoftwareApplication schema - Describes the AI resume builder as a web application
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "IntelliResume AI Resume Builder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start - no signup required"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150",
      "bestRating": "5",
      "worstRating": "1"
    },
    "description": "AI-powered resume builder that creates professional, ATS-optimized resumes. Build from scratch, improve existing resumes, or tailor your resume to specific job descriptions.",
    "url": "https://intelliresume.net/resume-builder",
    "screenshot": "https://intelliresume.net/og-image.png",
    "featureList": [
      "AI-powered content generation",
      "ATS-optimized formatting", 
      "Professional templates",
      "One-click job tailoring",
      "PDF export",
      "Resume parsing and import"
    ],
    "author": {
      "@type": "Organization",
      "name": "IntelliResume Health",
      "url": "https://intelliresume.net"
    }
  };

  // Product schema - For rich results showing the resume builder as a product
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "IntelliResume AI Resume Builder",
    "description": "Intelligent AI-powered resume builder that creates professional, ATS-optimized resumes tailored for your target jobs.",
    "brand": {
      "@type": "Brand",
      "name": "IntelliResume Health"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "priceValidUntil": "2026-12-31",
      "description": "Free tier available - start building without signup"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "150"
    },
    "review": [
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Sarah K."
        },
        "reviewBody": "The AI suggestions made my resume so much stronger. Got callbacks within a week!"
      },
      {
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5"
        },
        "author": {
          "@type": "Person",
          "name": "Mike T."
        },
        "reviewBody": "Love how easy it is to tailor my resume for different positions. Huge time saver."
      }
    ]
  };

  // FAQ schema - Questions about the resume builder specifically
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is the AI resume builder really free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! You can start building your resume immediately with no signup or credit card required. Preview your resume for free. Premium features like unlimited downloads are available via subscription."
        }
      },
      {
        "@type": "Question",
        "name": "How does the AI help write my resume?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI analyzes your input and generates professional, impactful content for your experience, skills, and summary sections. It helps overcome writer's block by suggesting action verbs, quantifiable achievements, and industry-specific keywords."
        }
      },
      {
        "@type": "Question",
        "name": "Will my resume pass ATS systems?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. Our templates are specifically designed to be ATS-friendly with proper formatting, standard section headers, and clean structure that applicant tracking systems can parse correctly."
        }
      },
      {
        "@type": "Question",
        "name": "Can I tailor my resume to specific job descriptions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our one-click tailoring feature analyzes job descriptions and optimizes your resume content to match requirements, incorporating relevant keywords and highlighting matching skills and experience."
        }
      },
      {
        "@type": "Question",
        "name": "Can I import my existing resume?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Upload your existing resume in PDF, Word, or text format. Our AI will extract your information and populate the builder, letting you enhance and improve your existing content."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
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

export default ResumeStructuredData;

