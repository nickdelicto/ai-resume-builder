import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MDXRemote } from 'next-mdx-remote';
import { serialize } from 'next-mdx-remote/serialize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { getPostBySlug, getAllPostPaths, getRelatedPosts, getOccupationBySlug } from '../../../lib/blog/api';
import CategoryNav from '../../../components/blog/CategoryNav';
import RelatedPosts from '../../../components/blog/RelatedPosts';
import TableOfContents from '../../../components/blog/TableOfContents';
import SkillsSection from '../../../components/blog/SkillsSection';
import ResumeExample from '../../../components/blog/ResumeExample';
import AnimatedButton from '../../../components/blog/AnimatedButton';
import FeaturedImage from '../../../components/blog/FeaturedImage';
import styles from '../../../styles/blog/BlogPost.module.css';
import mdxStyles from '../../../styles/blog/MdxContent.module.css';

// Custom components for MDX
const components = {
  SkillsSection,
  ResumeExample,
  h2: (props) => <h2 id={props.id} {...props} />,
  h3: (props) => <h3 id={props.id} {...props} />,
  h4: (props) => <h4 id={props.id} {...props} />,
};

/**
 * Blog Post Page
 * 
 * Displays a single blog post with related content
 */
export default function BlogPost({ post, relatedPosts, mdxSource, occupationData }) {
  const router = useRouter();
  const [headings, setHeadings] = useState([]);
  
  // Extract headings from the post content for table of contents
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const elements = document.querySelectorAll('h2, h3, h4');
      const headingsList = Array.from(elements).map(element => ({
        id: element.id,
        text: element.textContent,
        level: parseInt(element.tagName.substring(1), 10)
      }));
      setHeadings(headingsList);
    }
  }, [mdxSource]);
  
  // If the page is being generated at request time (fallback: true)
  if (router.isFallback) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Loading post...</p>
      </div>
    );
  }
  
  // If post doesn't exist
  if (!post) {
    return (
      <div className={styles.error}>
        <h1 className={styles.errorTitle}>Post Not Found</h1>
        <p className={styles.errorMessage}>The post you're looking for doesn't exist.</p>
        <Link href="/blog" className={styles.backButton}>
          Back to Blog
        </Link>
      </div>
    );
  }
  
  // Format the date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  // Get content type
  const getContentType = () => {
    if (post.contentType) {
      return post.contentType;
    }
    
    if (post.occupation) {
      return 'Resume Example';
    }
    
    if (post.jobTitle) {
      return 'Job Description';
    }
    
    return 'Career Advice';
  };
  
  const contentType = getContentType();
  
  // Determine badge color based on content type
  const getBadgeColor = () => {
    switch (contentType.toLowerCase()) {
      case 'resume example':
        return '#4299e1'; // Blue
      case 'job description':
        return '#48bb78'; // Green
      case 'career advice':
        return '#ed8936'; // Orange
      default:
        return '#718096'; // Gray
    }
  };
  
  return (
    <div className={styles.blogContainer}>
      <Head>
        <title>{post.seo?.title || post.title}</title>
        <meta 
          name="description" 
          content={post.seo?.description || post.description}
        />
        {post.seo?.keywords && (
          <meta 
            name="keywords" 
            content={post.seo.keywords.join(', ')}
          />
        )}
        {/* Open Graph tags */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        {post.featuredImage && (
          <meta property="og:image" content={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net'}${post.featuredImage.src}`} />
        )}
        <meta property="og:type" content="article" />
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        {post.featuredImage && (
          <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net'}${post.featuredImage.src}`} />
        )}
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: post.title,
              description: post.description,
              image: post.featuredImage ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net'}${post.featuredImage.src}` : undefined,
              datePublished: post.publishedDate,
              dateModified: post.updatedDate || post.publishedDate,
              author: {
                '@type': 'Person',
                name: post.author?.name || 'Resume Expert'
              }
            })
          }}
        />
      </Head>
      
      <CategoryNav />
      
      <div className={styles.blogContent}>
        <div className={styles.header}>
          <div className={styles.breadcrumbs}>
            <Link href="/blog" className={styles.breadcrumbItem}>
              Blog
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <Link href={`/blog/${post.category}`} className={styles.breadcrumbItem}>
              {post.category.charAt(0).toUpperCase() + post.category.slice(1)}
            </Link>
          </div>
          
          <div className={styles.typeBadge} style={{backgroundColor: getBadgeColor()}}>
            {contentType}
          </div>
          
          <h1 className={styles.title}>{post.title}</h1>
          
          <p className={styles.description}>{post.description}</p>
          
          <div className={styles.meta}>
            {post.author && (
              <div className={styles.author}>
                {post.author.avatar ? (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    width={40}
                    height={40}
                    className={styles.authorAvatar}
                  />
                ) : (
                  <div className={styles.authorPlaceholder}>
                    {post.author.name.charAt(0)}
                  </div>
                )}
                <span className={styles.authorName}>By {post.author.name}</span>
              </div>
            )}
            
            <div className={styles.dates}>
              <span className={styles.date}>
                Published: {formatDate(post.publishedDate)}
              </span>
              {post.updatedDate && post.updatedDate !== post.publishedDate && (
                <span className={styles.updated}>
                  Updated: {formatDate(post.updatedDate)}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Featured Image - Use our new component */}
        <FeaturedImage 
          image={post.featuredImage}
          title={post.title}
          contentType={contentType}
          svgContent={post.featuredSvg}
        />
        
        <div className={styles.layout}>
          <div className={styles.sidebar}>
            <TableOfContents headings={headings} />
            
            {/* Resume example specific sidebar content */}
            {contentType === 'Resume Example' && occupationData && (
              <>
                <div className={styles.occupationSkills}>
                  <SkillsSection 
                    title={`Key Skills for ${occupationData.title}`}
                    skills={occupationData.keySkills}
                    description={`Essential skills for ${occupationData.title} positions to include on your resume.`}
                    columns={1}
                  />
                </div>
                
                <div className={styles.sidebarCta}>
                  <h3 className={styles.sidebarCtaTitle}>Create Your Resume Now</h3>
                  <p className={styles.sidebarCtaText}>Build a professional {occupationData.title} resume with our AI-powered resume builder.</p>
                  <AnimatedButton 
                    href="/resume-builder" 
                    text="Build Your Resume" 
                    style={{ width: '100%', marginTop: '1rem' }}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className={styles.body}>
            {/* Resume example specific content */}
            {contentType === 'Resume Example' && post.resumeExample && (
              <ResumeExample
                title={`${post.occupation ? post.occupation.replace(/-/g, ' ') : ''} Resume Example`}
                description="Use this professionally designed resume example as inspiration for your own resume."
                imageSrc={post.resumeExample.imageSrc}
                templateName={post.resumeExample.templateName}
                downloadPdfUrl={post.resumeExample.downloadPdfUrl}
              />
            )}
            
            {/* MDX Content */}
            <div className={`${styles.mdxContent} ${mdxStyles.mdxContent}`}>
              <MDXRemote {...mdxSource} components={components} />
            </div>
            
            {/* Resume CTA for Resume Examples */}
            {contentType === 'Resume Example' && (
              <div className={styles.resumeCta}>
                <div className={styles.resumeCtaContent}>
                  <h2 className={styles.resumeCtaTitle}>Ready to create your own {post.occupation ? post.occupation.replace(/-/g, ' ') : ''} resume?</h2>
                  <p className={styles.resumeCtaText}>
                    Use our AI-powered resume builder to create a professional, ATS-optimized resume in minutes.
                    Tailored to your experience and designed to help you land interviews.
                  </p>
                  <AnimatedButton 
                    href="/resume-builder" 
                    text="Build Your Resume Now" 
                  />
                </div>
              </div>
            )}
            
            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className={styles.tags}>
                <div className={styles.tagsHeader}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                  <span>Tags:</span>
                </div>
                <div className={styles.tagsList}>
                  {post.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className={styles.relatedPosts}>
            <RelatedPosts 
              posts={relatedPosts} 
              title={contentType === 'Resume Example' ? 'More Resume Examples' : 'Related Resources'}
            />
          </div>
        )}
        
        {/* CTA Section */}
        <div className={styles.cta}>
          <div className={styles.ctaContent}>
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
        </div>
      </div>
    </div>
  );
}

