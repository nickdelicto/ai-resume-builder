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
    // Supports multiple admin emails separated by semicolon or comma
    const adminEmails = (process.env.ADMIN_EMAIL || '')
      .split(/[;,]/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(session.user.email.toLowerCase());
    
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