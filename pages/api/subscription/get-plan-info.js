import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import Stripe from 'stripe';

/**
 * API endpoint to get plan information based on the Stripe session ID
 * Used primarily by the payment success page to show the appropriate messaging
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get session_id from query params
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Stripe session ID is required' });
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // Get the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

    // Verify this session belongs to the current user
    if (checkoutSession.client_reference_id !== session.user.id && 
        checkoutSession.metadata?.userId !== session.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to this session' });
    }

    // Get the plan ID from the session metadata
    const planId = checkoutSession.metadata?.planId;

    if (!planId) {
      return res.status(404).json({ error: 'Plan information not found in session' });
    }

    // Get plan details from our database
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Get the user's subscription
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        planId: plan.id,
        status: 'active'
      }
    });

    // Return the plan info
    return res.status(200).json({
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval
      },
      subscription: userSubscription ? {
        id: userSubscription.id,
        status: userSubscription.status,
        currentPeriodEnd: userSubscription.currentPeriodEnd
      } : null
    });
  } catch (error) {
    console.error('Error getting plan info:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 