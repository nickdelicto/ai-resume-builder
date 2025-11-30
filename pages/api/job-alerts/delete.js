const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Delete a job alert permanently
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find alert by token
    const alert = await prisma.jobAlert.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Delete the alert
    await prisma.jobAlert.delete({
      where: { unsubscribeToken: token }
    });

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting job alert:', error);
    await prisma.$disconnect();
    return res.status(500).json({ error: 'Internal server error' });
  }
}

