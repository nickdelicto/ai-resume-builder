import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import Stripe from "stripe";

/**
 * API endpoint to apply a discount to a subscription
 * This is used as part of the cancellation retention flow
 * 
 * Request body:
 * - subscriptionId: The ID of the subscription to apply discount to
 * - discountPercent: The percentage discount to apply (e.g., 30 for 30%)
 * - reason: Optional reason for the discount (defaults to 'retention')
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
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
        message: 'You need to be signed in to apply a discount'
      });
    }

    // Get subscription ID and discount percentage from request body
    const { subscriptionId, discountPercent, reason = 'retention' } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription ID',
        message: 'Subscription ID is required'
      });
    }

    // Validate discount percentage
    const discount = Number(discountPercent);
    if (isNaN(discount) || discount <= 0 || discount >= 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid discount percentage',
        message: 'Discount percentage must be a number between 1 and 99'
      });
    }

    console.log(`Attempting to apply ${discount}% discount to subscription ${subscriptionId} for user ${session.user.id}`);

    // Get the subscription from the database
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id
      },
      include: {
        plan: true,
        discounts: {
          where: {
            isActive: true
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        message: 'The specified subscription does not exist or does not belong to you'
      });
    }

    // Check if this is a weekly or monthly plan (only these can have discounts)
    if (subscription.planId !== 'weekly' && subscription.planId !== 'monthly') {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type',
        message: 'Only weekly and monthly plans can have discounts applied'
      });
    }

    // Check if there's already an active discount
    if (subscription.discounts.length > 0) {
      const existingDiscount = subscription.discounts[0];
      
      // If the existing discount is the same or better, don't apply a new one
      if (existingDiscount.discountPercent >= discount) {
        return res.status(200).json({
          success: true,
          message: `A ${existingDiscount.discountPercent}% discount is already applied to this subscription`,
          subscription: {
            id: subscription.id,
            discountPercent: existingDiscount.discountPercent,
            originalPrice: existingDiscount.originalPrice,
            discountedPrice: existingDiscount.discountedPrice
          }
        });
      }
      
      // If the new discount is better, deactivate the old one
      await prisma.subscriptionDiscount.update({
        where: { id: existingDiscount.id },
        data: { isActive: false }
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let stripeCouponId = null;

    // Apply the discount in Stripe if we have a Stripe subscription ID
    if (subscription.stripeSubscriptionId) {
      console.log(`Applying discount to Stripe subscription: ${subscription.stripeSubscriptionId}`);
      
      try {
        // First, create a coupon in Stripe for this specific discount
        const coupon = await stripe.coupons.create({
          percent_off: discount,
          duration: 'forever',
          name: `Retention ${discount}% Off`
        });
        
        stripeCouponId = coupon.id;
        
        // Then apply the coupon to the subscription
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          coupon: coupon.id,
        });
        
        console.log('Successfully applied discount in Stripe with coupon ID:', stripeCouponId);
      } catch (stripeError) {
        console.error('Error applying discount in Stripe:', stripeError);
        // Continue with local discount application even if Stripe fails
        // This ensures the user's experience isn't blocked by Stripe API issues
      }
    } else {
      console.log('No Stripe subscription ID found, only updating local database');
    }

    // Calculate the discounted price
    const originalPrice = subscription.plan?.price || 0;
    const discountedPrice = originalPrice * (1 - discount / 100);

    // Create a new discount record in the database
    const newDiscount = await prisma.subscriptionDiscount.create({
      data: {
        subscriptionId: subscription.id,
        userId: session.user.id,
        discountPercent: discount,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        stripeCouponId: stripeCouponId,
        reason: reason,
        isActive: true
      }
    });

    // Also update the subscription metadata for backward compatibility
    const updatedSubscription = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { 
        metadata: {
          ...subscription.metadata,
          hasDiscount: true,
          discountPercent: discount,
          originalPrice: originalPrice,
          discountedPrice: discountedPrice,
          discountAppliedAt: new Date().toISOString()
        }
      }
    });

    // Also log this retention event for analytics
    await prisma.userEvent.create({
      data: {
        userId: session.user.id,
        type: 'retention_discount_applied',
        metadata: {
          subscriptionId,
          discountPercent: discount,
          originalPrice,
          discountedPrice,
          discountId: newDiscount.id
        }
      }
    }).catch(err => {
      // Log error but don't fail the request
      console.error('Error logging retention event:', err);
    });

    console.log(`Discount of ${discount}% successfully applied to subscription ${subscriptionId}`);

    return res.status(200).json({
      success: true,
      message: 'Discount applied successfully',
      subscription: {
        id: updatedSubscription.id,
        discountPercent: discount,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        discountId: newDiscount.id
      }
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while applying the discount'
    });
  }
} 