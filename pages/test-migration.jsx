import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import { migrateToDatabase } from '../lib/resumeUtils';
import ResumeServiceFactory from '../lib/services/ResumeServiceFactory';

const TestMigrationPage = () => {
  const { data: session, status } = useSession();
  const [localStorageData, setLocalStorageData] = useState({});
  const [migrationResult, setMigrationResult] = useState(null);
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [isBrowser, setIsBrowser] = useState(false);

  useEffect(() => {
    // Set isBrowser to true once component mounts
    setIsBrowser(true);
    
    // Load localStorage data
    if (typeof window !== 'undefined') {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          // Try to parse as JSON
          const value = localStorage.getItem(key);
          try {
            data[key] = JSON.parse(value);
          } catch (e) {
            // If not valid JSON, store as string
            data[key] = value;
          }
        } catch (e) {
          data[key] = 'Error reading value';
        }
      }
      setLocalStorageData(data);
      
      // Load migration logs if available
      const logsStr = localStorage.getItem('migration_logs');
      if (logsStr) {
        try {
          setMigrationLogs(JSON.parse(logsStr));
        } catch (e) {
          console.error('Error parsing migration logs:', e);
        }
      }
      
      // Load last migration result if available
      const resultStr = localStorage.getItem('migration_last_result');
      if (resultStr) {
        try {
          setMigrationResult(JSON.parse(resultStr));
        } catch (e) {
          console.error('Error parsing migration result:', e);
        }
      }
    }
  }, []);
  
  const handleClearMigrationData = () => {
    if (typeof window !== 'undefined') {
      // Clear all migration-related flags
      const keysToRemove = [
        'db_only_mode',
        'needs_db_migration',
        'migration_in_progress',
        'migration_start_time',
        'migration_session_id',
        'migration_last_attempt',
        'migration_last_source',
        'migration_last_result',
        'migration_logs',
        'migration_debounce'
      ];
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Reload the page to reflect changes
      window.location.reload();
    }
  };
  
  const handleSetMigrationFlags = () => {
    if (typeof window !== 'undefined') {
      // Set migration flags
      localStorage.setItem('needs_db_migration', 'true');
      
      // Generate a unique migration session ID
      const migrationSessionId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('migration_session_id', migrationSessionId);
      
      // Reload the page to reflect changes
      window.location.reload();
    }
  };
  
  const handleTestFactory = async () => {
    try {
      setTestResults({ status: 'running', message: 'Testing service factory...' });
      
      // Test getting service
      const factory = await ResumeServiceFactory.getService({ 
        isAuthenticated: status === 'authenticated' 
      });
      
      // Test service availability
      let serviceAvailable = false;
      let serviceType = 'unknown';
      
      if (factory.service) {
        serviceType = factory.serviceType || 
                     (factory.service.constructor ? factory.service.constructor.name : typeof factory.service);
        
        if (typeof factory.service.isAvailable === 'function') {
          serviceAvailable = factory.service.isAvailable();
        }
      }
      
      setTestResults({
        status: 'complete',
        factory,
        serviceAvailable,
        serviceType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        status: 'error',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Helper function to safely get localStorage value
  const getLocalStorageValue = (key) => {
    if (isBrowser && typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <Head>
        <title>Migration Diagnostics Tool</title>
      </Head>
      
      <h1>Migration Diagnostics Tool</h1>
      <p>This page helps diagnose issues with localStorage to database migration.</p>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h2>Authentication Status</h2>
        <p><strong>Status:</strong> {status}</p>
        {status === 'authenticated' && (
          <p><strong>User ID:</strong> {session?.user?.id || 'Not available'}</p>
        )}
      </div>
      
      <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
        <h2>Migration Status</h2>
        <p><strong>DB-only Mode:</strong> {getLocalStorageValue('db_only_mode') === 'true' ? 'Yes' : 'No'}</p>
        <p><strong>Needs Migration:</strong> {getLocalStorageValue('needs_db_migration') === 'true' ? 'Yes' : 'No'}</p>
        <p><strong>Last Migration Attempt:</strong> {getLocalStorageValue('migration_last_attempt') ? 
          new Date(parseInt(getLocalStorageValue('migration_last_attempt'), 10)).toLocaleString() : 'None'}</p>
        <p><strong>Migration Source:</strong> {getLocalStorageValue('migration_last_source') || 'None'}</p>
        <p><strong>Migration In Progress:</strong> {getLocalStorageValue('migration_in_progress') === 'true' ? 'Yes' : 'No'}</p>
        <p><strong>Current Resume ID:</strong> {getLocalStorageValue('current_resume_id') || 'None'}</p>
        
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleSetMigrationFlags}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set Migration Flags
          </button>
          
          <button 
            onClick={handleClearMigrationData}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Migration Data
          </button>
          
          <button 
            onClick={handleTestFactory}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Factory
          </button>
        </div>
      </div>
      
      {testResults && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: testResults.status === 'error' ? '#ffebee' : '#f1f8e9' }}>
          <h2>Factory Test Results</h2>
          <p><strong>Status:</strong> {testResults.status}</p>
          <p><strong>Time:</strong> {testResults.timestamp}</p>
          
          {testResults.status === 'error' ? (
            <>
              <p><strong>Error:</strong> {testResults.error}</p>
              <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: '10px' }}>
                {testResults.stack}
              </pre>
            </>
          ) : (
            <>
              <p><strong>Service Type:</strong> {testResults.serviceType}</p>
              <p><strong>Service Available:</strong> {testResults.serviceAvailable ? 'Yes' : 'No'}</p>
              <p><strong>Is DB Service:</strong> {testResults.factory?.isDbService ? 'Yes' : 'No'}</p>
              <p><strong>Is LocalStorage Service:</strong> {testResults.factory?.isLocalStorageService ? 'Yes' : 'No'}</p>
              <p><strong>Needs Migration:</strong> {testResults.factory?.needsMigration ? 'Yes' : 'No'}</p>
            </>
          )}
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <h2>How to test migration:</h2>
        <ol>
          <li>Click "Clear Migration Data" to reset migration state</li>
          <li>Click "Set Migration Flags" to prepare for migration</li>
          <li>Sign out and sign back in to trigger migration</li>
          <li>Return to this page to see migration results</li>
        </ol>
      </div>
      
      {migrationResult && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: migrationResult.success ? '#f1f8e9' : '#ffebee' }}>
          <h2>Last Migration Result</h2>
          <p><strong>Success:</strong> {migrationResult.success ? 'Yes' : 'No'}</p>
          <p><strong>Code:</strong> {migrationResult.code}</p>
          {migrationResult.error && <p><strong>Error:</strong> {migrationResult.error}</p>}
          {migrationResult.message && <p><strong>Message:</strong> {migrationResult.message}</p>}
          <p><strong>Timestamp:</strong> {migrationResult.timestamp ? new Date(migrationResult.timestamp).toLocaleString() : 'Not available'}</p>
        </div>
      )}
      
      {migrationLogs && migrationLogs.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h2>Migration Logs</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Time</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Message</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {migrationLogs.map((log, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{log.message}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {log.data ? (
                      <details>
                        <summary>View Data</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
                          {log.data}
                        </pre>
                      </details>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ marginBottom: '30px' }}>
        <h2>LocalStorage Data</h2>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          maxHeight: '500px',
          overflow: 'auto'
        }}>
          {JSON.stringify(localStorageData, null, 2)}
        </pre>
      </div>
    </div>
  );
};

// Add this configuration to disable static generation for this page
export const config = {
  unstable_runtimeJS: true,
};

// Add getServerSideProps to force server-side rendering
export async function getServerSideProps() {
  return {
    props: {
      // You can pass server props here if needed
      serverTime: new Date().toISOString(),
    },
  };
}

export default TestMigrationPage; 