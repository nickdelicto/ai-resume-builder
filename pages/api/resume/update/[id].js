import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { prisma } from "../../../../lib/prisma";

/**
 * API endpoint to update an existing resume
 * 
 * Request body:
 * - title: optional title for the resume
 * - data: JSON object with resume data
 * - template: optional template name
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

    // Get resume ID from URL path
    const { id } = req.query;
    
    // Get data from request body
    const { title, data, template } = req.body;

    // Validate data
    if (!data) {
      return res.status(400).json({ error: 'No resume data provided' });
    }
    
    // Try to use KVStore for locking to prevent duplicates
    let useLocking = true;
    let lockKey = null;
    
    try {
      // Check if KVStore exists in the database by wrapping in try/catch
      try {
        // Test if KVStore is available by making a simple query
        await prisma.kVStore.findFirst({
          take: 1,
        });
        
        // If we get here, KVStore is available, so create a lock
        lockKey = `resume_update_lock_${session.user.id}_${id}_${Date.now()}`;
        await prisma.kVStore.create({
          data: {
            key: lockKey,
            value: 'locked',
            metadata: {
              userId: session.user.id,
              resumeId: id,
              expires: new Date(Date.now() + 10000) // 10 seconds
            }
          }
        });
        console.log(`Created update lock with key: ${lockKey}`);
      } catch (kvError) {
        // KVStore table likely doesn't exist yet
        console.error('KVStore error - likely needs migration:', kvError.message);
        useLocking = false;
      }
      
      // Get resume by ID
      const existingResume = await prisma.resumeData.findUnique({
        where: {
          id: id,
        }
      });
      
      // Verify the resume exists and belongs to the current user
      if (!existingResume) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      
      if (existingResume.userId !== session.user.id) {
        return res.status(403).json({ error: 'You do not have permission to update this resume' });
      }

      // Use title from request or keep existing one
      const resumeTitle = title || existingResume.title;
      const templateToUse = template || existingResume.template;
      
      // Check if the data has actually changed before updating
      const hasDataChanged = JSON.stringify(data) !== JSON.stringify(existingResume.data);
      const hasTitleChanged = resumeTitle !== existingResume.title;
      const hasTemplateChanged = templateToUse !== existingResume.template;
      
      // Log what changes were detected
      console.log(`Resume ${id} changes detected:`, {
        dataChanged: hasDataChanged,
        titleChanged: hasTitleChanged,
        templateChanged: hasTemplateChanged,
        oldTemplate: existingResume.template,
        newTemplate: templateToUse
      });
      
      // Only update if something has changed
      if (hasDataChanged || hasTitleChanged || hasTemplateChanged) {
        // Update resume
        const updatedResume = await prisma.resumeData.update({
          where: {
            id: id
          },
          data: {
            title: resumeTitle,
            data: data,
            template: templateToUse
          }
        });
        
        console.log(`Updated resume ${id} successfully`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Resume updated successfully',
          resumeId: updatedResume.id
        });
      } else {
        console.log(`No changes detected for resume ${id}, skipping update`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'No changes detected',
          resumeId: id
        });
      }
    } finally {
      // Clean up the lock if we used one
      if (useLocking && lockKey) {
        try {
          await prisma.kVStore.delete({
            where: {
              key: lockKey
            }
          });
          console.log(`Removed update lock: ${lockKey}`);
        } catch (cleanupError) {
          console.error('Error removing update lock:', cleanupError);
        }
      }
    }
  } catch (error) {
    console.error('Error updating resume:', error);
    return res.status(500).json({ error: 'Failed to update resume' });
  }
}

/**
 * Sanitize a text string to replace characters not supported in LATIN1 encoding
 * This function is used by the sanitizeDataForDb function
 */
function sanitizeText(text) {
  if (!text) return text;
  
  // Replace smart quotes with regular quotes
  return text
    .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
    .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
    .replace(/\u2013/g, '-')         // Replace en dash
    .replace(/\u2014/g, '--')        // Replace em dash
    .replace(/\u2026/g, '...')       // Replace ellipsis
    .replace(/[^\x00-\x7F]/g, '')    // Remove other non-ASCII characters
}

/**
 * Recursively sanitize all string values in an object
 * Kept for potential future use
 */
/*
function sanitizeDataForDb(data) {
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForDb(item));
  }
  
  if (data !== null && typeof data === 'object') {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeDataForDb(data[key]);
    }
    return sanitized;
  }
  
  return data;
} 
*/ 