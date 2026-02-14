import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

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

  try {
    // Find latest date with data
    const latestSummary = await prisma.gscSiteSummary.findFirst({
      orderBy: { date: 'desc' },
    });

    if (!latestSummary) {
      return res.status(404).json({ error: 'No GSC data found. Run pull-gsc-data.js first.' });
    }

    const dateStr = latestSummary.date.toISOString().split('T')[0];
    const { generateDailyReport } = require('../../../lib/services/seoAnalysisService');
    const { report } = await generateDailyReport(dateStr);

    return res.status(200).json({ aiSummary: report, date: dateStr });
  } catch (error) {
    console.error('Error regenerating SEO analysis:', error);
    return res.status(500).json({ error: 'Failed to regenerate analysis' });
  }
}
