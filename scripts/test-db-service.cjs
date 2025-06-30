/**
 * Test script for diagnosing DB service issues
 * Run this script on the VPS with: node scripts/test-db-service.cjs
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

// Mock fetch API
global.fetch = async function mockFetch() {
  return {
    ok: true,
    json: async () => ({ success: true, resumeId: 'mock-resume-id' })
  };
};

// Create a simple mock implementation of the services
const mockResumeService = {
  initialize: async function() {
    console.log('🔍 Mock service initialized');
    return { success: true };
  },
  isAvailable: function() {
    console.log('🔍 Mock service availability check');
    return true;
  }
};

// Mock DbResumeService
const DbResumeService = function() {
  this.isAuthenticated = false;
  
  this.initialize = async function(options) {
    console.log('📊 [DbResumeService] initialize called with options:', options);
    this.isAuthenticated = options.isAuthenticated || false;
    return { success: true };
  };
  
  this.isAvailable = function() {
    const inBrowser = typeof window !== 'undefined';
    const isAuth = !!this.isAuthenticated;
    
    console.log('📊 [DbResumeService] isAvailable check:', {
      inBrowser,
      isAuthenticated: isAuth,
      authValue: this.isAuthenticated
    });
    
    return inBrowser && isAuth;
  };
};

// Mock ResumeServiceFactory
const ResumeServiceFactory = {
  dbService: new DbResumeService(),
  localStorageService: mockResumeService,
  
  getService: async function(options) {
    console.log('📊 [ResumeServiceFactory] getService called with:', options);
    
    if (options.isAuthenticated) {
      await this.dbService.initialize(options);
      const isAvailable = this.dbService.isAvailable();
      
      return {
        service: this.dbService,
        needsMigration: false,
        isDbService: true,
        isLocalStorageService: false,
        isAvailable
      };
    } else {
      return {
        service: this.localStorageService,
        needsMigration: false,
        isDbService: false,
        isLocalStorageService: true
      };
    }
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
      serviceType: factoryResult.service ? 'DbResumeService' : 'null',
      needsMigration: factoryResult.needsMigration,
      isDbService: factoryResult.isDbService,
      isLocalStorageService: factoryResult.isLocalStorageService,
      isAvailable: factoryResult.isAvailable
    });
    
    // Test 3: DB-only mode
    console.log('\n🔍 Test 3: DB-only mode');
    window.localStorage.setItem('db_only_mode', 'true');
    
    const dbOnlyResult = await ResumeServiceFactory.getService({ 
      isAuthenticated: true 
    });
    
    console.log('🔍 DB-only mode result:', {
      hasService: !!dbOnlyResult.service,
      serviceType: dbOnlyResult.service ? 'DbResumeService' : 'null',
      needsMigration: dbOnlyResult.needsMigration,
      isDbService: dbOnlyResult.isDbService,
      isLocalStorageService: dbOnlyResult.isLocalStorageService,
      isAvailable: dbOnlyResult.isAvailable
    });
    
    // Test 4: Check environment
    console.log('\n🔍 Test 4: Environment check');
    console.log('🔍 typeof window:', typeof window);
    console.log('🔍 typeof document:', typeof document);
    console.log('🔍 typeof localStorage:', typeof window.localStorage);
    console.log('🔍 typeof fetch:', typeof fetch);
    console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);
    
    console.log('\n🔍 All tests completed');
  } catch (error) {
    console.error('🔍 Error during tests:', error);
  }
}

// Run the test
testDbService(); 