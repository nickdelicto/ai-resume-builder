import { buffer } from 'micro';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';

// Disable body parsing, need the raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
    return;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Missing Stripe webhook secret' });
  }

  try {
    // Get the raw body as a buffer
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    // Verify the event came from Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      // Add more event handlers as needed
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Webhook error: ${err.message}`);
    res.status(500).json({ error: `Webhook Error: ${err.message}` });
  }
}

/**
 * Handle subscription creation events
 */
async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  try {
    // Find the user subscription in our database
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id
      },
      include: {
        discounts: {
          where: { isActive: true }
        }
      }
    });

    if (!userSubscription) {
      console.log(`No matching subscription found for Stripe ID: ${subscription.id}`);
      return;
    }

    // Update our database with the latest subscription details
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

/**
 * Handle subscription update events
 * This is important for maintaining discounts across renewals
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Find the user subscription in our database
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id
      },
      include: {
        discounts: {
          where: { isActive: true }
        },
        plan: true
      }
    });

    if (!userSubscription) {
      console.log(`No matching subscription found for Stripe ID: ${subscription.id}`);
      return;
    }

    // Update our database with the latest subscription details
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    // Check if there's an active discount that needs to be maintained
    if (userSubscription.discounts.length > 0) {
      const activeDiscount = userSubscription.discounts[0];
      
      // Check if the Stripe subscription has the discount applied
      const hasDiscount = subscription.discount && 
                          subscription.discount.coupon && 
                          subscription.discount.coupon.percent_off === activeDiscount.discountPercent;
      
      // If the discount is missing in Stripe but present in our DB, reapply it
      if (!hasDiscount && activeDiscount.stripeCouponId) {
        console.log(`Reapplying discount ${activeDiscount.discountPercent}% to subscription ${subscription.id}`);
        
        try {
          // Check if the coupon still exists in Stripe
          let couponId = activeDiscount.stripeCouponId;
          
          try {
            await stripe.coupons.retrieve(couponId);
          } catch (couponError) {
            // If the coupon doesn't exist, create a new one
            console.log('Coupon not found in Stripe, creating a new one');
            const newCoupon = await stripe.coupons.create({
              percent_off: activeDiscount.discountPercent,
              duration: 'forever',
              name: `Retention ${activeDiscount.discountPercent}% Off`
            });
            couponId = newCoupon.id;
            
            // Update our discount record with the new coupon ID
            await prisma.subscriptionDiscount.update({
              where: { id: activeDiscount.id },
              data: { stripeCouponId: couponId }
            });
          }
          
          // Apply the coupon to the subscription
          await stripe.subscriptions.update(subscription.id, {
            coupon: couponId
          });
          
          console.log('Successfully reapplied discount in Stripe');
        } catch (stripeError) {
          console.error('Error reapplying discount in Stripe:', stripeError);
        }
      }
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

/**
 * Handle subscription deletion events
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  try {
    // Find the user subscription in our database
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: subscription.id
      }
    });

    if (!userSubscription) {
      console.log(`No matching subscription found for Stripe ID: ${subscription.id}`);
      return;
    }

    // Update our database to mark the subscription as inactive
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        status: 'canceled'
      }
    });
    
    // Also mark any active discounts as inactive
    await prisma.subscriptionDiscount.updateMany({
      where: {
        subscriptionId: userSubscription.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

/**
 * Handle invoice payment succeeded events
 * This is important for tracking successful renewals with discounts
 */
async function handleInvoicePaymentSucceeded(invoice) {
  if (!invoice.subscription) {
    return; // Not subscription-related
  }
  
  console.log('Invoice payment succeeded for subscription:', invoice.subscription);
  
  try {
    // Retrieve the subscription details from Stripe to get current_period_end
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
    
    // Find the user subscription in our database
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        stripeSubscriptionId: invoice.subscription
      },
      include: {
        discounts: {
          where: { isActive: true }
        },
        plan: true
      }
    });

    if (!userSubscription) {
      console.log(`No matching subscription found for Stripe ID: ${invoice.subscription}`);
      return;
    }
    
    // Update the subscription periods in our database
    await prisma.userSubscription.update({
      where: { id: userSubscription.id },
      data: {
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        status: 'active',
        updatedAt: new Date()
      }
    });
    
    // CRITICAL FIX: Update the user's planType and planExpirationDate
    // This was missing and causing users to revert to free plan after renewal
    await prisma.user.update({
      where: { id: userSubscription.userId },
      data: {
        planType: userSubscription.planId, // Use the plan ID from the subscription
        planExpirationDate: new Date(stripeSubscription.current_period_end * 1000)
      }
    });
    
    console.log(`Updated user ${userSubscription.userId} plan to ${userSubscription.planId} with expiration ${new Date(stripeSubscription.current_period_end * 1000)}`);

    // Check if there's an active discount
    if (userSubscription.discounts.length > 0) {
      const activeDiscount = userSubscription.discounts[0];
      
      // Log the successful renewal with discount
      await prisma.userEvent.create({
        data: {
          userId: userSubscription.userId,
          type: 'subscription_renewed_with_discount',
          metadata: {
            subscriptionId: userSubscription.id,
            invoiceId: invoice.id,
            discountId: activeDiscount.id,
            discountPercent: activeDiscount.discountPercent,
            amountPaid: invoice.amount_paid / 100, // Stripe amounts are in cents
            currency: invoice.currency
          }
        }
      }).catch(err => {
        console.error('Error logging renewal event:', err);
      });
    } else {
      // Log standard renewal without discount
      await prisma.userEvent.create({
        data: {
          userId: userSubscription.userId,
          type: 'subscription_renewed',
          metadata: {
            subscriptionId: userSubscription.id,
            invoiceId: invoice.id,
            amountPaid: invoice.amount_paid / 100,
            currency: invoice.currency
          }
        }
      }).catch(err => {
        console.error('Error logging standard renewal event:', err);
      });
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
} 