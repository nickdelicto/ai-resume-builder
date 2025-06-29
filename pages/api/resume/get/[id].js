import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "../../../../lib/prisma";

/**
 * API endpoint to get a resume by ID
 */
export default async function handler(req, res) {
  // Allow both GET and HEAD requests (HEAD for checking existence)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get resume ID from URL path
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }
    
    // Get resume by ID
    const resume = await prisma.resumeData.findUnique({
      where: {
        id: id,
      }
    });
    
    // Check if resume exists
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Check if the resume belongs to the current user
    if (resume.userId !== session.user.id) {
      return res.status(403).json({ error: 'You do not have permission to access this resume' });
    }
    
    // For HEAD requests, just return a 200 status to indicate existence
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
    
    // For GET requests, return the resume data
    return res.status(200).json({ 
      success: true, 
      resume: {
        id: resume.id,
        title: resume.title,
        data: resume.data,
        template: resume.template || 'ats',
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (error) {
    console.error('Error retrieving resume:', error);
    return res.status(500).json({ error: 'Failed to retrieve resume' });
  }
} 