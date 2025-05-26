import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to save resume data
 * Used for creating a new resume or updating an existing one
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
    
    // Get data from request body
    const { title, data, template, resumeId, forcedId } = req.body;
    
    // Use title or generate a fallback
    const resumeTitle = title || 'Untitled Resume';

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
        lockKey = `resume_save_lock_${session.user.id}_${Date.now()}`;
        await prisma.kVStore.create({
          data: {
            key: lockKey,
            value: 'locked',
            metadata: {
              userId: session.user.id,
              expires: new Date(Date.now() + 10000), // 10 seconds
              resumeId: resumeId || forcedId || null
            }
          }
        });
        console.log(`Created lock with key: ${lockKey}`);
      } catch (kvError) {
        // KVStore table likely doesn't exist yet
        console.error('KVStore error - likely needs migration:', kvError.message);
        useLocking = false;
      }

      // Check if a resume with the provided resumeId already exists (if resumeId is provided)
      // This is to prevent duplicate creations when the client thinks a resume exists but it doesn't
      const idToCheck = resumeId || forcedId;
      if (idToCheck) {
        const existingResume = await prisma.resumeData.findUnique({
          where: {
            id: idToCheck,
          }
        });

        if (existingResume) {
          // If resume already exists and belongs to this user, redirect to update endpoint
          if (existingResume.userId === session.user.id) {
            // Update the existing resume instead of redirecting
            const updatedResume = await prisma.resumeData.update({
              where: {
                id: idToCheck
              },
              data: {
                title: resumeTitle,
                data: sanitizeDataForDb(data),
                template: template,
                updatedAt: new Date()
              }
            });
            
            console.log(`Updated existing resume: ${updatedResume.id}`);
            
            // Release the lock if using locking
            if (useLocking && lockKey) {
              try {
                await prisma.kVStore.delete({
                  where: { key: lockKey }
                });
              } catch (e) {
                console.error('Error releasing lock:', e);
              }
            }
            
            return res.status(200).json({
              message: 'Resume updated successfully',
              resumeId: updatedResume.id
            });
          } else {
            // If resume exists but belongs to another user, reject the operation
            return res.status(403).json({
              error: 'You do not have permission to access this resume'
            });
          }
        }
        // If the ID doesn't exist, we'll create a new resume with that ID below
      }

      // Create a new resume, using forcedId if provided
      const newResume = await prisma.resumeData.create({
        data: {
          // Use forcedId if provided, otherwise auto-generate
          ...(forcedId && { id: forcedId }),
          userId: session.user.id,
          title: resumeTitle,
          data: sanitizeDataForDb(data),
          template: template || 'ats'
        }
      });
      
      console.log(`Created new resume${forcedId ? ' with specified ID' : ''}: ${newResume.id}`);
      
      // Release the lock if using locking
      if (useLocking && lockKey) {
        try {
          await prisma.kVStore.delete({
            where: { key: lockKey }
          });
        } catch (e) {
          console.error('Error releasing lock:', e);
        }
      }
      
      return res.status(201).json({
        message: `Resume created successfully${forcedId ? ' with provided ID' : ''}`,
        resumeId: newResume.id
      });
    } catch (error) {
      console.error('Error in save resume operation:', error);
      
      // Release the lock if using locking
      if (useLocking && lockKey) {
        try {
          await prisma.kVStore.delete({
            where: { key: lockKey }
          });
        } catch (e) {
          console.error('Error releasing lock:', e);
        }
      }
      
      return res.status(500).json({ error: 'Failed to save resume: ' + error.message });
    }
  } catch (error) {
    console.error('Error saving resume:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Sanitize a text string to replace characters not supported in LATIN1 encoding
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
 */
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