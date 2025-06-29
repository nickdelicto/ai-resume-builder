import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import Stripe from "stripe";

/**
 * API endpoint to cancel a subscription
 * This only works for weekly and monthly plans, not one-time plans
 * 
 * Request body:
 * - subscriptionId: The ID of the subscription to cancel
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
        message: 'You need to be signed in to cancel a subscription'
      });
    }

    // Get subscription ID from request body
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing subscription ID',
        message: 'Subscription ID is required'
      });
    }

    console.log(`Attempting to cancel subscription ${subscriptionId} for user ${session.user.id}`);

    // Get the subscription from the database
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        id: subscriptionId,
        userId: session.user.id
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
        message: 'The specified subscription does not exist or does not belong to you'
      });
    }

    // Check if this is a weekly or monthly plan (only these can be canceled)
    if (subscription.planId !== 'weekly' && subscription.planId !== 'monthly') {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type',
        message: 'Only weekly and monthly plans can be canceled. One-time plans provide perpetual access and do not need cancellation.'
      });
    }

    // Check if subscription is already canceled
    if (subscription.status === 'canceled') {
      return res.status(400).json({
        success: false,
        error: 'Already canceled',
        message: 'This subscription has already been canceled'
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Cancel the subscription in Stripe if we have a Stripe subscription ID
    if (subscription.stripeSubscriptionId) {
      console.log(`Canceling Stripe subscription: ${subscription.stripeSubscriptionId}`);
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        console.log('Successfully canceled in Stripe');
      } catch (stripeError) {
        console.error('Error canceling subscription in Stripe:', stripeError);
        // Continue with local cancellation even if Stripe fails
        // This ensures the user's experience isn't blocked by Stripe API issues
      }
    } else {
      console.log('No Stripe subscription ID found, only updating local database');
    }

    // Update the subscription in the database
    const updatedSubscription = await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { 
        status: 'canceled',
        // Don't change the currentPeriodEnd - user should have access until then
      }
    });

    console.log(`Subscription ${subscriptionId} successfully canceled in database`);

    return res.status(200).json({
      success: true,
      message: 'Subscription canceled successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        planId: updatedSubscription.planId,
        currentPeriodEnd: updatedSubscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while canceling the subscription'
    });
  }
} 