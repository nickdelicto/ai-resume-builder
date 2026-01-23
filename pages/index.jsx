import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Meta from '../components/common/Meta';
import JobSearchHero from '../components/home/JobSearchHero';
import BrowseByState from '../components/home/BrowseByState';
import BrowseByCategory from '../components/home/BrowseByCategory';
import FeaturedEmployers from '../components/home/FeaturedEmployers';
import ResumeBuilderCTA from '../components/home/ResumeBuilderCTA';
import SalaryCalculatorCTA from '../components/home/SalaryCalculatorCTA';
import JobAlertsCTA from '../components/home/JobAlertsCTA';
import { fetchBrowseStats } from '../lib/services/jobPageData';

/**
 * Homepage - Jobs-First Design
 * Primary focus: Help nurses find RN jobs quickly
 * Secondary: Resume builder as value-add tool
 * 
 * REDESIGN v3.0:
 * - Added WaveDividers between sections for smooth visual flow
 * - Sections now transition smoothly with curved separators
 * - Creates professional, fluid landing page feel
 */
const HomePage = ({ initialStats }) => {
  const { data: _session, status } = useSession();
  
  // Handle localStorage cleanup for resume flow
  useEffect(() => {
    console.log('📊 DEBUG - HOME - Homepage initialized');
    
    // Check if we have the starting_new_resume flag set
    if (typeof window !== 'undefined' && localStorage.getItem('starting_new_resume') === 'true') {
      console.log('📊 DEBUG - HOME - Found starting_new_resume flag, clearing it');
      
      // Clear resume ID if exists
      if (localStorage.getItem('current_resume_id')) {
        localStorage.removeItem('current_resume_id');
      }
      
      // Clear the flag
      localStorage.removeItem('starting_new_resume');
    }
  }, []);

  return (
    <>
      <Meta
        title="IntelliResume Health | Find Your Next RN Job Here"
        description="Free RN-only Job Board! Browse thousands of nursing jobs nationwide from top healthcare employers."
        keywords="RN jobs, nursing jobs, registered nurse jobs, healthcare jobs, nurse employment, nursing career"
      />
      
      {/* Structured Data for SEO */}
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://intelliresume.com/#website",
                  "url": "https://intelliresume.com",
                  "name": "IntelliResume Health",
                  "description": "RN Job Board",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": {
                      "@type": "EntryPoint",
                      "urlTemplate": "https://intelliresume.com/jobs/nursing?search={search_term_string}"
                    },
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://intelliresume.com/#organization",
                  "name": "IntelliResume Health",
                  "url": "https://intelliresume.com",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://intelliresume.com/logo.png"
                  },
                  "sameAs": []
                }
              ]
            })
          }}
        />
      </Head>
      
      {/* Loading indicator */}
      {status === 'loading' && (
        <div className="loading-indicator">
          Loading...
        </div>
      )}
      
      <main className="homepage">
        {/* Section 1: Hero with Job Search */}
        {/* Hero has built-in wave that transitions directly to mint (#f0fdfa) */}
        <JobSearchHero initialStats={initialStats} />
        
        {/* Section 2: Browse by State */}
        <BrowseByState initialStats={initialStats} />

        {/* Section 3: Browse by Category - Specialty, Job Type, Experience, Shift */}
        <BrowseByCategory initialStats={initialStats} />

        {/* Section 4: Featured Employers - flows directly from Browse by Category */}
        {/* Removed WaveDivider - sections have contrasting gradients that create natural visual separation */}
        <FeaturedEmployers initialStats={initialStats} />
        
        {/* Section 5: Resume Builder CTA */}
        <ResumeBuilderCTA />
        
        {/* Section 6: Salary Calculator Teaser */}
        <SalaryCalculatorCTA />
        
        {/* Section 7: Job Alerts CTA - Final section */}
        <JobAlertsCTA />
      </main>

      <style jsx>{`
        .homepage {
          min-height: 100vh;
        }
        
        .loading-indicator {
          position: fixed;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.05);
          color: #64748b;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          z-index: 1000;
          font-family: var(--font-figtree), 'Inter', sans-serif;
        }
      `}</style>
    </>
  );
};

export default HomePage;

/**
 * Server-side data fetching for homepage
 * Pre-fetches browse stats to eliminate CLS from loading state
 */
export async function getServerSideProps() {
  try {
    const stats = await fetchBrowseStats();
    return {
      props: {
        initialStats: stats
      }
    };
  } catch (error) {
    console.error('Error fetching browse stats:', error);
    // Return null stats on error - component will fall back to client-side fetch
    return {
      props: {
        initialStats: null
      }
    };
  }
}
