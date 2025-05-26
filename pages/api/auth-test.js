import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../app/api/auth/[...nextauth]/options';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (session) {
    // If authenticated, return the session data
    return res.status(200).json({
      authenticated: true,
      session,
      message: "You are authenticated! NextAuth is working correctly."
    });
  } else {
    // If not authenticated
    return res.status(200).json({
      authenticated: false,
      message: "You are not authenticated. NextAuth API route is working, but you're not signed in."
    });
  }
} 