// Script to set up early adopter discounts
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Setting up early adopter discounts...');
    
    // Step 1: Run the migration
    console.log('\n1. Running database migration...');
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('Migration completed successfully.');
    } catch (error) {
      console.error('Error running migration:', error);
      process.exit(1);
    }
    
    // Step 2: Initialize discount tiers
    console.log('\n2. Initializing discount tiers...');
    
    // Check if tiers already exist
    const existingTiers = await prisma.discountTier.findMany();
    
    if (existingTiers.length > 0) {
      console.log(`Found ${existingTiers.length} existing discount tiers. Skipping initialization.`);
      console.table(existingTiers.map(tier => ({
        tierNumber: tier.tierNumber,
        discountPercentage: tier.discountPercentage,
        maxUsers: tier.maxUsers,
        currentCount: tier.currentCount,
        isActive: tier.isActive
      })));
    } else {
      // Create the three tiers
      const tiers = [
        {
          tierNumber: 1,
          discountPercentage: 70,
          maxUsers: 10,
          isActive: true
        },
        {
          tierNumber: 2,
          discountPercentage: 50,
          maxUsers: 10,
          isActive: true
        },
        {
          tierNumber: 3,
          discountPercentage: 30,
          maxUsers: 10,
          isActive: true
        }
      ];
      
      for (const tier of tiers) {
        await prisma.discountTier.create({
          data: tier
        });
        console.log(`Created tier ${tier.tierNumber} with ${tier.discountPercentage}% discount for ${tier.maxUsers} users.`);
      }
      
      console.log('All discount tiers created successfully.');
    }
    
    // Step 3: Check current discount usage
    console.log('\n3. Checking current discount usage...');
    
    const discountTiers = await prisma.discountTier.findMany({
      orderBy: { tierNumber: 'asc' }
    });
    
    const userDiscounts = await prisma.userEarlyAdopterDiscount.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        discountTier: true
      }
    });
    
    console.log(`Found ${userDiscounts.length} users with early adopter discounts.`);
    
    if (userDiscounts.length > 0) {
      console.table(userDiscounts.map(discount => ({
        userEmail: discount.user.email,
        planType: discount.planType,
        discountPercentage: discount.discountPercentage,
        tierNumber: discount.discountTier.tierNumber,
        appliedAt: discount.appliedAt.toLocaleString()
      })));
    }
    
    // Display current tier status
    console.log('\nCurrent tier status:');
    console.table(discountTiers.map(tier => ({
      tierNumber: tier.tierNumber,
      discountPercentage: tier.discountPercentage,
      maxUsers: tier.maxUsers,
      currentCount: tier.currentCount,
      remaining: tier.maxUsers - tier.currentCount,
      isActive: tier.isActive
    })));
    
    console.log('\nEarly adopter discount setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up early adopter discounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 