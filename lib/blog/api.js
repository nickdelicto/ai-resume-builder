/**
 * Blog API Utilities
 * 
 * This module provides functions to fetch blog data from local JSON files.
 * In the future, these functions can be modified to fetch data from a Strapi CMS API
 * while maintaining the same interface.
 */

import fs from 'fs';
import path from 'path';

// Base paths for data files
const categoriesPath = path.join(process.cwd(), 'data', 'blog', 'categories.json');
const occupationsPath = path.join(process.cwd(), 'data', 'blog', 'occupations.json');
const postsDirectory = path.join(process.cwd(), 'data', 'blog', 'posts');

/**
 * Get all blog categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function getCategories() {
  try {
    const fileContents = fs.readFileSync(categoriesPath, 'utf8');
    const { categories } = JSON.parse(fileContents);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Get a specific category by slug
 * @param {string} slug - The category slug
 * @returns {Promise<Object|null>} Category object or null if not found
 */
export async function getCategoryBySlug(slug) {
  try {
    const categories = await getCategories();
    return categories.find(category => category.slug === slug) || null;
  } catch (error) {
    console.error(`Error fetching category ${slug}:`, error);
    return null;
  }
}

/**
 * Get all occupations
 * @returns {Promise<Array>} Array of occupation objects
 */
export async function getOccupations() {
  try {
    const fileContents = fs.readFileSync(occupationsPath, 'utf8');
    const { occupations } = JSON.parse(fileContents);
    return occupations;
  } catch (error) {
    console.error('Error fetching occupations:', error);
    return [];
  }
}

/**
 * Get occupations by category
 * @param {string} categorySlug - The category slug
 * @returns {Promise<Array>} Array of occupation objects in the specified category
 */
export async function getOccupationsByCategory(categorySlug) {
  try {
    const occupations = await getOccupations();
    const category = await getCategoryBySlug(categorySlug);
    
    if (!category) return [];
    
    return occupations.filter(occupation => occupation.category === category.id);
  } catch (error) {
    console.error(`Error fetching occupations for category ${categorySlug}:`, error);
    return [];
  }
}

/**
 * Get a specific occupation by slug
 * @param {string} slug - The occupation slug
 * @returns {Promise<Object|null>} Occupation object or null if not found
 */
export async function getOccupationBySlug(slug) {
  try {
    const occupations = await getOccupations();
    return occupations.find(occupation => occupation.slug === slug) || null;
  } catch (error) {
    console.error(`Error fetching occupation ${slug}:`, error);
    return null;
  }
}

/**
 * Get all blog posts
 * @returns {Promise<Array>} Array of blog post objects
 */
export async function getAllPosts() {
  try {
    const fileNames = fs.readdirSync(postsDirectory);
    const allPosts = fileNames.map(fileName => {
      // Process based on file extension
      if (fileName.endsWith('.json')) {
        // Process JSON files
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(fileContents);
      } else if (fileName.endsWith('.mdx')) {
        // Process MDX files
        const fullPath = path.join(postsDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        
        // Extract frontmatter from MDX (basic implementation)
        const frontmatterRegex = /---\n([\s\S]*?)\n---/;
        const match = frontmatterRegex.exec(fileContents);
        
        if (match) {
          const frontmatterStr = match[1];
          const frontmatter = {};
          
          // Parse frontmatter
          frontmatterStr.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              let value = valueParts.join(':').trim();
              // Strip surrounding quotes from values
              if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
              }
              frontmatter[key.trim()] = value;
            }
          });
          
          // Extract slug from filename if not in frontmatter
          if (!frontmatter.slug) {
            frontmatter.slug = fileName.replace(/\.mdx$/, '');
          }
          
          // Set content
          frontmatter.content = fileContents;
          
          return frontmatter;
        }
        
        // If no frontmatter, create a basic post object
        return {
          slug: fileName.replace(/\.mdx$/, ''),
          title: fileName.replace(/\.mdx$/, '').replace(/-/g, ' '),
          content: fileContents,
          publishedDate: new Date().toISOString(),
        };
      }
      
      // Skip other file types
      return null;
    }).filter(Boolean); // Remove null entries
    
    // Sort posts by date in descending order
    return allPosts.sort((a, b) => {
      if (a.publishedDate < b.publishedDate) {
        return 1;
      } else {
        return -1;
      }
    });
  } catch (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
}

/**
 * Get a specific post by slug
 * @param {string} slug - The post slug
 * @returns {Promise<Object|null>} Post object or null if not found
 */
export async function getPostBySlug(slug) {
  try {
    const posts = await getAllPosts();
    return posts.find(post => post.slug === slug) || null;
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    return null;
  }
}

/**
 * Get posts by category
 * @param {string} categorySlug - The category slug
 * @returns {Promise<Array>} Array of post objects in the specified category
 */
export async function getPostsByCategory(categorySlug) {
  try {
    const posts = await getAllPosts();
    const category = await getCategoryBySlug(categorySlug);
    
    if (!category) return [];
    
    return posts.filter(post => post.category === category.id);
  } catch (error) {
    console.error(`Error fetching posts for category ${categorySlug}:`, error);
    return [];
  }
}

/**
 * Get posts by occupation
 * @param {string} occupationId - The occupation ID
 * @returns {Promise<Array>} Array of post objects for the specified occupation
 */
export async function getPostsByOccupation(occupationId) {
  try {
    const posts = await getAllPosts();
    return posts.filter(post => post.occupation === occupationId);
  } catch (error) {
    console.error(`Error fetching posts for occupation ${occupationId}:`, error);
    return [];
  }
}

