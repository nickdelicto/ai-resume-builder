import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get the active subscription for the current user
 * Returns the most recent active or canceled-but-not-expired subscription
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
        success: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to access subscription information'
      });
    }

    console.log(`Fetching active subscription for user: ${session.user.id}`);

    // Find the active subscription (including canceled ones with future expiration)
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        OR: [
          {
            status: 'active',
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          {
            status: 'canceled',
            currentPeriodEnd: {
              gte: new Date()
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        plan: true
      }
    });

    if (!subscription) {
      console.log(`No active subscription found for user: ${session.user.id}`);
      return res.status(200).json({
        success: true,
        subscription: null,
        message: 'No active subscription found'
      });
    }

    console.log(`Found active subscription: ${subscription.id}, plan: ${subscription.planId}, status: ${subscription.status}`);

    return res.status(200).json({
      success: true,
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        planName: subscription.plan?.name || subscription.planId,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        stripeSubscriptionId: subscription.stripeSubscriptionId || null,
        isCanceled: subscription.status === 'canceled'
      }
    });
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while fetching subscription information'
    });
  }
} 