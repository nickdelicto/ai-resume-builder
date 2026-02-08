require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

  // Default subscription plans
  // Note: One-time plan removed - we now only offer weekly and monthly subscriptions
  // See lib/constants/pricing.js for the source of truth on pricing strategy
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro',
      description: 'Best value for extended job search',
      price: 19.99,
      interval: 'monthly',
      isPopular: true,
      isActive: true,
      features: [
        'Unlimited resume downloads',
        'Create multiple versions',
        'All premium templates',
        'AI-powered improvements',
        'Job targeting & tailoring',
        'Save 37% vs weekly'
      ]
    },
    {
      id: 'weekly',
      name: 'Weekly Pro',
      description: 'Perfect for active job seekers on short-term search',
      price: 7.99,
      interval: 'weekly',
      isPopular: false,
      isActive: true,
      features: [
        'Unlimited resume downloads',
        'Create multiple versions',
        'All premium templates',
        'AI-powered improvements',
        'Job targeting & tailoring',
        'Save 37% vs weekly'
      ]
    }
  ];

  // Create or update each plan
  for (const plan of plans) {
    try {
      // Check if plan with this ID already exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: plan.id }
      });

      if (existingPlan) {
        // Update existing plan
        console.log(`Updating plan: ${plan.name}`);
        await prisma.subscriptionPlan.update({
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
        console.log(`Creating plan: ${plan.name}`);
        await prisma.subscriptionPlan.create({
          data: plan
        });
      }
    } catch (error) {
      console.error(`Error processing plan ${plan.name}:`, error);
    }
  }

  // Mark any legacy one-time plans as inactive
  // (we're no longer offering one-time purchases, but existing subscribers keep access)
  try {
    const oneTimePlan = await prisma.subscriptionPlan.findUnique({
      where: { id: 'one-time' }
    });
    if (oneTimePlan && oneTimePlan.isActive) {
      await prisma.subscriptionPlan.update({
        where: { id: 'one-time' },
        data: { isActive: false }
      });
      console.log('Marked legacy one-time plan as inactive');
    }
  } catch (e) {
    // Plan might not exist, that's fine
    console.log('No legacy one-time plan found (this is expected for new installs)');
  }

  console.log('Subscription plans seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 