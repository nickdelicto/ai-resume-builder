import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to check if a user is eligible to download a resume
 * This checks if they have an active subscription
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ 
        eligible: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to download a resume'
      });
    }

    // Check if user has an active subscription
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
        currentPeriodEnd: {
          gte: new Date()
        }
      },
      include: {
        plan: true
      }
    });

    // Check if user has plan expiration date in the future
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    const hasPlanExpiration = user?.planExpirationDate && new Date(user.planExpirationDate) > new Date();

    // If user has an active subscription or unexpired plan, they are eligible
    if (userSubscription || hasPlanExpiration) {
      return res.status(200).json({
        eligible: true,
        message: 'User is eligible to download',
        plan: userSubscription?.plan?.name || user.planType
      });
    }

    // If no active subscription, they are not eligible
    return res.status(200).json({
      eligible: false,
      error: 'No active subscription',
      message: 'You need an active subscription to download a resume'
    });
  } catch (error) {
    console.error('Error checking download eligibility:', error);
    return res.status(500).json({ 
      eligible: false,
      error: 'Internal server error',
      message: 'An error occurred checking eligibility'
    });
  }
} 