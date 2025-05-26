import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to validate a resume name and check for duplicates
 * 
 * Request body:
 * - name: The resume name to validate
 * - resumeId: Optional ID of the current resume (to exclude from duplicate check)
 * 
 * Response:
 * - isValid: Whether the name is valid
 * - suggestedName: A suggested name if the original is a duplicate
 * - message: A message explaining the validation result
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

    // Get the name from the request body
    const { name, resumeId } = req.body;

    // Validate name presence
    if (!name || name.trim() === '') {
      return res.status(400).json({
        isValid: false,
        message: 'Resume name cannot be empty'
      });
    }

    // Normalize the name (trim whitespace)
    const normalizedName = name.trim();
    
    // Check if a resume with this name already exists for this user
    // Exclude the current resume if resumeId is provided
    const existingResume = await prisma.resumeData.findFirst({
      where: {
        userId: session.user.id,
        title: normalizedName,
        id: resumeId ? { not: resumeId } : undefined
      }
    });

    // If no existing resume found with this name, it's valid
    if (!existingResume) {
      return res.status(200).json({
        isValid: true,
        message: 'Resume name is available'
      });
    }

    // If a resume with this name already exists, suggest a new name
    // Format: "Original Name (2)", "Original Name (3)", etc.
    let count = 1;
    let suggestedName = normalizedName;
    let isDuplicate = true;

    while (isDuplicate && count < 100) { // Limit to 100 attempts
      count++;
      suggestedName = `${normalizedName} (${count})`;

      // Check if the suggested name is also taken
      const duplicateSuggestion = await prisma.resumeData.findFirst({
        where: {
          userId: session.user.id,
          title: suggestedName,
          id: resumeId ? { not: resumeId } : undefined
        }
      });

      isDuplicate = !!duplicateSuggestion;
    }

    return res.status(200).json({
      isValid: false,
      suggestedName,
      message: 'A resume with this name already exists'
    });
  } catch (error) {
    console.error('Error validating resume name:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
} 