/**
 * Test script for diagnosing DB service issues
 * Run this script on the VPS with: node scripts/test-db-service.js
 */

// Mock browser environment
global.window = {
  localStorage: {
    _data: {},
    getItem: function(key) {
      return this._data[key] || null;
    },
    setItem: function(key, value) {
      this._data[key] = value;
    },
    removeItem: function(key) {
      delete this._data[key];
    }
  },
  location: {
    href: 'http://localhost:3000/test-script',
    search: ''
  }
};

// Import required modules
const DbResumeService = require('../lib/services/DbResumeService').default;
const ResumeServiceFactory = require('../lib/services/ResumeServiceFactory').default;

// Create a mock session
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com'
  }
};

// Test function
async function testDbService() {
  console.log('🔍 Starting DB service test');
  
  try {
    // Test 1: Direct DbResumeService initialization
    console.log('\n🔍 Test 1: Direct DbResumeService initialization');
    const dbService = new DbResumeService();
    
    console.log('🔍 Initializing DbResumeService with isAuthenticated=true');
    const initResult = await dbService.initialize({ isAuthenticated: true });
    console.log('🔍 Initialize result:', initResult);
    
    console.log('🔍 Checking if service is available');
    const isAvailable = dbService.isAvailable();
    console.log('🔍 Service available:', isAvailable);
    
    // Test 2: ResumeServiceFactory getService
    console.log('\n🔍 Test 2: ResumeServiceFactory.getService');
    const factoryResult = await ResumeServiceFactory.getService({ 
      isAuthenticated: true 
    });
    
    console.log('🔍 Factory result:', {
      hasService: !!factoryResult.service,
      serviceType: factoryResult.service ? factoryResult.service.constructor.name : 'null',
      needsMigration: factoryResult.needsMigration,
      isDbService: factoryResult.isDbService,
      isLocalStorageService: factoryResult.isLocalStorageService
    });
    
    // Test 3: DB-only mode
    console.log('\n🔍 Test 3: DB-only mode');
    window.localStorage.setItem('db_only_mode', 'true');
    
    const dbOnlyResult = await ResumeServiceFactory.getService({ 
      isAuthenticated: true 
    });
    
    console.log('🔍 DB-only mode result:', {
      hasService: !!dbOnlyResult.service,
      serviceType: dbOnlyResult.service ? dbOnlyResult.service.constructor.name : 'null',
      needsMigration: dbOnlyResult.needsMigration,
      isDbService: dbOnlyResult.isDbService,
      isLocalStorageService: dbOnlyResult.isLocalStorageService
    });
    
    // Test 4: Check environment
    console.log('\n🔍 Test 4: Environment check');
    console.log('🔍 typeof window:', typeof window);
    console.log('🔍 typeof document:', typeof document);
    console.log('🔍 typeof localStorage:', typeof localStorage);
    console.log('🔍 typeof fetch:', typeof fetch);
    console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);
    
    console.log('\n🔍 All tests completed');
  } catch (error) {
    console.error('🔍 Error during tests:', error);
  }
}

// Run the test
testDbService(); 