import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

/**
 * API endpoint to clean up duplicate resumes
 * Keeps only the most recent version of each resume title
 * Requires admin privileges
 */
export default async function handler(req, res) {
  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For security, this cleanup operation can only be run by admin users
    const adminEmails = (process.env.ADMIN_EMAIL || '')
      .split(/[;,]/)
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(session.user.email.toLowerCase());
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    // Get parameters from request
    const { userId, maxToKeep = 1, dryRun = true } = req.query;
    
    // Validate parameters
    if (dryRun !== 'true' && dryRun !== 'false') {
      return res.status(400).json({ error: 'dryRun parameter must be "true" or "false"' });
    }
    
    // Convert to boolean
    const isDryRun = dryRun === 'true';
    
    // Find duplicate titles for the specified user (or all users if not specified)
    const userFilter = userId ? { userId } : {};
    
    // 1. First, get all resumes grouped by user and title
    const allResumes = await prisma.resumeData.findMany({
      where: userFilter,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // 2. Group resumes by title for each user
    const resumesByUserAndTitle = {};
    
    allResumes.forEach(resume => {
      const key = `${resume.userId}_${resume.title}`;
      
      if (!resumesByUserAndTitle[key]) {
        resumesByUserAndTitle[key] = [];
      }
      
      resumesByUserAndTitle[key].push(resume);
    });
    
    // 3. For each group, keep only the most recent maxToKeep resumes
    const toDelete = [];
    const toKeep = [];
    
    Object.values(resumesByUserAndTitle).forEach(resumes => {
      // Sort by updatedAt desc
      resumes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      // Keep the most recent ones
      const keep = resumes.slice(0, maxToKeep);
      const remove = resumes.slice(maxToKeep);
      
      toKeep.push(...keep);
      toDelete.push(...remove);
    });
    
    // 4. Delete the duplicates if not in dry run mode
    let deletedCount = 0;
    
    if (!isDryRun && toDelete.length > 0) {
      // Delete in batches to avoid hitting query limits
      const batchSize = 100;
      
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const ids = batch.map(resume => resume.id);
        
        const result = await prisma.resumeData.deleteMany({
          where: {
            id: {
              in: ids
            }
          }
        });
        
        deletedCount += result.count;
      }
    }
    
    // Return statistics
    return res.status(200).json({
      success: true,
      statistics: {
        totalResumes: allResumes.length,
        uniqueTitles: Object.keys(resumesByUserAndTitle).length,
        toKeep: toKeep.length,
        toDelete: toDelete.length,
        actuallyDeleted: isDryRun ? 0 : deletedCount,
        dryRun: isDryRun
      },
      // Include detailed info in development mode
      details: process.env.NODE_ENV === 'development' ? {
        resumes: Object.entries(resumesByUserAndTitle).map(([key, resumes]) => ({
          key,
          count: resumes.length,
          kept: resumes.slice(0, maxToKeep).map(r => ({ id: r.id, title: r.title, updatedAt: r.updatedAt })),
          deleted: resumes.slice(maxToKeep).map(r => ({ id: r.id, title: r.title, updatedAt: r.updatedAt }))
        }))
      } : undefined
    });
  } catch (error) {
    console.error('Error cleaning up resumes:', error);
    return res.status(500).json({ error: 'Failed to clean up resumes' });
  }
} 