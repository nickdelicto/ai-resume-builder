import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "../../../../lib/prisma";

/**
 * API endpoint to update a resume's name
 * 
 * Request body:
 * - title: New title for the resume
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
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get resume ID from the URL
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Resume ID is required' });
    }

    // Get new title from request body
    const { title } = req.body;

    // Validate required fields
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Resume title is required' });
    }

    // Check if the resume exists and belongs to the user
    const existingResume = await prisma.resumeData.findUnique({
      where: {
        id: id
      }
    });

    if (!existingResume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    if (existingResume.userId !== session.user.id) {
      return res.status(403).json({ error: 'You do not have permission to update this resume' });
    }

    // Check if another resume with this name already exists
    const duplicateResume = await prisma.resumeData.findFirst({
      where: {
        userId: session.user.id,
        title: title.trim(),
        id: { not: id } // Exclude the current resume
      }
    });

    if (duplicateResume) {
      return res.status(400).json({ 
        error: 'Duplicate name',
        message: 'A resume with this name already exists' 
      });
    }

    // Update the resume name
    const updatedResume = await prisma.resumeData.update({
      where: {
        id: id
      },
      data: {
        title: title.trim(),
        updatedAt: new Date()
      }
    });

    return res.status(200).json({
      message: 'Resume name updated successfully',
      resumeId: updatedResume.id,
      title: updatedResume.title
    });
  } catch (error) {
    console.error('Error updating resume name:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
} 