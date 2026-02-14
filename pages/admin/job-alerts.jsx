import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function JobAlertsAdminPage() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ specialty: '', state: '', active: 'all' });

  // Check if user is authenticated and admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.push('/auth/signin');
        return;
      }

      try {
        const response = await fetch('/api/admin/check');

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);

          if (!data.isAdmin) {
            router.push('/profile');
          } else {
            fetchAlerts();
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

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/job-alerts');

      if (!response.ok) {
        throw new Error('Failed to fetch job alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching job alerts:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/admin/job-alerts-export';
  };

  // Filter alerts based on current filters
  const filteredAlerts = alerts.filter(alert => {
    if (filter.specialty && alert.specialty !== filter.specialty) return false;
    if (filter.state && alert.state !== filter.state) return false;
    if (filter.active === 'active' && !alert.active) return false;
    if (filter.active === 'inactive' && alert.active) return false;
    return true;
  });

  // Get unique specialties and states for filter dropdowns
  const specialties = [...new Set(alerts.map(a => a.specialty).filter(Boolean))].sort();
  const states = [...new Set(alerts.map(a => a.state).filter(Boolean))].sort();

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render loading state
  if (status === 'loading' || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl p-5 h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Job Alerts Admin | IntelliResume</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 pt-24 pb-6 max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/profile"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Profile
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Job Alerts</h1>
                  <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                    Admin
                  </span>
                </div>
                <p className="text-gray-500 mt-1">Manage email subscriptions for job notifications</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchAlerts}
                  className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-all shadow-sm"
                  disabled={loading}
                >
                  <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Subscribers</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.total || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Active</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats?.active || 0}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Specialties</p>
                  <p className="text-3xl font-bold text-purple-600">{stats ? Object.keys(stats.bySpecialty).length : 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">States</p>
                  <p className="text-3xl font-bold text-amber-600">{stats ? Object.keys(stats.byState).length : 0}</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Specialty</label>
                <select
                  value={filter.specialty}
                  onChange={(e) => setFilter({ ...filter, specialty: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">State</label>
                <select
                  value={filter.state}
                  onChange={(e) => setFilter({ ...filter, state: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="">All States</option>
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={filter.active}
                  onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Error loading data</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Specialty</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">State</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employer</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAlerts.map((alert, idx) => (
                    <tr key={alert.id} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900">{alert.email}</span>
                      </td>
                      <td className="px-5 py-4">
                        {alert.specialty ? (
                          <span className="inline-flex px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md">
                            {alert.specialty}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Any</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {alert.state ? (
                          <span className="text-sm font-medium text-gray-700">{alert.state}</span>
                        ) : (
                          <span className="text-sm text-gray-400">Any</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{alert.employer?.name || '-'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{alert.source || 'unknown'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                          alert.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${alert.active ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {alert.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">{formatDate(alert.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-medium text-gray-900 text-sm break-all pr-2">{alert.email}</div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                      alert.active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${alert.active ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                      {alert.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {alert.specialty && (
                      <span className="inline-flex px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded">
                        {alert.specialty}
                      </span>
                    )}
                    {alert.state && (
                      <span className="inline-flex px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded">
                        {alert.state}
                      </span>
                    )}
                  </div>
                  {alert.employer?.name && (
                    <p className="text-sm text-gray-600 mb-2">{alert.employer.name}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{formatDate(alert.createdAt)}</span>
                    <span>·</span>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded">{alert.source || 'unknown'}</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredAlerts.length === 0 && !loading && !error && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No subscriptions found</h3>
                <p className="text-sm text-gray-500">
                  {alerts.length > 0
                    ? 'Try adjusting your filters'
                    : 'Job alert subscriptions will appear here'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-500">
            <span>Showing {filteredAlerts.length} of {alerts.length} subscriptions</span>
            {filteredAlerts.length > 0 && (
              <span className="text-xs text-gray-400">Last updated: {new Date().toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
