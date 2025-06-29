import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to initialize subscription plans in the database.
 * This should be restricted to admin users in production.
 * For demo purposes, this will create or update the three subscription plans.
 */
export default async function handler(req, res) {
  // Restrict to POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, this should check for admin privileges
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Default subscription plans
    const plans = [
      {
        id: 'one-time',
        name: 'One-Time Download',
        description: 'Make a single resume and download it once',
        price: 6.99,
        interval: 'one-time',
        isPopular: false,
        isActive: true,
        features: [
          'One professional resume download',
          'ATS-optimized format',
          'All professional templates',
          'One time payment- No renewal!'
        ]
      },
      {
        id: 'weekly',
        name: 'Short-Term Job Hunt',
        description: 'Ideal for short-term job search',
        price: 4.99,
        interval: 'weekly',
        isPopular: true,
        isActive: true,
        features: [
          'Unlimited resume downloads',
          'Create multiple versions',
          'All premium templates',
          'Best for short-term job search'
        ]
      },
      {
        id: 'monthly',
        name: 'Long-Term Job Hunt',
        description: 'Ideal for long-term job seekers',
        price: 13.99,
        interval: 'monthly',
        isPopular: false,
        isActive: true,
        features: [
          'Unlimited resume downloads',
          'Tailor for multiple jobs',
          'All premium templates',
          'Best for long-term job search'
        ]
      }
    ];

    // Create or update each plan
    const createdPlans = await Promise.all(
      plans.map(async (plan) => {
        // Check if plan with this ID already exists
        const existingPlan = await prisma.subscriptionPlan.findUnique({
          where: { id: plan.id }
        });

        if (existingPlan) {
          // Update existing plan
          return prisma.subscriptionPlan.update({
            where: { id: existingPlan.id },
            data: {
              name: plan.name,
              description: plan.description,
              price: plan.price,
              interval: plan.interval,
              isPopular: plan.isPopular,
              isActive: plan.isActive,
              features: plan.features
            }
          });
        } else {
          // Create new plan
          return prisma.subscriptionPlan.create({
            data: plan
          });
        }
      })
    );

    return res.status(200).json({
      message: 'Subscription plans created/updated successfully',
      plans: createdPlans
    });
  } catch (error) {
    console.error('Error creating subscription plans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 