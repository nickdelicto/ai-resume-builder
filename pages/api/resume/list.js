import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get all resumes for the current user
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

    // Get all resumes for this user
    const resumes = await prisma.resumeData.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        template: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Return the resumes with success flag
    return res.status(200).json({
      success: true,
      count: resumes.length,
      resumes: resumes
    });
  } catch (error) {
    console.error('Error fetching user resumes:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
} 