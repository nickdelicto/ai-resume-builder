import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to check if a user is eligible to create a new resume
 * Free users are limited to 1 resume; Pro users get unlimited
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({
        eligible: false,
        error: 'Not authenticated'
      });
    }

    const userId = session.user.id;

    // Check if user has an active paid subscription
    const activeSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'active',
        currentPeriodEnd: { gte: new Date() }
      }
    });

    if (activeSubscription) {
      return res.status(200).json({ eligible: true });
    }

    // Check if user has a non-free plan with valid expiration
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user?.planType && user.planType !== 'free' &&
        user.planExpirationDate && new Date(user.planExpirationDate) > new Date()) {
      return res.status(200).json({ eligible: true });
    }

    // Free tier: check resume count
    const resumeCount = await prisma.resumeData.count({ where: { userId } });
    const limit = 1;

    if (resumeCount >= limit) {
      return res.status(200).json({
        eligible: false,
        error: 'resume_limit_reached',
        resumeCount,
        limit
      });
    }

    return res.status(200).json({ eligible: true, resumeCount, limit });
  } catch (error) {
    console.error('Error checking creation eligibility:', error);
    return res.status(500).json({
      eligible: false,
      error: 'Internal server error'
    });
  }
}
