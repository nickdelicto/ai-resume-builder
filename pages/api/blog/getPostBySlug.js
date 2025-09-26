import { getPostBySlug } from '../../../lib/blog/api';

/**
 * API endpoint to fetch a blog post by slug
 * 
 * @param {object} req - Next.js request object
 * @param {object} res - Next.js response object
 */
export default async function handler(req, res) {
  try {
    const { slug } = req.query;
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug parameter is required' });
    }
    
    const post = await getPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.status(200).json({ post });
  } catch (error) {
    console.error('Error in getPostBySlug API:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
} 