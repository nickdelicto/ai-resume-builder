import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get the user's latest subscription with download action
 * Used after payment to find the most recent resume for download
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the most recent subscription with download action metadata
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'active',
        metadata: {
          not: null
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Check if the subscription has the isDownloadAction flag in metadata
    let hasDownloadAction = false;
    if (subscription?.metadata) {
      try {
        const metadata = subscription.metadata;
        hasDownloadAction = metadata.isDownloadAction === true;
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }
    }

    // Return the subscription data
    return res.status(200).json({
      success: true,
      subscription: hasDownloadAction ? subscription : null
    });
  } catch (error) {
    console.error('Error getting latest subscription:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
} 