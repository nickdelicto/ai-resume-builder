import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

/**
 * API endpoint to check if the current user has admin privileges
 */
export default async function handler(req, res) {
  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ 
        isAdmin: false,
        error: 'Unauthorized' 
      });
    }

    // Check if the user is an admin based on their email
    // This is a simple implementation - you may want to use a more robust approach
    // such as storing admin status in the database
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL;
    
    return res.status(200).json({ 
      isAdmin,
      userEmail: session.user.email 
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ 
      isAdmin: false,
      error: 'Internal server error' 
    });
  }
} 