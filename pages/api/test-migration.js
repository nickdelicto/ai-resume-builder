/**
 * Test endpoint to diagnose migration issues
 * This is a temporary endpoint for debugging purposes only
 */

import { migrateToDatabase } from '../../lib/resumeUtils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import DbResumeService from '../../lib/services/DbResumeService';
import ResumeServiceFactory from '../../lib/services/ResumeServiceFactory';

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
    
    // Save original global.window if it exists
    const originalWindow = global.window;
    
    // Create a mock window object for server-side testing
    global.window = {
      location: {
        search: '',
        href: 'https://example.com/test-migration'
      }
    };
    
    // If localStorage data was provided, set it in the global object for testing
    if (localStorageData) {
      console.log('🔍 TEST-MIGRATION: Using provided localStorage data');
      
      // Create a mock localStorage for testing
      global.window.localStorage = {
        getItem: (key) => {
          console.log(`🔍 TEST-MIGRATION: localStorage.getItem('${key}') called`);
          return localStorageData[key] || null;
        },
        setItem: (key, value) => {
          console.log(`🔍 TEST-MIGRATION: localStorage.setItem('${key}', '${value}') called`);
          localStorageData[key] = value;
        },
        removeItem: (key) => {
          console.log(`🔍 TEST-MIGRATION: localStorage.removeItem('${key}') called`);
          delete localStorageData[key];
        }
      };
      
      // Log the localStorage data
      console.log('🔍 TEST-MIGRATION: localStorage data:', {
        hasResumeData: !!localStorageData.modern_resume_data,
        needsMigration: localStorageData.needs_db_migration,
        dbOnlyMode: localStorageData.db_only_mode,
        currentResumeId: localStorageData.current_resume_id
      });
    } else {
      // Create an empty localStorage if none was provided
      global.window.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      };
    }
    
    // Force needs_db_migration flag for testing
    global.window.localStorage.setItem('needs_db_migration', 'true');
    
    // CRITICAL: Set up a mock resume data if none exists
    if (!localStorageData?.modern_resume_data) {
      console.log('🔍 TEST-MIGRATION: No resume data found, creating mock data for testing');
      const mockResumeData = {
        personalInfo: {
          name: 'Test User',
          email: session.user?.email || 'test@example.com',
          phone: '123-456-7890',
          location: 'Test Location'
        },
        summary: 'This is a test resume created during migration testing.',
        experience: [],
        education: [],
        skills: [],
        additional: {}
      };
      global.window.localStorage.setItem('modern_resume_data', JSON.stringify(mockResumeData));
    }
    
    // IMPORTANT: Manually initialize the ResumeServiceFactory with authentication
    console.log('🔍 TEST-MIGRATION: Initializing ResumeServiceFactory');
    const factory = new ResumeServiceFactory();
    factory.initialize(true); // Force authenticated state
    
    // Manually initialize the DbResumeService
    console.log('🔍 TEST-MIGRATION: Initializing DbResumeService');
    const dbService = new DbResumeService();
    await dbService.initialize({ isAuthenticated: true });
    
    // Verify the service is available
    console.log('🔍 TEST-MIGRATION: Checking if DbResumeService is available');
    const isServiceAvailable = dbService.isAvailable();
    console.log('🔍 TEST-MIGRATION: DbResumeService available:', isServiceAvailable);
    
    // Test the factory's getService method directly
    console.log('🔍 TEST-MIGRATION: Testing ResumeServiceFactory.getService');
    const factoryResult = await ResumeServiceFactory.getService({ isAuthenticated: true });
    console.log('🔍 TEST-MIGRATION: Factory service result:', {
      hasService: !!factoryResult.service,
      serviceType: factoryResult.service ? factoryResult.service.constructor.name : 'undefined',
      needsMigration: factoryResult.needsMigration,
      isDbService: factoryResult.isDbService,
      isLocalStorageService: factoryResult.isLocalStorageService
    });
    
    // Check if the factory service is available
    const factoryServiceAvailable = factoryResult.service && 
      typeof factoryResult.service.isAvailable === 'function' && 
      factoryResult.service.isAvailable();
    console.log('🔍 TEST-MIGRATION: Factory service available:', factoryServiceAvailable);
    
    // Attempt migration
    console.log('🔍 TEST-MIGRATION: Calling migrateToDatabase');
    const migrationResult = await migrateToDatabase({
      force: true,
      source: 'test_migration_api'
    });
    
    console.log('🔍 TEST-MIGRATION: Migration result:', migrationResult);
    
    // Clean up the mock
    global.window = originalWindow;
    
    // Return the result
    return res.status(200).json({
      success: true,
      migrationResult,
      serviceAvailable: isServiceAvailable,
      factoryServiceAvailable,
      factoryService: {
        type: factoryResult.service ? factoryResult.service.constructor.name : 'undefined',
        needsMigration: factoryResult.needsMigration,
        isDbService: factoryResult.isDbService,
        isLocalStorageService: factoryResult.isLocalStorageService
      },
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