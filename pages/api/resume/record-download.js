import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to record a resume download
 * This is particularly important for one-time plan users to track which resume they've downloaded
 * 
 * Request body:
 * - resumeId: The ID of the resume being downloaded (required)
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated',
        message: 'You need to be signed in to record a download'
      });
    }

    // Get resumeId from request body
    const { resumeId } = req.body;

    // Validate resumeId
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing resumeId',
        message: 'Resume ID is required'
      });
    }

    // Verify that the resume exists and belongs to the user
    const resume = await prisma.resumeData.findFirst({
      where: {
        id: resumeId,
        userId: session.user.id
      }
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found',
        message: 'The specified resume does not exist or does not belong to you'
      });
    }

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

    // If no active subscription found, check for any recent subscription
    const subscriptionToUpdate = userSubscription || await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        plan: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // MODIFICATION: Find all active one-time plans for this user
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
            metadata: {
              path: ['isPerpetual'],
              equals: true
            }
          }
        ]
      }
    });

    // Only proceed with recording if we have a subscription
    if (subscriptionToUpdate) {
      // Get user information to check plan type directly
      const user = await prisma.user.findUnique({
        where: {
          id: session.user.id
        }
      });
      
      // Check if this is a one-time plan from either subscription or user data
      const isPlanOneTime = 
        (subscriptionToUpdate.plan?.id === 'one-time') || 
        (subscriptionToUpdate.planId === 'one-time') ||
        (user?.planType === 'one-time');
      
      // Add debug logging
      console.log('🔍 Debug - Subscription data:', {
        planId: subscriptionToUpdate.planId,
        planFromRelation: subscriptionToUpdate.plan?.id,
        userPlanType: user?.planType,
        isPlanOneTime: isPlanOneTime,
        oneTimePlansCount: allOneTimePlans.length
      });

      // Check if this is a one-time plan
      if (isPlanOneTime) {
        console.log('🎯 Recording download for one-time plan user:', session.user.id);
        console.log('📄 Resume ID being downloaded:', resumeId);
        
        // MODIFICATION: Check if any of the one-time plans already has this resume ID
        if (allOneTimePlans.length > 0) {
          const matchingPlan = allOneTimePlans.find(plan => 
            plan.metadata?.downloadedResumeId === resumeId
          );
          
          if (matchingPlan) {
            console.log('🔄 Found matching one-time plan for this resume, updating timestamp');
            
            // Update the matching plan with the latest download timestamp
            const currentMetadata = matchingPlan.metadata || {};
            const updatedMetadata = {
              ...currentMetadata,
              lastDownloadedAt: new Date().toISOString()
            };
            
            await prisma.userSubscription.update({
              where: {
                id: matchingPlan.id
              },
              data: {
                metadata: updatedMetadata
              }
            });
            
            return res.status(200).json({
              success: true,
              message: 'Download recorded successfully for existing one-time plan',
              isFirstDownload: false
            });
          }
          
          // If no matching plan was found, check for an unused one-time plan
          const unusedPlan = allOneTimePlans.find(plan => 
            !plan.metadata?.downloadedResumeId
          );
          
          if (unusedPlan) {
            console.log('🆕 Using unused one-time plan for first download of this resume');
            
            // Update the unused plan with this resume ID
            const currentMetadata = unusedPlan.metadata || {};
            const updatedMetadata = {
              ...currentMetadata,
              downloadedResumeId: resumeId,
              firstDownloadedAt: new Date().toISOString()
            };
            
            await prisma.userSubscription.update({
              where: {
                id: unusedPlan.id
              },
              data: {
                metadata: updatedMetadata
              }
            });
            
            return res.status(200).json({
              success: true,
              message: 'Download recorded successfully with unused one-time plan',
              isFirstDownload: true
            });
          }
          
          // If we get here, the user has one-time plans but none match this resume
          // and there are no unused plans
          console.log('❌ User has one-time plans but none match or are unused for this resume');
          return res.status(403).json({
            success: false,
            error: 'One-time download limit',
            message: 'Your one-time plans are already used for other resumes. Purchase another plan to download this resume.',
          });
        }
        
        // Fall back to original logic if no one-time plans were found
        // Check if this is the first download (no downloadedResumeId in metadata)
        const currentMetadata = subscriptionToUpdate.metadata || {};
        
        if (!currentMetadata.downloadedResumeId) {
          // This is the first download, update the metadata
          const updatedMetadata = {
            ...currentMetadata,
            downloadedResumeId: resumeId,
            firstDownloadedAt: new Date().toISOString()
          };
          
          console.log('🆕 First download - updating metadata with downloaded resume ID:', resumeId);
          
          // Update the subscription with the downloaded resume ID
          await prisma.userSubscription.update({
            where: {
              id: subscriptionToUpdate.id
            },
            data: {
              metadata: updatedMetadata
            }
          });
          
          return res.status(200).json({
            success: true,
            message: 'Download recorded successfully',
            isFirstDownload: true
          });
        } else {
          // This is a subsequent download, check if it's the same resume
          if (currentMetadata.downloadedResumeId === resumeId) {
            console.log('🔄 User is downloading the same resume again:', resumeId);
            
            // Update the metadata with the latest download timestamp
            const updatedMetadata = {
              ...currentMetadata,
              lastDownloadedAt: new Date().toISOString()
            };
            
            // Update the subscription with the new timestamp
            await prisma.userSubscription.update({
              where: {
                id: subscriptionToUpdate.id
              },
              data: {
                metadata: updatedMetadata
              }
            });
            
            return res.status(200).json({
              success: true,
              message: 'Download recorded successfully',
              isFirstDownload: false
            });
          } else {
            // User is trying to download a different resume
            console.log('❌ User is trying to download a different resume:', resumeId);
            console.log('⚠️ Previously downloaded resume:', currentMetadata.downloadedResumeId);
            
            return res.status(403).json({
              success: false,
              error: 'One-time download limit',
              message: 'Your one-time plan only allows downloading the resume you previously selected',
              downloadedResumeId: currentMetadata.downloadedResumeId
            });
          }
        }
      } else {
        // For non-one-time plans, just record the download without restrictions
        console.log('📊 Recording download for regular subscription user:', session.user.id);
        
        // Update the metadata with the latest download
        const currentMetadata = subscriptionToUpdate.metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          lastDownloadedResumeId: resumeId,
          lastDownloadedAt: new Date().toISOString()
        };
        
        // Update the subscription with the new download info
        await prisma.userSubscription.update({
          where: {
            id: subscriptionToUpdate.id
          },
          data: {
            metadata: updatedMetadata
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Download recorded successfully'
        });
      }
    } else {
      // No subscription found, but we can still record the download in user metadata
      // This is a fallback for users who might have planType set directly
      console.log('No subscription found, checking user planType');

      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      if (user && user.planType === 'one-time') {
        console.log('User has one-time plan type, recording download');
        
        // Since we can't store metadata on the User model directly,
        // we'll create a KVStore entry to track the download
        const kvKey = `user_${session.user.id}_one_time_download`;
        
        const existingRecord = await prisma.kVStore.findUnique({
          where: {
            key: kvKey
          }
        });
        
        if (!existingRecord) {
          // First download, create a new record
          await prisma.kVStore.create({
            data: {
              key: kvKey,
              value: resumeId,
              metadata: {
                firstDownloadedAt: new Date().toISOString()
              }
            }
          });
          
          return res.status(200).json({
            success: true,
            message: 'Download recorded successfully in KVStore',
            isFirstDownload: true
          });
        } else {
          // Subsequent download, check if it's the same resume
          if (existingRecord.value === resumeId) {
            // Update the timestamp
            await prisma.kVStore.update({
              where: {
                key: kvKey
              },
              data: {
                metadata: {
                  ...existingRecord.metadata,
                  lastDownloadedAt: new Date().toISOString()
                }
              }
            });
            
            return res.status(200).json({
              success: true,
              message: 'Download recorded successfully in KVStore',
              isFirstDownload: false
            });
          } else {
            // Different resume, reject
            return res.status(403).json({
              success: false,
              error: 'One-time download limit',
              message: 'Your one-time plan only allows downloading the resume you previously selected',
              downloadedResumeId: existingRecord.value
            });
          }
        }
      } else {
        // For free-tier users, check if they can use their free download
        if (!user?.planType || user.planType === 'free') {
          if (!user.freeDownloadsUsed || user.freeDownloadsUsed < 1) {
            console.log('🆓 Recording free download for user:', session.user.id);
            await prisma.user.update({
              where: { id: session.user.id },
              data: { freeDownloadsUsed: { increment: 1 } }
            });
            return res.status(200).json({
              success: true,
              message: 'Free download recorded',
              isFreeDownload: true
            });
          }

          console.log('⛔ User has already used their free download - rejecting');
          return res.status(403).json({
            success: false,
            error: 'free_download_limit_reached',
            message: 'You\'ve used your free download. Upgrade for unlimited downloads.'
          });
        }
        
        // For users with other plan types but no subscription record, just acknowledge the download
        console.log('⚠️ User has plan type but no subscription record:', user.planType);
        return res.status(200).json({
          success: true,
          message: 'Download acknowledged (no subscription found)'
        });
      }
    }
  } catch (error) {
    console.error('Error recording download:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An error occurred while recording the download'
    });
  }
} 