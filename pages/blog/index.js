import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
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
export default function BlogIndex({ featuredPosts, categories, featuredCategories }) {
  return (
    <div className={styles.blogContainer}>
      <Head>
        <title>Career Resources & Insights | IntelliResume.net</title>
        <meta 
          name="description" 
          content="Expert career resources, resume examples, job descriptions, and professional advice to help you land your dream job. Powered by IntelliResume.net to accelerate your career."
        />
        <meta 
          name="keywords" 
          content="career resources, resume examples, job descriptions, career advice, job search tips, professional development"
        />
      </Head>

      {/* Hero Section with Background */}
      <div className={styles.heroSection}>
        <div className={styles.heroOverlay}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Career Resources & Insights</h1>
            <p className={styles.heroDescription}>
              Expert-crafted content to help you build a winning resume, prepare for interviews, and advance your career
            </p>
            <div className={styles.heroActions}>
              <AnimatedButton 
                href="/resume-builder" 
                text="Create Your Resume" 
                className={styles.heroButtonPrimary}
              />
              <a href="#browse-content" className={`${styles.heroButton} ${styles.heroButtonSecondary}`}>
                Browse Resources
              </a>
            </div>
          </div>
        </div>
      </div>

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
                Industry-specific resume examples crafted by experts to help you create the perfect resume
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
                Detailed job descriptions for various roles to help you understand employer expectations
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
                Professional tips and strategies for job searching, interviews, and career advancement
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

      {/* Featured Categories Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h2 className={styles.sectionTitle}>Browse by Industry</h2>
          <p className={styles.sectionDescription}>
            Find tailored resources for your specific industry
          </p>
        </div>

        {featuredCategories && featuredCategories.length > 0 ? (
          <div className={styles.categoryCards}>
            {featuredCategories.map((category) => (
              <Link 
                href={`/blog/${category.slug}`} 
                key={category.id}
                className={styles.categoryCard}
              >
                <div className={styles.categoryCardContent}>
                  <div className={styles.categoryCardIcon} style={{backgroundColor: category.color || '#4299e1'}}>
                    <span>{category.name.charAt(0)}</span>
                  </div>
                  <h3 className={styles.categoryCardTitle}>{category.name}</h3>
                  <p className={styles.categoryCardCount}>
                    {category.postCount || '5+'} resources
                  </p>
                </div>
                <div className={styles.categoryCardArrow}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📂</div>
            <h3 className={styles.emptyStateTitle}>No industries found</h3>
            <p className={styles.emptyStateMessage}>
              We're currently working on adding industry-specific resources. Check back soon!
            </p>
          </div>
        )}
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

        <div className={styles.viewAllContainer}>
          <Link href="/blog/all" className={styles.viewAllButton}>
            View All Resources
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.buttonIcon}>
              <path d="m9 18 6-6-6-6"></path>
            </svg>
          </Link>
        </div>
      </section>

      {/* Resume Builder CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <div className={styles.ctaIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <h2 className={styles.ctaTitle}>Ready to build your professional resume?</h2>
          <p className={styles.ctaDescription}>
            Use our AI-powered resume builder to create a standout resume in minutes. 
            Tailored to your industry, ATS-optimized, and designed to get you hired.
          </p>
          <AnimatedButton 
            href="/resume-builder" 
            text="Build Your Resume Now"
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
    
    // Get all categories that are marked as industries
    const featuredCategories = categories.filter(cat => cat.featured === true);

    return {
      props: {
        featuredPosts,
        categories,
        featuredCategories,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        featuredPosts: [],
        categories: [],
        featuredCategories: [],
      },
    };
  }
} 