import React from 'react';

/**
 * ResumeStructuredData - JSON-LD schema markup specifically for resume builder pages
 * Use this component on resume builder pages instead of the main StructuredData
 * Provides machine-readable data for search engines about the nursing resume builder tool
 */

const ResumeStructuredData = () => {
  // SoftwareApplication schema - Describes the nursing resume builder as a web application
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "IntelliResume Nursing Resume Builder",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free to start - no signup required"
    },
    "description": "AI-powered nursing resume builder designed for Registered Nurses. Build ATS-optimized resumes with clinical skills, certifications, licenses, and healthcare experience sections.",
    "url": "https://intelliresume.net/nursing-resume-builder",
    "screenshot": "https://intelliresume.net/og-image.png",
    "featureList": [
      "Nursing-specific resume templates",
      "Clinical skills and certifications sections",
      "AI-powered experience bullet generation",
      "ATS-optimized formatting for healthcare",
      "One-click job tailoring for RN positions",
      "License and compact state tracking",
      "PDF export",
      "Resume parsing and import"
    ],
    "author": {
      "@type": "Organization",
      "name": "IntelliResume Health",
      "url": "https://intelliresume.net"
    }
  };

  // FAQ schema - Nursing resume builder specific questions
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is the nursing resume builder really free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! You can build up to 5 nursing resumes for free with no signup required. Preview your resume and download one PDF free. Premium features like unlimited downloads are available via subscription."
        }
      },
      {
        "@type": "Question",
        "name": "How does the AI help write my nursing resume?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our AI generates professional nursing experience bullets using clinical action verbs and healthcare terminology. It suggests content based on your specialty, unit type, patient ratios, and certifications — while only using metrics you actually provide."
        }
      },
      {
        "@type": "Question",
        "name": "Will my nursing resume pass ATS systems?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Our templates use ATS-friendly formatting with standard section headers (Licenses, Certifications, Clinical Skills) that healthcare applicant tracking systems parse correctly. We use system fonts like Arial and Calibri for maximum compatibility."
        }
      },
      {
        "@type": "Question",
        "name": "Can I tailor my nursing resume to specific job descriptions?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Our one-click tailoring feature analyzes RN job descriptions and optimizes your resume content to match requirements, incorporating relevant clinical keywords, certifications, and skills that the position requires."
        }
      },
      {
        "@type": "Question",
        "name": "What nursing-specific sections are included?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our builder includes dedicated sections for nursing licenses (with state and compact status), clinical certifications (BLS, ACLS, PALS, and 40+ more), EHR systems, clinical skills organized by specialty, and experience templates with unit type, shift, and patient ratio fields."
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
};

export default ResumeStructuredData;
