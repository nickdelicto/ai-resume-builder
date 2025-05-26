import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';

export default async function handler(req, res) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Get the resume ID from the query
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ message: 'Resume ID is required' });
    }
    
    // Find the resume to ensure it belongs to the user
    const resume = await prisma.resumeData.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Delete the resume
    await prisma.resumeData.delete({
      where: { id: id },
    });
    
    // Return success message
    return res.status(200).json({
      message: 'Resume deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return res.status(500).json({ message: 'Error deleting resume', error: error.message });
  }
} 