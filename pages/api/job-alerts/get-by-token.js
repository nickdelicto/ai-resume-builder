const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get job alert(s) by unsubscribe token
 * Used for unsubscribe and manage alerts pages
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find the alert with this token
    const alert = await prisma.jobAlert.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Find ALL alerts for this email address
    const allAlerts = await prisma.jobAlert.findMany({
      where: {
        email: alert.email
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      currentAlert: alert,
      allAlerts: allAlerts
    });

  } catch (error) {
    console.error('Error fetching job alerts:', error);
    await prisma.$disconnect();
    return res.status(500).json({ error: 'Internal server error' });
  }
}

