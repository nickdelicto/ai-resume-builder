import { buffer } from 'micro';
import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';

// Disable body parser to get the raw request body for Stripe
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });

  // Get the raw request body
  const buf = await buffer(req);
  const rawBody = buf.toString('utf8');
  
  // Get the Stripe signature from headers
  const signature = req.headers['stripe-signature'];
  
  let event;

  try {
    // Verify and construct the webhook event
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return res.status(400).json({ error: `Webhook Error: ${error.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Get user ID from the metadata or client_reference_id
        const userId = session.metadata.userId || session.client_reference_id;
        const planId = session.metadata.planId;
        
        if (!userId) {
          throw new Error('No user ID found in session');
        }
        
        // Get subscription details from Stripe if this is a subscription (not one-time)
        let stripeSubscriptionId = null;
        let currentPeriodEnd = new Date();
        
        if (session.mode === 'subscription' && session.subscription) {
          // Fetch subscription details from Stripe
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          stripeSubscriptionId = subscription.id;
          
          // Calculate the end date from current_period_end
          currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        } else {
          // For one-time payments, set expiry to 30 days from now
          currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
        }
        
        // Get the plan to determine max_resumes and other settings
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: planId },
        });
        
        if (!plan) {
          throw new Error(`Plan not found: ${planId}`);
        }
        
        // Create or update subscription in our database
        const userSubscription = await prisma.userSubscription.create({
          data: {
            userId: userId,
            planId: planId,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: currentPeriodEnd,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: stripeSubscriptionId,
            stripePaymentIntentId: session.payment_intent,
          },
        });
        
        // Update the user's plan type and expiration date
        await prisma.user.update({
          where: { id: userId },
          data: {
            planType: plan.interval === 'one-time' ? 'one-time' : 'subscription',
            planExpirationDate: currentPeriodEnd,
          },
        });
        
        console.log(`Payment successful: Created subscription for user ${userId}`);
        break;
      }
      
      case 'invoice.payment_succeeded': {
        // Handle subscription renewal
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata.userId;
        
        if (userId) {
          // Find the user's subscription
          const userSubscription = await prisma.userSubscription.findFirst({
            where: {
              stripeSubscriptionId: invoice.subscription,
              userId: userId,
            },
          });
          
          if (userSubscription) {
            // Update subscription period
            await prisma.userSubscription.update({
              where: { id: userSubscription.id },
              data: {
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                status: 'active',
                updatedAt: new Date(),
              },
            });
            
            // Update user's plan expiration date
            await prisma.user.update({
              where: { id: userId },
              data: {
                planExpirationDate: new Date(subscription.current_period_end * 1000),
              },
            });
            
            console.log(`Subscription renewed for user ${userId}`);
          }
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        // Handle subscription cancellation
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;
        
        if (userId) {
          // Update subscription status
          await prisma.userSubscription.updateMany({
            where: {
              stripeSubscriptionId: subscription.id,
              userId: userId,
            },
            data: {
              status: 'canceled',
              updatedAt: new Date(),
            },
          });
          
          console.log(`Subscription canceled for user ${userId}`);
        }
        break;
      }
    }
    
    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    return res.status(500).json({ error: 'Error processing webhook' });
  }
} 