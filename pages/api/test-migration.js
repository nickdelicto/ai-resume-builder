/**
 * Test endpoint to diagnose migration issues
 * This is a temporary endpoint for debugging purposes only
 */

import { migrateToDatabase } from '../../lib/resumeUtils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get session to check authentication
    const session = await getServerSession(req, res, authOptions);
    
    // Ensure user is authenticated
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔍 TEST-MIGRATION: Starting test migration');
    console.log('🔍 TEST-MIGRATION: User authenticated:', !!session);
    console.log('🔍 TEST-MIGRATION: User ID:', session.user?.id);
    console.log('🔍 TEST-MIGRATION: User email:', session.user?.email);
    
    // Get localStorage data from request body
    const { localStorageData } = req.body;
    
    // If localStorage data was provided, set it in the global object for testing
    if (localStorageData) {
      console.log('🔍 TEST-MIGRATION: Using provided localStorage data');
      
      // Create a mock localStorage for testing
      global.mockLocalStorage = {
        getItem: (key) => {
          return localStorageData[key] || null;
        },
        setItem: (key, value) => {
          localStorageData[key] = value;
        },
        removeItem: (key) => {
          delete localStorageData[key];
        }
      };
      
      // Override window.localStorage for the duration of this request
      const originalWindow = global.window;
      global.window = {
        ...(global.window || {}),
        localStorage: global.mockLocalStorage
      };
      
      // Log the localStorage data
      console.log('🔍 TEST-MIGRATION: localStorage data:', {
        hasResumeData: !!localStorageData.modern_resume_data,
        needsMigration: localStorageData.needs_db_migration,
        dbOnlyMode: localStorageData.db_only_mode,
        currentResumeId: localStorageData.current_resume_id
      });
    }
    
    // Attempt migration
    console.log('🔍 TEST-MIGRATION: Calling migrateToDatabase');
    const migrationResult = await migrateToDatabase({
      force: true,
      source: 'test_migration_api'
    });
    
    console.log('🔍 TEST-MIGRATION: Migration result:', migrationResult);
    
    // Clean up the mock
    if (localStorageData) {
      delete global.mockLocalStorage;
      delete global.window;
    }
    
    // Return the result
    return res.status(200).json({
      success: true,
      migrationResult,
      localStorage: localStorageData ? {
        afterMigration: {
          hasResumeData: !!localStorageData.modern_resume_data,
          needsMigration: localStorageData.needs_db_migration,
          dbOnlyMode: localStorageData.db_only_mode,
          currentResumeId: localStorageData.current_resume_id
        }
      } : null
    });
  } catch (error) {
    console.error('🔍 TEST-MIGRATION: Error during test migration:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 