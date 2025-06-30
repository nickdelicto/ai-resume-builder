import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

export default function TestMigrationPage() {
  const { data: session, status } = useSession();
  const [localStorageData, setLocalStorageData] = useState({});
  const [migrationLogs, setMigrationLogs] = useState([]);
  const [lastMigrationResult, setLastMigrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [factoryTestResult, setFactoryTestResult] = useState(null);
  
  // Collect localStorage data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Collect all localStorage data related to migration
      const data = {};
      
      // Collect all localStorage keys that might be relevant to migration
      const keysToCollect = [
        'modern_resume_data',
        'resume_section_order',
        'modern_resume_progress',
        'needs_db_migration',
        'db_only_mode',
        'current_resume_id',
        'migration_in_progress',
        'migration_start_time',
        'migration_session_id',
        'selected_resume_template',
        'migration_last_attempt',
        'migration_last_source',
        'migration_last_result'
      ];
      
      keysToCollect.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            // Try to parse JSON values
            data[key] = JSON.parse(value);
          } catch (e) {
            // If not JSON, store as string
            data[key] = value;
          }
        }
      });
      
      setLocalStorageData(data);
      
      // Get migration logs if available
      try {
        const logsStr = localStorage.getItem('migration_logs');
        if (logsStr) {
          const logs = JSON.parse(logsStr);
          setMigrationLogs(logs);
        }
      } catch (e) {
        console.error('Error parsing migration logs:', e);
      }
      
      // Get last migration result if available
      try {
        const resultStr = localStorage.getItem('migration_last_result');
        if (resultStr) {
          const result = JSON.parse(resultStr);
          setLastMigrationResult(result);
        }
      } catch (e) {
        console.error('Error parsing migration result:', e);
      }
    }
  }, []);
  
  // Add a function to force migration flags in localStorage
  const handleSetMigrationFlags = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('needs_db_migration', 'true');
      
      // Generate a unique migration session ID
      const migrationSessionId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('migration_session_id', migrationSessionId);
      
      // Clear any previous migration results
      localStorage.removeItem('migration_last_result');
      localStorage.removeItem('migration_logs');
      
      // Update our state
      const updatedData = {
        ...localStorageData,
        needs_db_migration: 'true',
        migration_session_id: migrationSessionId
      };
      setLocalStorageData(updatedData);
      
      // Clear previous logs and results
      setMigrationLogs([]);
      setLastMigrationResult(null);
      
      alert('Migration flags set in localStorage. Sign out and sign back in to trigger migration.');
    }
  };
  
  // Add a function to clear migration data
  const handleClearMigrationData = () => {
    if (typeof window !== 'undefined') {
      // Clear migration-related localStorage items
      [
        'needs_db_migration',
        'migration_session_id',
        'migration_in_progress',
        'migration_start_time',
        'migration_last_attempt',
        'migration_last_source',
        'migration_last_result',
        'migration_logs',
        'db_only_mode'
      ].forEach(key => localStorage.removeItem(key));
      
      // Update state
      setMigrationLogs([]);
      setLastMigrationResult(null);
      
      // Update localStorage data state
      const updatedData = {...localStorageData};
      Object.keys(updatedData).forEach(key => {
        if (key.includes('migration') || key === 'db_only_mode' || key === 'needs_db_migration') {
          delete updatedData[key];
        }
      });
      setLocalStorageData(updatedData);
      
      alert('Migration data cleared from localStorage.');
    }
  };
  
  // Add a function to test the ResumeServiceFactory directly in the browser
  const handleTestFactory = async () => {
    setFactoryTestResult(null);
    
    try {
      // Import the factory dynamically
      const ResumeServiceFactory = (await import('../lib/services/ResumeServiceFactory')).default;
      
      // Test the factory
      const result = await ResumeServiceFactory.getService({ 
        isAuthenticated: status === 'authenticated' 
      });
      
      // Check service availability
      const serviceAvailable = result.service && 
        typeof result.service.isAvailable === 'function' && 
        result.service.isAvailable();
      
      // Set the result
      setFactoryTestResult({
        hasService: !!result.service,
        serviceType: result.service ? result.service.constructor.name : 'undefined',
        needsMigration: result.needsMigration,
        isDbService: result.isDbService,
        isLocalStorageService: result.isLocalStorageService,
        isAvailable: serviceAvailable
      });
    } catch (err) {
      setFactoryTestResult({ error: err.message });
      console.error('Error testing factory:', err);
    }
  };
  
  // Format timestamp to readable date
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Head>
        <title>Migration Diagnostics</title>
      </Head>
      
      <h1>Migration Diagnostics Tool</h1>
      <p>This page helps diagnose issues with localStorage to database migration.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Authentication Status</h2>
        <p>
          <strong>Status:</strong> {status}
          {session && (
            <span> - Signed in as {session.user?.email || 'Unknown'}</span>
          )}
        </p>
        <p>
          <strong>User ID:</strong> {session?.user?.id || 'Not available'}
        </p>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Migration Status</h2>
        <div style={{ 
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#f5f5f5',
          marginBottom: '10px'
        }}>
          <p><strong>DB-only Mode:</strong> {localStorageData.db_only_mode ? 'Yes' : 'No'}</p>
          <p><strong>Needs Migration:</strong> {localStorageData.needs_db_migration ? 'Yes' : 'No'}</p>
          <p><strong>Last Migration Attempt:</strong> {localStorageData.migration_last_attempt ? formatTimestamp(parseInt(localStorageData.migration_last_attempt)) : 'None'}</p>
          <p><strong>Migration Source:</strong> {localStorageData.migration_last_source || 'None'}</p>
          <p><strong>Migration In Progress:</strong> {localStorageData.migration_in_progress ? 'Yes' : 'No'}</p>
          <p><strong>Current Resume ID:</strong> {localStorageData.current_resume_id || 'None'}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button 
            onClick={handleSetMigrationFlags}
            style={{
              padding: '10px 20px',
              background: '#1a73e8',
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
              padding: '10px 20px',
              background: '#dc3545',
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
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Factory
          </button>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <p><strong>How to test migration:</strong></p>
          <ol>
            <li>Click "Clear Migration Data" to reset migration state</li>
            <li>Click "Set Migration Flags" to prepare for migration</li>
            <li>Sign out and sign back in to trigger migration</li>
            <li>Return to this page to see migration results</li>
          </ol>
        </div>
      </div>
      
      {lastMigrationResult && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Last Migration Result</h2>
          <div style={{ 
            padding: '10px',
            border: '1px solid',
            borderColor: lastMigrationResult.success ? '#28a745' : '#dc3545',
            borderRadius: '4px',
            background: lastMigrationResult.success ? '#f0fff0' : '#fff0f0',
            marginBottom: '10px'
          }}>
            <p><strong>Success:</strong> {lastMigrationResult.success ? 'Yes' : 'No'}</p>
            <p><strong>Code:</strong> {lastMigrationResult.code}</p>
            {lastMigrationResult.error && <p><strong>Error:</strong> {lastMigrationResult.error}</p>}
            {lastMigrationResult.message && <p><strong>Message:</strong> {lastMigrationResult.message}</p>}
            <p><strong>Timestamp:</strong> {formatTimestamp(lastMigrationResult.timestamp)}</p>
            {lastMigrationResult.data?.resumeId && <p><strong>Resume ID:</strong> {lastMigrationResult.data.resumeId}</p>}
          </div>
        </div>
      )}
      
      {factoryTestResult && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Factory Test Result</h2>
          <div style={{ 
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#f5f5f5'
          }}>
            <pre>{JSON.stringify(factoryTestResult, null, 2)}</pre>
          </div>
        </div>
      )}
      
      {migrationLogs && migrationLogs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Migration Logs</h2>
          <div style={{ 
            maxHeight: '400px', 
            overflow: 'auto', 
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#f5f5f5'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>Time</th>
                  <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>Message</th>
                  <th style={{ textAlign: 'left', padding: '5px', borderBottom: '1px solid #ddd' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {migrationLogs.map((log, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '5px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '5px' }}>{log.message}</td>
                    <td style={{ padding: '5px', fontFamily: 'monospace', fontSize: '12px' }}>
                      {log.data ? (
                        <details>
                          <summary>View Data</summary>
                          <pre style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>
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
        </div>
      )}
      
      <div style={{ marginBottom: '20px' }}>
        <h2>LocalStorage Data</h2>
        <div style={{ 
          maxHeight: '200px', 
          overflow: 'auto', 
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: '#f5f5f5'
        }}>
          <pre>{JSON.stringify(localStorageData, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
} 