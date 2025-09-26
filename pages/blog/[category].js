import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getCategories, getCategoryBySlug, getPostsByCategory, getAllCategoryPaths } from '../../lib/blog/api';
import { 
  getPageTitle, 
  getPageDescription, 
  getContentTypeLabel, 
  getHeaderColor,
  getCategorySummary
} from '../../lib/blog/categoryUtils';
import PostCard from '../../components/blog/PostCard';
import CategoryNav from '../../components/blog/CategoryNav';
import CategoryHeader from '../../components/blog/CategoryHeader';
import CategorySummary from '../../components/blog/CategorySummary';
import CategoryCTA from '../../components/blog/CategoryCTA';
import EmptyState from '../../components/blog/EmptyState';
import styles from '../../styles/blog/CategoryPage.module.css';

/**
 * Category Page
 * 
 * Displays all content for a specific category or content silo
 * Supports industry categories and content type silos (resume examples, job descriptions, career advice)
 */
export default function CategoryPage({ category, posts, categories }) {
  const router = useRouter();
  
  // If the page is being generated at request time (fallback: true)
  if (router.isFallback) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading content...</p>
      </div>
    );
  }
  
  // If category doesn't exist
  if (!category) {
    return (
      <div className={styles.errorContainer}>
        <h1>Category Not Found</h1>
        <p>The category you're looking for doesn't exist.</p>
        <a href="/blog" className={styles.backButton}>Browse All Categories</a>
      </div>
    );
  }
  
  // Get page metadata and styling information
  const pageTitle = getPageTitle(category);
  const pageDescription = getPageDescription(category);
  const contentTypeLabel = getContentTypeLabel(category);
  const headerColor = getHeaderColor(category);
  const summarySectionTitle = `About ${contentTypeLabel === 'Resources' ? `${category.name} ${contentTypeLabel}` : contentTypeLabel}`;
  const summaryText = getCategorySummary(category);
  
  return (
    <div className={styles.container}>
      <Head>
        <title>{category.seo?.title || `${pageTitle} | Intelligent AI Resume Builder`}</title>
        <meta 
          name="description" 
          content={category.seo?.description || pageDescription}
        />
        {category.seo?.keywords && (
          <meta name="keywords" content={category.seo.keywords.join(', ')} />
        )}
      </Head>
      
      <CategoryNav categories={categories} />
      
      {/* Category Header */}
      <CategoryHeader 
        category={category}
        title={pageTitle}
        description={pageDescription}
        headerColor={headerColor}
      />
      
      {/* Category Content */}
      <div className={styles.categoryContent}>
        {posts.length > 0 ? (
          <>
            {/* Category Summary */}
            <CategorySummary 
              title={summarySectionTitle}
              text={summaryText}
            />
            
            {/* Posts Grid */}
            <div className={styles.postsGrid}>
              {posts.map((post) => (
                <div className={styles.postCardWrapper} key={post.slug}>
                  <PostCard post={post} />
                </div>
              ))}
            </div>
            
            {/* CTA Section */}
            <CategoryCTA />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/**
 * Get static paths for pre-rendering
 */
export async function getStaticPaths() {
  try {
    const paths = await getAllCategoryPaths();
    
    return {
      paths,
      fallback: true, // Generate pages on-demand if not pre-rendered
    };
  } catch (error) {
    console.error('Error in getStaticPaths:', error);
    return {
      paths: [],
      fallback: true,
    };
  }
}

/**
 * Get static props for pre-rendering
 */
export async function getStaticProps({ params }) {
  try {
    const { category: categorySlug } = params;
    const categories = await getCategories();
    const category = await getCategoryBySlug(categorySlug);
    
    // If category doesn't exist, return 404
    if (!category) {
      return {
        notFound: true,
      };
    }
    
    const posts = await getPostsByCategory(categorySlug);
    
    return {
      props: {
        category,
        posts,
        categories,
      },
      // Re-generate at most once per day
      revalidate: 86400,
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return {
      props: {
        category: null,
        posts: [],
        categories: [],
      },
      revalidate: 60, // Try again after a minute if there was an error
    };
  }
} 