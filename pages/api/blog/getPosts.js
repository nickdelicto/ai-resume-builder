import { getAllPosts, getPostsByCategory } from '../../../lib/blog/api';

/**
 * API endpoint to fetch blog posts
 * 
 * @param {object} req - Next.js request object
 * @param {object} res - Next.js response object
 */
export default async function handler(req, res) {
  try {
    const { category } = req.query;
    
    let posts;
    if (category) {
      posts = await getPostsByCategory(category);
    } else {
      posts = await getAllPosts();
    }
    
    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error in getPosts API:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
} 