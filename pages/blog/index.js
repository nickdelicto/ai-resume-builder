import Head from 'next/head';
import Link from 'next/link';
import { getCategories, getFeaturedPosts } from '../../lib/blog/api';
import PostCard from '../../components/blog/PostCard';
import CategoryNav from '../../components/blog/CategoryNav';
import AnimatedButton from '../../components/blog/AnimatedButton';
import styles from '../../styles/blog/BlogIndex.module.css';

/**
 * Blog Landing Page
 * 
 * Main entry point for the career resources section
 * Displays featured content from different topic silos
 */
export default function BlogIndex({ featuredPosts, categories }) {
  return (
    <div className={styles.blogContainer}>
      <Head>
        <title>Nursing Career Resources | IntelliResume Health</title>
        <meta
          name="description"
          content="Expertly crafted content to get you started on your nursing career and to help you thrive. Career guides, resume examples, certifications, and job search resources."
        />
        <meta 
          name="keywords" 
          content="career resources, resume examples, job descriptions, career advice, job search tips, professional development"
        />
      </Head>

      {/* Compact Header */}
      <header className={styles.compactHeader}>
        <h1 className={styles.compactTitle}>Nursing Career Resources</h1>
        <p className={styles.compactDescription}>
          Expertly crafted content to get you started & thriving in your nursing career
        </p>
      </header>

      <CategoryNav categories={categories} />

      {/* Content Silos Section */}
      <section id="browse-content" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
          </div>
          <h2 className={styles.sectionTitle}>Career Resource Library</h2>
          <p className={styles.sectionDescription}>
            Explore our collection of expert resources to help you at every stage of your career journey
          </p>
        </div>

        <div className={styles.siloCards}>
          <div className={styles.siloCard}>
            <div className={styles.siloCardIcon} style={{backgroundColor: '#4299e1'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M9 12h6"></path>
                <path d="M9 16h6"></path>
              </svg>
            </div>
            <div className={styles.siloCardContent}>
              <h3 className={styles.siloCardTitle}>Resume Examples</h3>
              <p className={styles.siloCardDescription}>
                Nursing resume examples crafted by healthcare recruiters to help you land interviews
              </p>
              <Link href="/blog/resume-examples" className={styles.siloCardLink}>
                Browse Examples
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.siloCard}>
            <div className={styles.siloCardIcon} style={{backgroundColor: '#0d9488'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
            </div>
            <div className={styles.siloCardContent}>
              <h3 className={styles.siloCardTitle}>Career Guides</h3>
              <p className={styles.siloCardDescription}>
                Step-by-step guides on how to become a nurse in various specialties
              </p>
              <Link href="/blog/career-guides" className={styles.siloCardLink}>
                Explore Guides
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.siloCard}>
            <div className={styles.siloCardIcon} style={{backgroundColor: '#48bb78'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <line x1="10" y1="9" x2="8" y2="9"></line>
              </svg>
            </div>
            <div className={styles.siloCardContent}>
              <h3 className={styles.siloCardTitle}>Job Descriptions</h3>
              <p className={styles.siloCardDescription}>
                What does each nursing specialty do? Responsibilities, skills, and expectations
              </p>
              <Link href="/blog/job-descriptions" className={styles.siloCardLink}>
                View Job Descriptions
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.siloCard}>
            <div className={styles.siloCardIcon} style={{backgroundColor: '#8b5cf6'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="6"></circle>
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
              </svg>
            </div>
            <div className={styles.siloCardContent}>
              <h3 className={styles.siloCardTitle}>Certifications</h3>
              <p className={styles.siloCardDescription}>
                CCRN, PCCN, CEN and more - eligibility, exam prep, and renewal guides
              </p>
              <Link href="/blog/certifications" className={styles.siloCardLink}>
                Certification Guides
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Link>
            </div>
          </div>

          <div className={styles.siloCard}>
            <div className={styles.siloCardIcon} style={{backgroundColor: '#ed8936'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className={styles.siloCardContent}>
              <h3 className={styles.siloCardTitle}>Career Advice</h3>
              <p className={styles.siloCardDescription}>
                Salary negotiation, interview tips, and career advancement strategies for nurses
              </p>
              <Link href="/blog/career-advice" className={styles.siloCardLink}>
                Read Career Advice
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"></path>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Content Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <h2 className={styles.sectionTitle}>Featured Resources</h2>
          <p className={styles.sectionDescription}>
            Our most popular and recently updated content
          </p>
        </div>

        {featuredPosts && featuredPosts.length > 0 ? (
          <div className={styles.postsGrid}>
            {featuredPosts.map((post) => (
              <div className={styles.postCardWrapper} key={post.slug}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📝</div>
            <h3 className={styles.emptyStateTitle}>No featured content yet</h3>
            <p className={styles.emptyStateMessage}>
              We're working on adding more content. Check back soon for featured resources!
            </p>
          </div>
        )}

      </section>

      {/* Find RN Jobs CTA */}
      <section className={styles.ctaSectionTeal}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaIconTeal}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
              <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path>
              <circle cx="20" cy="10" r="2"></circle>
            </svg>
          </div>
          <h2 className={styles.ctaTitle}>Find Your Next Nursing Position</h2>
          <p className={styles.ctaDescription}>
            Browse thousands of RN job openings across the country. Filter by specialty,
            location, and shift type to find the perfect opportunity for your career.
          </p>
          <AnimatedButton
            href="/jobs/nursing"
            text="Browse Nursing Jobs"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Get server-side props for the blog landing page
 */
export async function getServerSideProps() {
  try {
    const categories = await getCategories();
    const featuredPosts = await getFeaturedPosts(6);

    return {
      props: {
        featuredPosts,
        categories,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        featuredPosts: [],
        categories: [],
      },
    };
  }
} 