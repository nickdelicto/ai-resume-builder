import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get all active one-time plan subscriptions for the current user
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

    console.log(`Fetching one-time subscriptions for user: ${session.user.id}`);

    // Find all active one-time plan subscriptions for this user
    const subscriptions = await prisma.userSubscription.findMany({
      where: {
        userId: session.user.id,
        planId: 'one-time',
        // Include both active subscriptions, canceled ones with future expiration dates, and perpetual ones
        OR: [
          {
            status: 'active',
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          {
            // Include canceled subscriptions that still have valid expiration dates
            status: 'canceled',
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          {
            // Include any subscription marked as perpetual regardless of other fields
            metadata: {
              path: ['isPerpetual'],
              equals: true
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${subscriptions.length} valid one-time subscriptions for user ${session.user.id}`);
    
    // Get all active subscriptions of any type for this user
    const allActiveSubscriptions = await prisma.userSubscription.findMany({
      where: {
        userId: session.user.id,
        status: 'active',
        currentPeriodEnd: {
          gte: new Date()
        }
      }
    });
    
    console.log(`User has ${allActiveSubscriptions.length} active subscriptions of any type:`);
    allActiveSubscriptions.forEach(sub => {
      console.log(`- ID: ${sub.id}, Plan: ${sub.planId}, Expires: ${sub.currentPeriodEnd}`);
    });
    
    // Log details about each one-time subscription
    console.log('\nOne-time subscription details:');
    subscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`, {
        id: sub.id,
        status: sub.status,
        expirationDate: sub.currentPeriodEnd,
        downloadedResumeId: sub.metadata?.downloadedResumeId || 'None',
        isPerpetual: sub.metadata?.isPerpetual ? 'Yes' : 'No'
      });
    });
    
    return res.status(200).json({
      success: true,
      subscriptions: subscriptions,
      activeSubscriptionsCount: allActiveSubscriptions.length,
      activeSubscriptionTypes: [...new Set(allActiveSubscriptions.map(sub => sub.planId))]
    });
  } catch (error) {
    console.error('Error fetching one-time subscriptions:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while fetching subscription information'
    });
  }
} 