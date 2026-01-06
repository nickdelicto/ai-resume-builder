import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getCategories, getCategoryBySlug, getPostsByCategory, getAllCategoryPaths } from '../../lib/blog/api';
import {
  getPageTitle,
  getPageDescription,
  getHeaderColor
} from '../../lib/blog/categoryUtils';
import PostCard from '../../components/blog/PostCard';
import CategoryNav from '../../components/blog/CategoryNav';
import styles from '../../styles/blog/CategoryPage.module.css';

/**
 * Category Page
 *
 * Displays all content for a specific category or content silo
 * Matches the career guides page design
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
  const pageTitle = category.name;
  const pageDescription = getPageDescription(category);
  const headerColor = getHeaderColor(category);

  // Get icon based on category
  const getCategoryIcon = () => {
    switch (category.slug) {
      case 'resume-examples':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        );
      case 'job-descriptions':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            <path d="M9 14h6"/>
            <path d="M9 18h6"/>
            <path d="M9 10h6"/>
          </svg>
        );
      case 'certifications':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="6"/>
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
          </svg>
        );
      case 'career-advice':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4"/>
            <path d="m6.343 6.343 2.828 2.828"/>
            <path d="M2 12h4"/>
            <path d="m6.343 17.657 2.828-2.828"/>
            <path d="M12 18v4"/>
            <path d="m17.657 17.657-2.828-2.828"/>
            <path d="M18 12h4"/>
            <path d="m17.657 6.343-2.828 2.828"/>
          </svg>
        );
      default:
        return (
          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{category.name.charAt(0)}</span>
        );
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{category.seo?.title || `${pageTitle} | IntelliResume Health`}</title>
        <meta
          name="description"
          content={category.seo?.description || pageDescription}
        />
        {category.seo?.keywords && (
          <meta name="keywords" content={category.seo.keywords.join(', ')} />
        )}
      </Head>

      <CategoryNav categories={categories} />

      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span className={styles.separator}>/</span>
        <Link href="/blog">Resources</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>{category.name}</span>
      </nav>

      {/* Category Header - Compact style */}
      <header className={styles.categoryHeader} style={{ borderLeftColor: headerColor }}>
        <div className={styles.categoryIcon} style={{ backgroundColor: headerColor }}>
          {getCategoryIcon()}
        </div>
        <div className={styles.categoryText}>
          <h1 className={styles.categoryTitle}>{pageTitle}</h1>
          <p className={styles.categoryDescription}>{pageDescription}</p>
        </div>
      </header>

      {/* Posts Grid */}
      <div className={styles.categoryContent}>
        {posts.length > 0 ? (
          <div className={styles.postsGrid}>
            {posts.map((post) => (
              <div className={styles.postCardWrapper} key={post.slug}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noPosts}>
            <p>No posts in this category yet. Check back soon!</p>
          </div>
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

    // Exclude career-guides since it has its own dedicated page
    const filteredPaths = paths.filter(
      (path) => path.params.category !== 'career-guides'
    );

    return {
      paths: filteredPaths,
      fallback: true,
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
      revalidate: 60,
    };
  }
}
