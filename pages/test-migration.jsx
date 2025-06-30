import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

export default function TestMigrationPage() {
  const { data: session, status } = useSession();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localStorageData, setLocalStorageData] = useState({});
  const [error, setError] = useState(null);
  
  // Collect localStorage data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
        'selected_resume_template'
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
    }
  }, []);
  
  const handleTestMigration = async () => {
    if (status !== 'authenticated') {
      setError('You must be signed in to test migration');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          localStorageData
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
      console.error('Error testing migration:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Head>
        <title>Test Migration</title>
      </Head>
      
      <h1>Test Migration Tool</h1>
      <p>This page helps diagnose issues with localStorage to database migration.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Authentication Status</h2>
        <p>
          <strong>Status:</strong> {status}
          {session && (
            <span> - Signed in as {session.user?.email || 'Unknown'}</span>
          )}
        </p>
      </div>
      
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
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleTestMigration}
          disabled={loading || status !== 'authenticated'}
          style={{
            padding: '10px 20px',
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status !== 'authenticated' || loading ? 'not-allowed' : 'pointer',
            opacity: status !== 'authenticated' || loading ? 0.7 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test Migration'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          marginBottom: '20px',
          padding: '10px',
          border: '1px solid #f44336',
          borderRadius: '4px',
          background: '#ffebee',
          color: '#d32f2f'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Test Result</h2>
          <div style={{ 
            maxHeight: '400px', 
            overflow: 'auto', 
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            background: '#f5f5f5'
          }}>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 