/**
 * Get static paths for all blog posts
 */
export async function getStaticPaths() {
  const paths = await getAllPostPaths();
  
  return {
    paths,
    // Generate pages for new posts on demand
    fallback: true,
  };
}

/**
 * Get static props for a specific blog post
 */
export async function getStaticProps({ params }) {
  const { category, slug } = params;
  
  // Get the post data
  const post = await getPostBySlug(slug);
  
  // If post doesn't exist, return 404
  if (!post) {
    return {
      notFound: true,
    };
  }
  
  // Verify the post belongs to the requested category
  if (post.category !== category && 
      !(category === 'resume-examples' && post.contentType === 'Resume Example') &&
      !(category === 'job-descriptions' && post.contentType === 'Job Description') &&
      !(category === 'career-advice' && post.contentType === 'Career Advice')) {
    return {
      notFound: true,
    };
  }
  
  // Get related posts
  const relatedPosts = await getRelatedPosts(slug, 3);
  
  // Get occupation data if this is a resume example
  let occupationData = null;
  if (post.occupation) {
    occupationData = await getOccupationBySlug(post.occupation);
  }
  
  // Process MDX content
  const mdxSource = await serialize(post.content || '', {
    mdxOptions: {
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        rehypeHighlight
      ],
      remarkPlugins: [remarkGfm]
    },
    scope: post
  });
  
  return {
    props: {
      post,
      relatedPosts,
      mdxSource,
      occupationData
    },
    // Revalidate every hour
    revalidate: 3600,
  };
} 