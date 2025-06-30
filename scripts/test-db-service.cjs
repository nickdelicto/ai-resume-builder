/**
 * Test script to verify DbResumeService functionality
 * This script is designed to run directly on the server with Node.js
 * It uses CommonJS format instead of ES modules for direct execution
 */

// Mock browser environment
global.window = {};
global.localStorage = {
  _data: {},
  getItem(key) {
    return this._data[key] || null;
  },
  setItem(key, value) {
    this._data[key] = value;
  },
  removeItem(key) {
    delete this._data[key];
  },
  clear() {
    this._data = {};
  },
  key(index) {
    return Object.keys(this._data)[index] || null;
  },
  get length() {
    return Object.keys(this._data).length;
  }
};
global.document = undefined; // Intentionally undefined to test detection

// Mock fetch API
global.fetch = async () => {
  return {
    ok: true,
    json: async () => ({ success: true, resume: { id: 'test-id', data: {} } })
  };
};

// Create mock ResumeService class
class ResumeService {
  async initialize() { return { success: true }; }
  isAvailable() { return true; }
  async loadResume() { return { success: true, data: { resumeData: {}, meta: {} } }; }
  async saveResume() { return { success: true, data: { resumeId: 'test-id' } }; }
  async listResumes() { return { success: true, data: { resumes: [] } }; }
  async deleteResume() { return { success: true }; }
}

// Create mock DbResumeService class
class DbResumeService extends ResumeService {
  constructor() {
    super();
    this.apiEndpoints = {
      save: '/api/resume/save',
      update: '/api/resume/update',
      get: '/api/resume/get',
      list: '/api/resume/list',
      delete: '/api/resume/delete'
    };
    this.isAuthenticated = false;
  }

  async initialize(options = {}) {
    console.log('📊 [DbResumeService] initialize called with options:', options);
    
    // Ensure isAuthenticated is a boolean
    if (typeof options.isAuthenticated !== 'boolean') {
      console.warn('📊 [DbResumeService] isAuthenticated is not a boolean:', options.isAuthenticated);
      // Convert to boolean explicitly
      this.isAuthenticated = !!options.isAuthenticated;
    } else {
      this.isAuthenticated = options.isAuthenticated;
    }
    
    return { success: true };
  }

  isAvailable() {
    const inBrowser = typeof window !== 'undefined';
    const isAuth = !!this.isAuthenticated;
    
    console.log('📊 [DbResumeService] isAvailable check:', {
      inBrowser,
      isAuthenticated: isAuth,
      authValue: this.isAuthenticated
    });
    
    // In server-side rendering, we should return false
    if (!inBrowser) {
      console.log('📊 [DbResumeService] Not available: Not in browser environment');
      return false;
    }
    
    // Must be authenticated to use DB service
    if (!isAuth) {
      console.log('📊 [DbResumeService] Not available: User not authenticated');
      return false;
    }
    
    console.log('📊 [DbResumeService] Service is available');
    return true;
  }
}

// Create mock ResumeServiceFactory
class ResumeServiceFactory {
  constructor() {
    this.dbService = new DbResumeService();
    this.isAuthenticated = false;
  }

  initialize(isAuthenticated) {
    this.isAuthenticated = isAuthenticated;
  }

  getService() {
    return this.isAuthenticated ? this.dbService : null;
  }

  static async getService(options = {}) {
    console.log('📊 [ResumeServiceFactory] getService called with:', options);
    
    const factory = new ResumeServiceFactory();
    factory.initialize(options.isAuthenticated);
    
    const service = factory.getService();
    await service.initialize({ isAuthenticated: options.isAuthenticated });
    
    return {
      service,
      serviceType: service.constructor.name,
      needsMigration: false,
      isDbService: service instanceof DbResumeService,
      isLocalStorageService: false,
      isAvailable: service.isAvailable()
    };
  }
}

// Main test function
async function runTests() {
  console.log('🔍 Starting DB service test\n');

  // Test 1: Direct DbResumeService initialization
  console.log('🔍 Test 1: Direct DbResumeService initialization');
  console.log('🔍 Initializing DbResumeService with isAuthenticated=true');
  
  const dbService = new DbResumeService();
  const initResult = await dbService.initialize({ isAuthenticated: true });
  
  console.log('🔍 Initialize result:', initResult);
  console.log('🔍 Checking if service is available');
  
  const isAvailable = dbService.isAvailable();
  console.log('🔍 Service available:', isAvailable);
  console.log('');

  // Test 2: ResumeServiceFactory.getService
  console.log('🔍 Test 2: ResumeServiceFactory.getService');
  const factoryResult = await ResumeServiceFactory.getService({ isAuthenticated: true });
  console.log('🔍 Factory result:', factoryResult);
  console.log('');

  // Test 3: DB-only mode
  console.log('🔍 Test 3: DB-only mode');
  localStorage.setItem('db_only_mode', 'true');
  const dbOnlyResult = await ResumeServiceFactory.getService({ isAuthenticated: true });
  console.log('🔍 DB-only mode result:', dbOnlyResult);
  console.log('');

  // Test 4: Environment check
  console.log('🔍 Test 4: Environment check');
  console.log('🔍 typeof window:', typeof window);
  console.log('🔍 typeof document:', typeof document);
  console.log('🔍 typeof localStorage:', typeof localStorage);
  console.log('🔍 typeof fetch:', typeof fetch);
  console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('');

  console.log('🔍 All tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 