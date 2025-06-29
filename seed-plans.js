require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

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