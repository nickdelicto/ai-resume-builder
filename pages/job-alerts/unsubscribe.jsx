import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

/**
 * Unsubscribe Page
 * Allows users to unsubscribe from a specific job alert using their unique token
 */
export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [error, setError] = useState(null);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Fetch alert details
    fetch(`/api/job-alerts/get-by-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAlert(data.currentAlert);
        } else {
          setError(data.error || 'Alert not found');
        }
      })
      .catch(err => {
        console.error('Error fetching alert:', err);
        setError('Failed to load alert details');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/job-alerts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, active: false })
      });

      const data = await response.json();

      if (data.success) {
        setUnsubscribed(true);
        setAlert(data.alert);
      } else {
        setError(data.error || 'Failed to unsubscribe');
      }
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      const response = await fetch('/api/job-alerts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, active: true })
      });

      const data = await response.json();

      if (data.success) {
        setUnsubscribed(false);
        setAlert(data.alert);
      } else {
        setError(data.error || 'Failed to reactivate');
      }
    } catch (err) {
      console.error('Error reactivating:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Unsubscribe from Job Alerts | IntelliResume</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
              <h1 className="text-3xl font-bold text-white">
                {unsubscribed ? '✅ Unsubscribed' : '📧 Job Alert Settings'}
              </h1>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading alert details...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Alert Not Found</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Link href="/jobs/nursing/rn-salary-calculator" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                    Browse Jobs
                  </Link>
                </div>
              ) : unsubscribed ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">You've been unsubscribed</h2>
                  <p className="text-gray-600 mb-6">
                    You will no longer receive emails for <strong>{alert.specialty}</strong> jobs in <strong>{alert.location}</strong>.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                      onClick={handleReactivate}
                      disabled={processing}
                      className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Reactivate Alert'}
                    </button>
                    <Link href={`/job-alerts/manage?token=${token}`} className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition">
                      Manage All Alerts
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Alert Details</h2>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Specialty:</span>
                        <span className="font-semibold text-gray-900">{alert.specialty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-semibold text-gray-900">{alert.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-semibold text-gray-900">{alert.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`font-semibold ${alert.active ? 'text-green-600' : 'text-gray-500'}`}>
                          {alert.active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      <strong>Are you sure you want to unsubscribe?</strong><br />
                      You will no longer receive job alerts for this specialty and location.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleUnsubscribe}
                      disabled={processing}
                      className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {processing ? 'Processing...' : 'Unsubscribe'}
                    </button>
                    <Link href={`/job-alerts/manage?token=${token}`} className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center">
                      Manage All Alerts
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back to Jobs */}
          <div className="text-center mt-8">
            <Link href="/jobs/nursing" className="text-blue-600 hover:underline font-medium">
              ← Browse RN Jobs
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

