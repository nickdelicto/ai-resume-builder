import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import Stripe from 'stripe';

/**
 * API endpoint to create a Stripe checkout session for a subscription
 * 
 * Request body:
 * - planId: ID of the subscription plan
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
    });

    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { planId } = req.body;

    // Validate required fields
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Check if plan exists
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    if (!plan.isActive) {
      return res.status(400).json({ error: 'This subscription plan is not currently available' });
    }

    // Get or create a Stripe customer
    let customer;
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    // Check if this user already has a subscription with a Stripe customer ID
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: { 
        userId: session.user.id,
        stripeCustomerId: { not: null }
      },
      select: {
        stripeCustomerId: true
      }
    });

    if (existingSubscription?.stripeCustomerId) {
      // Use existing Stripe customer ID from subscription
      customer = { id: existingSubscription.stripeCustomerId };
    } else {
      // Create a new Stripe customer
      customer = await stripe.customers.create({
        email: session.user.email,
        name: existingUser.name || undefined,
        metadata: {
          userId: session.user.id
        }
      });
      
      // We don't save the customer ID to the User model since the field doesn't exist
      // But we'll save it to the UserSubscription model later
    }

    // Set up the line items for Stripe Checkout based on the plan
    let lineItems, mode;

    if (plan.interval === 'one-time') {
      // For one-time purchases
      mode = 'payment';
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: plan.description || 'Resume Builder - One-time Purchase',
            },
            unit_amount: Math.round(parseFloat(plan.price) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ];
    } else {
      // For subscription plans
      mode = 'subscription';
      
      // Check if we have a Stripe Price ID already
      if (!plan.stripePriceId) {
        // Create a price in Stripe if we don't have one
        const stripeProduct = await stripe.products.create({
          name: plan.name,
          description: plan.description || `Resume Builder - ${plan.interval} subscription`,
        });
        
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(parseFloat(plan.price) * 100), // Convert to cents
          currency: 'usd',
          recurring: {
            interval: plan.interval === 'weekly' ? 'week' : 'month',
          },
        });
        
        // Save the Stripe Price ID to our database
        await prisma.subscriptionPlan.update({
          where: { id: plan.id },
          data: { stripePriceId: stripePrice.id }
        });
        
        // Use the newly created price
        lineItems = [{ price: stripePrice.id, quantity: 1 }];
      } else {
        // Use the existing price
        lineItems = [{ price: plan.stripePriceId, quantity: 1 }];
      }
    }

    // Create a checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      client_reference_id: session.user.id,
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: mode,
      success_url: `${process.env.NEXTAUTH_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription?canceled=true`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
      },
    });

    // Return the checkout URL to the client
    return res.status(200).json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 