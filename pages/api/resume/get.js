import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to get a single resume by ID
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
    
    // Get the resume ID from the query
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get the resume with complete data
    const resume = await prisma.resumeData.findUnique({
      where: {
        id: id,
        userId: session.user.id
      }
    });
    
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Return the resume
    return res.status(200).json({
      resume: resume
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 