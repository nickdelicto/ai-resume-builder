import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Admin auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const adminEmails = (process.env.ADMIN_EMAIL || '')
    .split(/[;,]/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { question } = req.body;
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' });
  }

  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 characters)' });
  }

  try {
    const { answerSeoQuestion } = require('../../../lib/services/seoAnalysisService');
    const answer = await answerSeoQuestion(question.trim());
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error in SEO chat:', error);
    return res.status(500).json({ error: 'Failed to generate answer' });
  }
}
