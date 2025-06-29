import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get discount information for a subscription
 * 
 * Query parameters:
 * - subscriptionId: The ID of the subscription to get discount info for
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
        message: 'You need to be signed in to get discount information'
      });
    }

    // Get subscription ID from query parameters
    const { subscriptionId } = req.query;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription ID',
        message: 'Subscription ID is required'
      });
    }

    // Get the subscription from the database
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id
      },
      include: {
        discounts: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        },
        plan: true
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        message: 'The specified subscription does not exist or does not belong to you'
      });
    }

    // Check if there's an active discount
    if (subscription.discounts.length === 0) {
      // Check if there's discount information in the metadata (for backward compatibility)
      if (subscription.metadata?.hasDiscount && subscription.metadata?.discountPercent) {
        return res.status(200).json({
          success: true,
          discount: {
            discountPercent: subscription.metadata.discountPercent,
            originalPrice: subscription.metadata.originalPrice || subscription.plan.price,
            discountedPrice: subscription.metadata.discountedPrice || 
              (subscription.plan.price * (1 - subscription.metadata.discountPercent / 100)),
            appliedAt: subscription.metadata.discountAppliedAt || subscription.updatedAt
          }
        });
      }
      
      // No discount found
      return res.status(200).json({
        success: true,
        discount: null
      });
    }

    // Return the active discount information
    const activeDiscount = subscription.discounts[0];
    return res.status(200).json({
      success: true,
      discount: {
        id: activeDiscount.id,
        discountPercent: activeDiscount.discountPercent,
        originalPrice: activeDiscount.originalPrice,
        discountedPrice: activeDiscount.discountedPrice,
        appliedAt: activeDiscount.appliedAt,
        reason: activeDiscount.reason
      }
    });
  } catch (error) {
    console.error('Error getting discount information:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while getting discount information'
    });
  }
} 