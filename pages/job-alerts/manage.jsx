import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { SPECIALTIES } from '../../lib/constants/specialties';

/**
 * Manage Job Alerts Page
 * Allows users to view and manage all their job alerts using their unique token
 */
export default function ManageAlertsPage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  
  // New alert form state
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetchAlerts();
  }, [token]);

  // Fetch locations for autocomplete
  useEffect(() => {
    fetch('/api/salary-calculator/locations')
      .then(res => res.json())
      .then(data => {
        // Extract just the 'value' from each location object
        const locationValues = (data.locations || []).map(loc => loc.value);
        setLocations(locationValues);
      })
      .catch(err => console.error('Error fetching locations:', err));
  }, []);

  const fetchAlerts = () => {
    fetch(`/api/job-alerts/get-by-token?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAlerts(data.allAlerts);
          // Store user's email for creating new alerts
          if (data.currentAlert?.email) {
            setUserEmail(data.currentAlert.email);
          }
        } else {
          setError(data.error || 'Failed to load alerts');
        }
      })
      .catch(err => {
        console.error('Error fetching alerts:', err);
        setError('Failed to load alerts');
      })
      .finally(() => setLoading(false));
  };

  const handleToggleActive = async (alertToken, currentStatus) => {
    setProcessingId(alertToken);
    try {
      const response = await fetch('/api/job-alerts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: alertToken, active: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setAlerts(alerts.map(alert => 
          alert.unsubscribeToken === alertToken 
            ? { ...alert, active: !currentStatus }
            : alert
        ));
      } else {
        alert('Failed to update alert: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating alert:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (alertToken) => {
    if (!confirm('Are you sure you want to permanently delete this alert?')) {
      return;
    }

    setProcessingId(alertToken);
    try {
      const response = await fetch('/api/job-alerts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: alertToken })
      });

      const data = await response.json();

      if (data.success) {
        // Remove from local state
        setAlerts(alerts.filter(alert => alert.unsubscribeToken !== alertToken));
      } else {
        alert('Failed to delete alert: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting alert:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(false);

    // Validate
    if (!newSpecialty || !newLocation) {
      setCreateError('Please select both specialty and location');
      return;
    }

    // Validate location against autocomplete
    const validLocation = locations.some(loc => loc === newLocation);
    if (!validLocation) {
      setCreateError('Please select a location from the dropdown');
      return;
    }

    setCreatingAlert(true);

    try {
      const response = await fetch('/api/salary-calculator/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          specialty: newSpecialty,
          location: newLocation
        })
      });

      const data = await response.json();

      if (data.success) {
        setCreateSuccess(true);
        setNewSpecialty('');
        setNewLocation('');
        
        // Refresh alerts list
        fetchAlerts();
        
        // Auto-hide form after 2 seconds
        setTimeout(() => {
          setShowNewAlertForm(false);
          setCreateSuccess(false);
        }, 2000);
      } else {
        setCreateError(data.message || 'Failed to create alert');
      }
    } catch (err) {
      console.error('Error creating alert:', err);
      setCreateError('Something went wrong. Please try again.');
    } finally {
      setCreatingAlert(false);
    }
  };

  const activeCount = alerts.filter(a => a.active).length;
  const inactiveCount = alerts.filter(a => !a.active).length;

  return (
    <>
      <Head>
        <title>Manage Job Alerts | IntelliResume</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
              <h1 className="text-3xl font-bold text-white text-center">
                📬 Manage Your Job Alerts
              </h1>
              {alerts.length > 0 && (
                <p className="text-blue-100 text-center mt-2">
                  {activeCount} active • {inactiveCount} inactive
                </p>
              )}
            </div>

            {/* Content */}
            <div className="px-6 py-8">
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Loading your alerts...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">❌</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Alerts</h2>
                  <p className="text-gray-600 mb-6">{error}</p>
                  <Link href="/jobs/nursing/rn-salary-calculator" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                    Create New Alert
                  </Link>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📭</div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No Alerts Found</h2>
                  <p className="text-gray-600 mb-6">You don't have any job alerts set up yet.</p>
                  <Link href="/jobs/nursing/rn-salary-calculator" className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                    Create Your First Alert
                  </Link>
                </div>
              ) : (
                <div>
                  {/* Create New Alert Section */}
                  <div className="mb-6">
                    <button
                      onClick={() => setShowNewAlertForm(!showNewAlertForm)}
                      className="inline-block px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      {showNewAlertForm ? '− Cancel' : '+ Create New Alert'}
                    </button>
                  </div>

                  {/* New Alert Form */}
                  {showNewAlertForm && (
                    <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Job Alert</h3>
                      
                      {createError && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                          {createError}
                        </div>
                      )}
                      
                      {createSuccess && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm font-semibold">
                          ✅ Alert created successfully!
                        </div>
                      )}

                      <form onSubmit={handleCreateAlert} className="space-y-4">
                        {/* Specialty Dropdown */}
                        <div>
                          <label htmlFor="new-specialty" className="block text-sm font-semibold text-gray-700 mb-2">
                            Specialty <span className="text-red-600">*</span>
                          </label>
                          <select
                            id="new-specialty"
                            value={newSpecialty}
                            onChange={(e) => setNewSpecialty(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select a specialty...</option>
                            {SPECIALTIES.map(spec => (
                              <option key={spec} value={spec}>{spec}</option>
                            ))}
                          </select>
                        </div>

                        {/* Location Autocomplete */}
                        <div>
                          <label htmlFor="new-location" className="block text-sm font-semibold text-gray-700 mb-2">
                            Location (City or State) <span className="text-red-600">*</span>
                          </label>
                          <input
                            type="text"
                            id="new-location"
                            list="location-options"
                            value={newLocation}
                            onChange={(e) => setNewLocation(e.target.value)}
                            placeholder="Start typing a city or state..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoComplete="off"
                            required
                          />
                          <datalist id="location-options">
                            {locations.map((loc, idx) => (
                              <option key={idx} value={loc} />
                            ))}
                          </datalist>
                          <p className="mt-1 text-xs text-gray-500">
                            Select from the dropdown to ensure accurate matching
                          </p>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={creatingAlert}
                          className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingAlert ? 'Creating Alert...' : 'Create Alert & Get Jobs'}
                        </button>
                      </form>
                    </div>
                  )}

                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`border rounded-lg p-5 transition ${
                          alert.active 
                            ? 'bg-white border-gray-200' 
                            : 'bg-gray-50 border-gray-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">
                                {alert.specialty}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                alert.active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {alert.active ? '✅ Active' : '❌ Inactive'}
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>📍 <strong>Location:</strong> {alert.location}</p>
                              <p>✉️ <strong>Email:</strong> {alert.email}</p>
                              <p>📅 <strong>Created:</strong> {new Date(alert.createdAt).toLocaleDateString()}</p>
                              {alert.lastEmailSent && (
                                <p>📧 <strong>Last Email:</strong> {new Date(alert.lastEmailSent).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            <button
                              onClick={() => handleToggleActive(alert.unsubscribeToken, alert.active)}
                              disabled={processingId === alert.unsubscribeToken}
                              className={`px-4 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                                alert.active
                                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {processingId === alert.unsubscribeToken 
                                ? '...' 
                                : alert.active 
                                  ? 'Pause' 
                                  : 'Activate'
                              }
                            </button>
                            <button
                              onClick={() => handleDelete(alert.unsubscribeToken)}
                              disabled={processingId === alert.unsubscribeToken}
                              className="px-4 py-2 text-sm font-semibold bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
                            >
                              {processingId === alert.unsubscribeToken ? '...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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

