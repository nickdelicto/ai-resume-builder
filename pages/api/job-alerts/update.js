const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Update job alert status (activate/deactivate)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, active } = req.body;

    if (!token || typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Token and active status are required' });
    }

    // Find alert by token
    const alert = await prisma.jobAlert.findUnique({
      where: { unsubscribeToken: token }
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Update alert status
    const updatedAlert = await prisma.jobAlert.update({
      where: { unsubscribeToken: token },
      data: { active }
    });

    await prisma.$disconnect();

    return res.status(200).json({
      success: true,
      alert: updatedAlert,
      message: active ? 'Alert reactivated successfully' : 'Alert unsubscribed successfully'
    });

  } catch (error) {
    console.error('Error updating job alert:', error);
    await prisma.$disconnect();
    return res.status(500).json({ error: 'Internal server error' });
  }
}

