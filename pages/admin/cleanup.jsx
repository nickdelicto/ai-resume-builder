import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CleanupPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [maxToKeep, setMaxToKeep] = useState(1);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Check if user is authenticated and admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (status === 'loading') return;
      
      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }
      
      try {
        // Call an API endpoint to verify admin status
        const response = await fetch('/api/admin/check');
        
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
          
          if (!data.isAdmin) {
            // Redirect non-admin users
            router.push('/profile');
          }
        } else {
          setIsAdmin(false);
          router.push('/profile');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        router.push('/profile');
      }
    };
    
    checkAdmin();
  }, [status, router]);

  const runCleanup = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Construct the query parameters
      const params = new URLSearchParams();
      params.append('dryRun', isDryRun.toString());
      params.append('maxToKeep', maxToKeep.toString());
      
      if (userIdFilter) {
        params.append('userId', userIdFilter);
      }
      
      // Call the cleanup API
      const response = await fetch(`/api/resume/cleanup?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run cleanup');
      }
      
      const data = await response.json();
      setResults(data);
      
      // Reset confirmation if this was a real run
      if (!isDryRun) {
        setConfirming(false);
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      setError(error.message || 'An error occurred during cleanup');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupClick = () => {
    // If not in dry run mode, require confirmation
    if (!isDryRun && !confirming) {
      setConfirming(true);
      return;
    }
    
    runCleanup();
  };

  // Render loading state or redirect if not admin
  if (status === 'loading' || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Resume Cleanup</h1>
        <p>Checking access...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin - Resume Cleanup</title>
      </Head>
      <div className="container mx-auto px-4 pt-24 pb-8">
        <h1 className="text-2xl font-bold mb-6">Resume Cleanup Tool</h1>
        <p className="mb-4 text-gray-700">
          This tool helps clean up duplicate resumes by keeping only the most recent versions for each user.
        </p>
        
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cleanup Options</h2>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => {
                  setIsDryRun(e.target.checked);
                  setConfirming(false); // Reset confirmation when changing modes
                }}
                className="mr-2"
              />
              Dry Run (preview only, no deletions)
            </label>
            <p className="text-sm text-gray-500 ml-6">
              Recommend running in dry run mode first to see what would be deleted.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              Max Resumes to Keep per Title:
              <input
                type="number"
                min="1"
                max="10"
                value={maxToKeep}
                onChange={(e) => setMaxToKeep(parseInt(e.target.value, 10))}
                className="ml-2 p-2 border rounded"
              />
            </label>
            <p className="text-sm text-gray-500">
              For each unique resume title, keep this many of the most recent versions.
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">
              Filter by User ID (optional):
              <input
                type="text"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value.trim())}
                placeholder="Leave empty for all users"
                className="ml-2 p-2 border rounded w-64"
              />
            </label>
            <p className="text-sm text-gray-500">
              Limit cleanup to a specific user. Leave empty to process all users.
            </p>
          </div>
          
          {confirming ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-700 font-semibold">Warning: This will permanently delete duplicate resumes.</p>
              <p className="text-red-600 mb-3">Are you sure you want to continue?</p>
              <div className="flex space-x-3">
                <button
                  onClick={runCleanup}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Yes, Delete Duplicates'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCleanupClick}
              className={`px-4 py-2 rounded text-white ${isDryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
              disabled={loading}
            >
              {loading ? 'Processing...' : isDryRun ? 'Run Dry Run Analysis' : 'Clean Up Duplicates'}
            </button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-700 font-medium mb-2">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {results && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Cleanup Results</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-lg font-medium text-gray-800">{results.statistics.totalResumes}</div>
                <div className="text-sm text-gray-600">Total Resumes</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="text-lg font-medium text-gray-800">{results.statistics.uniqueTitles}</div>
                <div className="text-sm text-gray-600">Unique Titles</div>
              </div>
              <div className="bg-green-50 p-4 rounded-md">
                <div className="text-lg font-medium text-green-800">{results.statistics.toKeep}</div>
                <div className="text-sm text-green-600">Resumes to Keep</div>
              </div>
              <div className={`${isDryRun ? 'bg-yellow-50' : 'bg-red-50'} p-4 rounded-md`}>
                <div className={`text-lg font-medium ${isDryRun ? 'text-yellow-800' : 'text-red-800'}`}>
                  {isDryRun ? results.statistics.toDelete : results.statistics.actuallyDeleted}
                </div>
                <div className={`text-sm ${isDryRun ? 'text-yellow-600' : 'text-red-600'}`}>
                  {isDryRun ? 'Resumes That Would Be Deleted' : 'Resumes Actually Deleted'}
                </div>
              </div>
            </div>
            
            {isDryRun && results.statistics.toDelete > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    setIsDryRun(false);
                    setConfirming(true);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  disabled={loading}
                >
                  Proceed with Real Cleanup
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Ready to proceed? Click to perform the actual cleanup.
                </p>
              </div>
            )}
            
            {/* Display detailed results in development mode */}
            {process.env.NODE_ENV === 'development' && results.details && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Detailed Results</h3>
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                  <pre className="text-xs text-gray-800">
                    {JSON.stringify(results.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
} 