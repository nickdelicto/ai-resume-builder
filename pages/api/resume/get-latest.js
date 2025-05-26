import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get the latest resume for the current user
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

    // Get the latest resume for this user
    const resume = await prisma.resumeData.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Check if any resume exists
    if (!resume) {
      return res.status(404).json({ error: 'No resumes found' });
    }

    // Return the resume
    return res.status(200).json(resume);
  } catch (error) {
    console.error('Error fetching latest resume:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 