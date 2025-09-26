import { getCategories } from '../../../lib/blog/api';

/**
 * API endpoint to fetch blog categories
 * 
 * @param {object} req - Next.js request object
 * @param {object} res - Next.js response object
 */
export default async function handler(req, res) {
  try {
    const categories = await getCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Error in getCategories API:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
} 