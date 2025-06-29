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
    console.log(`Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', {
          id: session.id,
          customer: session.customer,
          metadata: session.metadata,
          mode: session.mode
        });
        
        // Get user ID from the metadata or client_reference_id
        const userId = session.metadata.userId || session.client_reference_id;
        const planId = session.metadata.planId;
        const isDownloadAction = session.metadata.action === 'download';
        
        console.log('Processing subscription for:', {
          userId,
          planId,
          isDownloadAction
        });
        
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
          // For one-time payments
          if (planId === 'one-time') {
            // Set to a far future date for perpetual access
            currentPeriodEnd = new Date('2099-12-31');
          } else {
            // Other one-time payments get 30 days
          currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);
          }
        }
        
        // Check if this is an upgrade or downgrade (has previous subscription)
        const previousSubscriptionId = session.metadata.previousSubscriptionId;
        const isUpgrade = session.metadata.isUpgrade === 'true';
        const isDowngrade = session.metadata.isDowngrade === 'true';
        
        // If this is an upgrade or downgrade, cancel the previous subscription
        if (previousSubscriptionId) {
          console.log(`Plan change detected: ${isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Change'} from previous subscription ${previousSubscriptionId}`);
          
          try {
            // Find the previous subscription in our database
            const previousSubscription = await prisma.userSubscription.findUnique({
              where: { id: previousSubscriptionId }
            });
            
            if (previousSubscription) {
              // If there's a Stripe subscription ID, cancel it in Stripe
              if (previousSubscription.stripeSubscriptionId) {
                try {
                  console.log(`Canceling previous Stripe subscription: ${previousSubscription.stripeSubscriptionId}`);
                  await stripe.subscriptions.cancel(previousSubscription.stripeSubscriptionId);
                  console.log('Successfully canceled previous subscription in Stripe');
                } catch (stripeError) {
                  console.error('Error canceling previous subscription in Stripe:', stripeError);
                  // Continue with local cancellation even if Stripe API call fails
                }
              }
              
              // Update the previous subscription status in our database
              await prisma.userSubscription.update({
                where: { id: previousSubscriptionId },
                data: {
                  status: 'canceled',
                  canceledAt: new Date(),
                  metadata: {
                    ...previousSubscription.metadata,
                    cancelReason: isUpgrade ? 'upgraded' : 'downgraded',
                    upgradedToSubscriptionId: null // Will be set after new subscription is created
                  }
                }
              });
              
              console.log(`Marked previous subscription ${previousSubscriptionId} as canceled in database`);
            } else {
              console.log(`Previous subscription ${previousSubscriptionId} not found in database`);
            }
          } catch (error) {
            console.error(`Error handling previous subscription cancellation: ${error.message}`);
            // Continue with new subscription creation even if there's an error with the previous one
          }
        }
        
        // Get the plan to determine max_resumes and other settings
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: planId },
        });
        
        if (!plan) {
          throw new Error(`Plan not found: ${planId}`);
        }
        
        // Prepare metadata for one-time plans
        let subscriptionMetadata = {};
        if (planId === 'one-time') {
          subscriptionMetadata = {
            isPerpetual: true
          };
        }
        
        // If this is an upgrade or downgrade, add that info to the metadata
        if (previousSubscriptionId) {
          subscriptionMetadata = {
            ...subscriptionMetadata,
            previousSubscriptionId: previousSubscriptionId,
            isUpgrade: isUpgrade,
            isDowngrade: isDowngrade,
            planChangeDate: new Date().toISOString()
          };
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
            metadata: subscriptionMetadata
          },
        });
        
        console.log('Created user subscription:', {
          id: userSubscription.id,
          userId: userSubscription.userId,
          planId: userSubscription.planId,
          status: userSubscription.status
        });
        
        // If this was a plan change, update the previous subscription with a reference to this new one
        if (previousSubscriptionId) {
          try {
            await prisma.userSubscription.update({
              where: { id: previousSubscriptionId },
              data: {
                metadata: {
                  upgradedToSubscriptionId: userSubscription.id,
                  upgradedToPlanId: planId,
                  upgradedAt: new Date().toISOString()
                }
              }
            });
            console.log(`Updated previous subscription ${previousSubscriptionId} with reference to new subscription ${userSubscription.id}`);
          } catch (error) {
            console.error(`Error updating previous subscription reference: ${error.message}`);
            // Continue even if this update fails
          }
        }
        
        // Update the user's plan type and expiration date
        await prisma.user.update({
          where: { id: userId },
          data: {
            planType: plan.id,
            planExpirationDate: currentPeriodEnd,
          },
        });
        
        console.log('Updated user plan type:', {
          userId,
          planType: plan.id,
          planExpirationDate: currentPeriodEnd
        });
        
        // If this was a download action, find the user's most recent resume
        // and store its ID in the subscription metadata for easy access
        if (isDownloadAction) {
          try {
            const mostRecentResume = await prisma.resumeData.findFirst({
              where: { userId: userId },
              orderBy: { updatedAt: 'desc' },
              select: { id: true }
            });
            
            if (mostRecentResume) {
              // Update the subscription with the most recent resume ID
              await prisma.userSubscription.update({
                where: { id: userSubscription.id },
                data: {
                  metadata: {
                    mostRecentResumeId: mostRecentResume.id,
                    isDownloadAction: true
                  }
                }
              });
              
              console.log(`Download action: Found most recent resume ${mostRecentResume.id} for user ${userId}`);
            } else {
              console.log(`Download action: No resumes found for user ${userId}`);
              
              // Even if no resume was found, still mark this as a download action
              await prisma.userSubscription.update({
                where: { id: userSubscription.id },
                data: {
                  metadata: {
                    isDownloadAction: true
                  }
                }
              });
            }
          } catch (error) {
            console.error(`Error finding most recent resume: ${error.message}`);
            // Continue even if there's an error finding the resume
          }
        }
        
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