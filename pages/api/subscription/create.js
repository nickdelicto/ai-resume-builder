import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import Stripe from 'stripe';

/**
 * API endpoint to create a Stripe checkout session for a subscription
 * 
 * Request body:
 * - planId: ID of the subscription plan
 * - metadata: Additional metadata for the subscription
 * - successUrl: URL to redirect to after successful payment
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

    const { planId, metadata = {}, successUrl } = req.body;

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

    try {
      // Check if we're upgrading/downgrading and have a previous subscription ID
      const previousSubscriptionId = metadata.previousSubscriptionId;
      
      if (previousSubscriptionId) {
        console.log(`Plan change detected. Looking up previous subscription: ${previousSubscriptionId}`);
        
        // Find the previous subscription to get its customer ID
        const previousSubscription = await prisma.userSubscription.findUnique({
          where: { id: previousSubscriptionId },
          select: { stripeCustomerId: true }
        });
        
        if (previousSubscription?.stripeCustomerId) {
          console.log(`Found Stripe customer ID from previous subscription: ${previousSubscription.stripeCustomerId}`);
          
          // Verify this customer exists in Stripe
          try {
            const stripeCustomer = await stripe.customers.retrieve(previousSubscription.stripeCustomerId);
            if (stripeCustomer && !stripeCustomer.deleted) {
              customer = { id: previousSubscription.stripeCustomerId };
              console.log(`Using existing Stripe customer: ${customer.id}`);
            } else {
              console.log(`Customer exists but is deleted in Stripe, will create new one`);
            }
          } catch (stripeError) {
            console.error(`Error retrieving Stripe customer: ${stripeError.message}`);
            // Will fall through to creating a new customer
          }
        }
      }
      
      // If we don't have a customer yet, look for any valid customer ID for this user
      if (!customer) {
        // Find the most recent active subscription with a valid customer ID
        const activeSubscription = await prisma.userSubscription.findFirst({
          where: { 
            userId: session.user.id,
            stripeCustomerId: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          select: { stripeCustomerId: true }
        });
        
        if (activeSubscription?.stripeCustomerId) {
          try {
            // Verify this customer exists in Stripe
            const stripeCustomer = await stripe.customers.retrieve(activeSubscription.stripeCustomerId);
            if (stripeCustomer && !stripeCustomer.deleted) {
              customer = { id: activeSubscription.stripeCustomerId };
              console.log(`Using existing Stripe customer from recent subscription: ${customer.id}`);
            }
          } catch (stripeError) {
            console.error(`Error retrieving Stripe customer: ${stripeError.message}`);
            // Will fall through to creating a new customer
          }
        }
      }
      
      // If we still don't have a valid customer, create a new one
      if (!customer) {
        console.log(`Creating new Stripe customer for user: ${session.user.id}`);
        customer = await stripe.customers.create({
          email: session.user.email,
          name: existingUser.name || undefined,
          metadata: {
            userId: session.user.id
          }
        });
        console.log(`Created new Stripe customer: ${customer.id}`);
      }
    } catch (error) {
      console.error(`Error handling customer creation/lookup: ${error.message}`);
      return res.status(500).json({ error: `Customer handling error: ${error.message}` });
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
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription?canceled=true`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        ...metadata
      },
    });

    // TEMPORARY: Update database directly for testing
    // This is needed because the webhook might not be working properly in development
    // In production, this should be handled by the webhook
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development environment detected. Updating database directly.');
      await updateDatabaseForTesting(
        session.user.id, 
        planId, 
        { 
          ...metadata,
          manualUpdate: true,
          checkoutSessionId: checkoutSession.id
        }
      );
    }

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

// Helper function to manually update the database when webhooks are not working
async function updateDatabaseForTesting(userId, planId, metadata) {
  // This function is for development/testing only and should be removed in production
  try {
    // Calculate expiration date based on plan type
    const currentPeriodEnd = new Date();
    if (planId === 'weekly') {
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7);
    } else if (planId === 'monthly') {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      // Default for other plans
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
    }

    // If this is an upgrade/downgrade, handle the previous subscription
    if (metadata?.previousSubscriptionId) {
      await prisma.userSubscription.update({
        where: { id: metadata.previousSubscriptionId },
        data: {
          status: 'canceled',
          canceledAt: new Date()
        }
      });
    }

    // Create new subscription record
    const userSubscription = await prisma.userSubscription.create({
      data: {
        userId: userId,
        planId: planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: currentPeriodEnd,
        stripeCustomerId: 'manual_update',
        stripeSubscriptionId: `manual_${Date.now()}`,
        metadata: metadata
      }
    });

    // Update user's plan type
    await prisma.user.update({
      where: { id: userId },
      data: {
        planType: planId,
        planExpirationDate: currentPeriodEnd
      }
    });

    return userSubscription;
  } catch (error) {
    console.error('Error in manual database update:', error);
    return null;
  }
}