/**
 * Get related posts
 * @param {string} postSlug - The current post slug
 * @param {number} limit - Maximum number of related posts to return
 * @returns {Promise<Array>} Array of related post objects
 */
export async function getRelatedPosts(postSlug, limit = 3) {
  try {
    const currentPost = await getPostBySlug(postSlug);
    if (!currentPost) return [];
    
    const allPosts = await getAllPosts();
    
    // Filter out the current post
    const otherPosts = allPosts.filter(post => post.slug !== postSlug);
    
    // First, try to get posts with the same occupation
    let relatedPosts = otherPosts.filter(post => 
      post.occupation === currentPost.occupation
    );
    
    // If we don't have enough, add posts from the same category
    if (relatedPosts.length < limit) {
      const sameCategoryPosts = otherPosts.filter(post => 
        post.category === currentPost.category && 
        post.occupation !== currentPost.occupation
      );
      
      relatedPosts = [...relatedPosts, ...sameCategoryPosts];
    }
    
    // If we still don't have enough, add posts that share tags
    if (relatedPosts.length < limit && currentPost.tags) {
      const currentTags = new Set(currentPost.tags);
      
      const tagRelatedPosts = otherPosts.filter(post => {
        if (!post.tags) return false;
        if (relatedPosts.includes(post)) return false;
        
        // Check if posts share any tags
        return post.tags.some(tag => currentTags.has(tag));
      });
      
      relatedPosts = [...relatedPosts, ...tagRelatedPosts];
    }
    
    // Return the specified number of related posts
    return relatedPosts.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching related posts for ${postSlug}:`, error);
    return [];
  }
}

/**
 * Get all post paths for static generation
 * @returns {Promise<Array>} Array of path objects for getStaticPaths
 */
export async function getAllPostPaths() {
  try {
    const posts = await getAllPosts();
    
    return posts.map(post => {
      const category = post.category;
      return {
        params: {
          category,
          slug: post.slug
        }
      };
    });
  } catch (error) {
    console.error('Error generating post paths:', error);
    return [];
  }
}

/**
 * Get all category paths for static generation
 * @returns {Promise<Array>} Array of path objects for getStaticPaths
 */
export async function getAllCategoryPaths() {
  try {
    const categories = await getCategories();
    
    return categories.map(category => {
      return {
        params: {
          category: category.slug
        }
      };
    });
  } catch (error) {
    console.error('Error generating category paths:', error);
    return [];
  }
}

/**
 * Search posts by query
 * @param {string} query - The search query
 * @returns {Promise<Array>} Array of matching post objects
 */
export async function searchPosts(query) {
  if (!query || query.trim() === '') {
    return [];
  }
  
  try {
    const posts = await getAllPosts();
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return posts.filter(post => {
      // Search in title
      const titleMatch = searchTerms.some(term => 
        post.title.toLowerCase().includes(term)
      );
      
      // Search in content introduction
      const introMatch = searchTerms.some(term => 
        post.content.introduction.toLowerCase().includes(term)
      );
      
      // Search in tags
      const tagMatch = post.tags && searchTerms.some(term =>
        post.tags.some(tag => tag.toLowerCase().includes(term))
      );
      
      // Search in occupation title
      const occupationMatch = post.occupation && searchTerms.some(term =>
        post.occupation.toLowerCase().includes(term)
      );
      
      return titleMatch || introMatch || tagMatch || occupationMatch;
    });
  } catch (error) {
    console.error(`Error searching posts for "${query}":`, error);
    return [];
  }
}

/**
 * Get featured posts
 * @param {number} limit - Maximum number of featured posts to return
 * @returns {Promise<Array>} Array of featured post objects
 */
export async function getFeaturedPosts(limit = 6) {
  try {
    const posts = await getAllPosts();

    // Import career guides dynamically
    let careerGuidePosts = [];
    try {
      const { getAvailableCareerGuides, SPECIALTY_CAREER_DATA } = await import('../constants/specialtyCareerData');
      const guideSlugs = getAvailableCareerGuides();

      careerGuidePosts = guideSlugs.map(slug => {
        const data = SPECIALTY_CAREER_DATA[slug];
        // Use "an" for names starting with vowel sounds
        const article = /^[aeiouAEIOU]/.test(data.name) ? 'an' : 'a';
        return {
          slug,
          category: 'career-guides',
          title: `How to Become ${article} ${data.name} Nurse`,
          description: data.seo.description.substring(0, 150) + '...',
          contentType: 'Career Guide',
          publishedDate: new Date().toISOString(),
          featured: true,
          featuredImage: {
            src: `/images/og/career-guides/${slug}.jpg`,
            alt: `How to Become ${article} ${data.name} Nurse`
          }
        };
      });
    } catch (e) {
      // Career guides data not available
    }

    // Combine blog posts and career guides, prioritizing featured items
    const allContent = [...posts, ...careerGuidePosts];

    // Sort by publishedDate (most recent first)
    allContent.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));

    return allContent.slice(0, limit);
  } catch (error) {
    console.error('Error fetching featured posts:', error);
    return [];
  }
}

/**
 * Get featured categories
 * @returns {Promise<Array>} Array of featured category objects
 */
export async function getFeaturedCategories() {
  try {
    const categories = await getCategories();
    return categories.filter(category => category.featured);
  } catch (error) {
    console.error('Error fetching featured categories:', error);
    return [];
  }
} 