import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to check if a user is eligible to download a resume
 * This checks if they have an active subscription
 * 
 * Query parameters:
 * - resumeId: The ID of the resume being downloaded (optional)
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
      return res.status(401).json({ 
        eligible: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to download a resume'
      });
    }
    
    // Get resumeId from query parameters if provided
    const { resumeId } = req.query;
    
    console.log('📋 Check download eligibility for resumeId:', resumeId || 'none provided');

    // Check if user has an active subscription
    const userSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
        currentPeriodEnd: {
          gte: new Date()
        }
      },
      include: {
        plan: true
      }
    });

    // Check if user has plan expiration date in the future
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    // Check if user has non-free plan with expiration date in the future
    const hasPlanExpiration = user?.planExpirationDate && 
                             new Date(user.planExpirationDate) > new Date() && 
                             user.planType !== 'free'; // Exclude free plans

    // Check for any recent subscription (created in the last 5 minutes)
    // This helps with race conditions where the webhook hasn't fully processed yet
    const recentSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        }
      },
      include: {
        plan: true
      }
    });

    // MODIFICATION: Find all active one-time plan subscriptions for this user
    const allOneTimePlans = await prisma.userSubscription.findMany({
      where: {
        userId: session.user.id,
        planId: 'one-time',
        OR: [
          {
            status: 'active',
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          {
            // Include canceled subscriptions that still have valid expiration dates
            status: 'canceled',
            currentPeriodEnd: {
              gte: new Date()
            }
          },
          {
            // Include any subscription marked as perpetual regardless of other fields
            // BUT ONLY for one-time plans (this is already filtered by planId: 'one-time' above)
            metadata: {
              path: ['isPerpetual'],
              equals: true
            }
          }
        ]
      }
    });

    // If user has an active subscription or unexpired plan, they are eligible
    if (userSubscription || hasPlanExpiration || recentSubscription) {
      // Determine the plan ID to return
      let planId = null;
      let subscriptionToUse = null;
      
      // Priority: active subscription > recent subscription > user plan type
      if (userSubscription?.plan?.id) {
        planId = userSubscription.plan.id;
        subscriptionToUse = userSubscription;
      } else if (recentSubscription?.plan?.id) {
        planId = recentSubscription.plan.id;
        subscriptionToUse = recentSubscription;
      } else if (user.planType) {
        planId = user.planType;
      }
      
      console.log('💲 User plan type:', planId);
      console.log('📊 Debug - User plan details:', {
        userPlanType: user.planType,
        activeSubscriptionPlan: userSubscription?.plan?.id,
        recentSubscriptionPlan: recentSubscription?.plan?.id,
        finalPlanId: planId,
        oneTimePlansCount: allOneTimePlans.length
      });
      
      // Special handling for one-time plan
      if (planId === 'one-time') {
        console.log('🎯 One-time plan detected, checking download history');
        
        // MODIFICATION: If resumeId is provided, check all one-time plans to see if any match
        if (resumeId && allOneTimePlans.length > 0) {
          // Check if any of the one-time plans have this resume ID in their metadata
          const matchingPlan = allOneTimePlans.find(plan => 
            plan.metadata?.downloadedResumeId === resumeId
          );
          
          if (matchingPlan) {
            console.log('✅ Found matching one-time plan for resume ID:', resumeId);
            return res.status(200).json({
              eligible: true,
              message: 'User is eligible to download this resume with an existing one-time plan',
              plan: 'one-time',
              downloadedResumeId: resumeId,
              expirationDate: matchingPlan.currentPeriodEnd
            });
          }
          
          // Check if this is a new download for an unused one-time plan
          const unusedPlan = allOneTimePlans.find(plan => 
            !plan.metadata?.downloadedResumeId
          );
          
          if (unusedPlan) {
            console.log('🆕 Found unused one-time plan for first download');
            return res.status(200).json({
              eligible: true,
              message: 'User is eligible for their one-time download with an unused plan',
              plan: 'one-time',
              isFirstDownload: true,
              subscriptionId: unusedPlan.id,
              expirationDate: unusedPlan.currentPeriodEnd
            });
          }
          
          // If we get here, the user has one-time plans but none match this resume
          // and there are no unused plans
          console.log('❌ User has one-time plans but none match this resume ID:', resumeId);
          return res.status(200).json({
            eligible: false,
            error: 'different_resume_needs_plan',
            message: 'To download this resume, you need to purchase another one-time plan',
            plan: 'one-time',
            needsPlan: true,
            currentResumeId: resumeId
          });
        }
        
        // Continue with original logic for the most recent subscription if no resumeId provided
        // or if we couldn't find any one-time plans (fallback)
        const downloadedResumeId = subscriptionToUse?.metadata?.downloadedResumeId;
        
        if (downloadedResumeId) {
          console.log('📄 User has already downloaded resume with ID:', downloadedResumeId);
          
          // If resumeId is provided, check if it matches the previously downloaded resume
          if (resumeId && resumeId !== downloadedResumeId) {
            console.log('❌ User is trying to download a different resume:', resumeId);
            return res.status(200).json({
              eligible: false,
              error: 'different_resume_needs_plan',
              message: 'To download a different resume, you need to purchase another plan',
              plan: planId,
              downloadedResumeId: downloadedResumeId,
              currentResumeId: resumeId,
              needsPlan: true,
              expirationDate: subscriptionToUse?.currentPeriodEnd || user.planExpirationDate
            });
          }
          
          // If it's the same resume or no resumeId provided, allow the download
          console.log('✅ User is downloading the same resume or no specific resumeId provided');
          return res.status(200).json({
            eligible: true,
            message: 'User is eligible to download the previously selected resume',
            plan: planId,
            downloadedResumeId: downloadedResumeId,
            expirationDate: subscriptionToUse?.currentPeriodEnd || user.planExpirationDate
          });
        } else {
          // First download for one-time plan
          console.log('🆕 First download for one-time plan user');
          return res.status(200).json({
            eligible: true,
            message: 'User is eligible for their one-time download',
            plan: planId,
            isFirstDownload: true,
            expirationDate: subscriptionToUse?.currentPeriodEnd || user.planExpirationDate
          });
        }
      }
      
      // For non-one-time plans, proceed as normal
      return res.status(200).json({
        eligible: true,
        message: 'User is eligible to download',
        plan: planId,
        expirationDate: userSubscription?.currentPeriodEnd || recentSubscription?.currentPeriodEnd || user.planExpirationDate
      });
    }

    // IMPORTANT: Check if user has a non-free plan type set directly in the user table
    if (user.planType && user.planType !== 'free') {
      // Only consider valid if the plan hasn't expired
      if (user.planExpirationDate && new Date(user.planExpirationDate) > new Date()) {
        console.log('User has non-free plan type with valid expiration date:', {
          planType: user.planType,
          expirationDate: user.planExpirationDate
        });
        
        // Special handling for one-time plan in user.planType
        if (user.planType === 'one-time') {
          // Since we don't have a subscription record, check if the user has metadata about downloaded resume
          // This would be a fallback if the subscription record is missing
          
          // For now, we'll allow the download but flag it as first download
          // A separate endpoint will need to update the user record after download
          return res.status(200).json({
            eligible: true,
            message: 'User is eligible for their one-time download (from user record)',
            plan: user.planType,
            isFirstDownload: true,
            expirationDate: user.planExpirationDate
          });
        }
        
        return res.status(200).json({
          eligible: true,
          message: 'User has non-free plan type',
          plan: user.planType,
          expirationDate: user.planExpirationDate
        });
      } else {
        console.log('User has non-free plan type but it has expired or has no expiration date:', {
          planType: user.planType,
          expirationDate: user.planExpirationDate
        });
      }
    }

    // Check if user is eligible for a free download (1 free download for free-tier users)
    if (!user.freeDownloadsUsed || user.freeDownloadsUsed < 1) {
      console.log('🆓 User eligible for free download (used:', user.freeDownloadsUsed || 0, ')');
      return res.status(200).json({
        eligible: true,
        plan: 'free',
        isFreeDownload: true,
        message: 'You have 1 free download available'
      });
    }

    // If no active subscription and free download used, they are not eligible
    console.log('⛔ User has no active subscription and free download used - returning NOT eligible');
    return res.status(200).json({
      eligible: false,
      error: 'free_download_used',
      message: 'You\'ve used your free download. Upgrade for unlimited downloads.'
    });
  } catch (error) {
    console.error('Error checking download eligibility:', error);
    return res.status(500).json({ 
      eligible: false,
      error: 'Internal server error',
      message: 'An error occurred checking eligibility'
    });
  }
} 