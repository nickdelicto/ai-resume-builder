import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
// Kept for potential future use
// import { v4 as uuidv4 } from 'uuid';

/**
 * API endpoint to save a resume to the database
 * Handles both new resume creation and updates to existing resumes
 */
export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions);

    // If user is not authenticated, return error
    if (!session) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Get user ID from session
    const userId = session.user.id;

    // Get the resume data from the request body
    const { resumeData, template = 'ats', title = 'My Resume', resumeId, isImport = false, forceUpdate = false } = req.body;

    // Validate the data
    if (!resumeData) {
      return res.status(400).json({ success: false, error: 'Resume data is required' });
    }

    // Check if this is an import operation (override existing resume)
    // Or if a resumeId was provided (update existing resume)
    if ((isImport || forceUpdate) && resumeId) {
      console.log(`📊 API: Import/Force update operation for resumeId ${resumeId}`);
      
      // First check if the resume exists and belongs to this user
      const existingResume = await prisma.resumeData.findFirst({
        where: {
          id: resumeId,
          userId: userId
        }
      });
      
      if (!existingResume) {
        console.log(`📊 API: Resume ${resumeId} not found or doesn't belong to user ${userId}`);
        
        // For imports, if the resume doesn't exist, create a new one instead of failing
        const newResume = await prisma.resumeData.create({
          data: {
            data: sanitizeDataForDb(resumeData),
            title: title,
            template: template,
            userId: userId
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'New resume created from import',
          resumeId: newResume.id
        });
      }
      
      // For imports, add extra logging and prioritize the operation
      if (isImport) {
        console.log(`📊 API: IMPORT OPERATION - Prioritizing imported data over existing data`);
        console.log(`📊 API: IMPORT OPERATION - Existing title: ${existingResume.title}, New title: ${title || existingResume.title}`);
        
        // Log some data about the import to help with debugging
        if (resumeData && resumeData.personalInfo) {
          console.log(`📊 API: IMPORT OPERATION - Import data name: ${resumeData.personalInfo.name || 'Not provided'}`);
        }
        
        // For imports, always use the new data completely (stronger force update)
        const updatedResume = await prisma.resumeData.update({
          where: {
            id: resumeId
          },
          data: {
            data: sanitizeDataForDb(resumeData),
            title: title || existingResume.title,
            template: template || existingResume.template,
            updatedAt: new Date()
          }
        });
        
        // Double-check that the update was successful by reading back the data
        const verifyResume = await prisma.resumeData.findUnique({
          where: {
            id: resumeId
          }
        });
        
        // Log verification results
        if (verifyResume && verifyResume.data && verifyResume.data.personalInfo) {
          console.log(`📊 API: IMPORT VERIFICATION - Updated name: ${verifyResume.data.personalInfo.name || 'Not found'}`);
          console.log(`📊 API: IMPORT VERIFICATION - Update successful: ${
            verifyResume.data.personalInfo.name === resumeData.personalInfo.name ? 'YES' : 'NO'
          }`);
        }
        
        return res.status(200).json({
          success: true,
          message: 'Resume updated from import with verification',
          resumeId: updatedResume.id
        });
      }
      
      // Update the existing resume with the imported data
      const updatedResume = await prisma.resumeData.update({
        where: {
          id: resumeId
        },
        data: {
          data: sanitizeDataForDb(resumeData),
          title: title || existingResume.title, // Preserve original title if not specified
          template: template || existingResume.template, // Preserve original template if not specified
          updatedAt: new Date()
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Resume updated from import',
        resumeId: updatedResume.id
      });
    } 
    // Handle regular update if resumeId is provided but not an import
    else if (resumeId) {
      console.log(`📊 API: Update operation for resumeId ${resumeId}`);
      
      // Check if the resume exists and belongs to this user
      const existingResume = await prisma.resumeData.findFirst({
        where: {
          id: resumeId,
          userId: userId
        }
      });
      
      if (!existingResume) {
        return res.status(404).json({
          success: false,
          error: 'Resume not found or does not belong to you'
        });
      }
      
      // Update the resume
      const updatedResume = await prisma.resumeData.update({
        where: {
          id: resumeId
        },
        data: {
          data: sanitizeDataForDb(resumeData),
          title: title,
          template: template,
          updatedAt: new Date()
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Resume updated',
        resumeId: updatedResume.id
      });
    }
    // Create a new resume
    else {
      console.log(`📊 API: Creating new resume for user ${userId}`);
      
      // Create a new resume
      const newResume = await prisma.resumeData.create({
        data: {
          data: sanitizeDataForDb(resumeData),
          title: title,
          template: template,
          userId: userId
        }
      });
      
      return res.status(200).json({
        success: true,
        message: 'Resume created',
        resumeId: newResume.id
      });
    }
  } catch (error) {
    console.error('Error saving resume:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while saving the resume'
    });
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