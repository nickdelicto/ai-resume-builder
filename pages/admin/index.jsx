import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: _session, status } = useSession();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');

  // Job Alerts state
  const [alerts, setAlerts] = useState([]);
  const [alertsStats, setAlertsStats] = useState(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);
  const [alertFilter, setAlertFilter] = useState({ specialty: '', state: '', active: 'all' });

  // Users state
  const [users, setUsers] = useState([]);
  const [usersStats, setUsersStats] = useState(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [userFilter, setUserFilter] = useState({ plan: 'all', hasResumes: 'all' });

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(null);

  // User journeys state
  const [userJourneys, setUserJourneys] = useState(null);
  const [journeysLoading, setJourneysLoading] = useState(true);

  // Check admin auth
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
            fetchUsers();
            fetchAnalytics();
            fetchUserJourneys();
          }
        } else {
          router.push('/profile');
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        router.push('/profile');
      }
    };
    checkAdmin();
  }, [status, router]);

  // Fetch job alerts
  const fetchAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const response = await fetch('/api/admin/job-alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts);
      setAlertsStats(data.stats);
    } catch (error) {
      setAlertsError(error.message);
    } finally {
      setAlertsLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
      setUsersStats(data.stats);
    } catch (error) {
      setUsersError(error.message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const response = await fetch('/api/admin/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      setAnalyticsError(error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch user journeys
  const fetchUserJourneys = async () => {
    setJourneysLoading(true);
    try {
      const response = await fetch('/api/admin/user-journeys');
      if (!response.ok) throw new Error('Failed to fetch journeys');
      const data = await response.json();
      setUserJourneys(data);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    } finally {
      setJourneysLoading(false);
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (alertFilter.specialty && alert.specialty !== alertFilter.specialty) return false;
    if (alertFilter.state && alert.state !== alertFilter.state) return false;
    if (alertFilter.active === 'active' && !alert.active) return false;
    if (alertFilter.active === 'inactive' && alert.active) return false;
    return true;
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    if (userFilter.plan === 'paid' && !user.subscription?.isActive) return false;
    if (userFilter.plan === 'free' && user.subscription?.isActive) return false;
    if (userFilter.hasResumes === 'yes' && user.resumeCount === 0) return false;
    if (userFilter.hasResumes === 'no' && user.resumeCount > 0) return false;
    return true;
  });

  const alertSpecialties = [...new Set(alerts.map(a => a.specialty).filter(Boolean))].sort();
  const alertStates = [...new Set(alerts.map(a => a.state).filter(Boolean))].sort();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatPrice = (cents) => {
    if (!cents) return '$0';
    return `$${(cents / 100).toFixed(0)}`;
  };

  // Loading state
  if (status === 'loading' || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="h-12 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'analytics', label: 'Analytics', count: null },
    { id: 'alerts', label: 'Job Alerts', count: alertsStats?.total || 0 },
    { id: 'users', label: 'Users', count: usersStats?.total || 0 },
    { id: 'tools', label: 'Tools', count: null },
  ];

  return (
    <>
      <Head>
        <title>Admin Dashboard | IntelliResume</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <Link href="/profile" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-3">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Profile
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full uppercase">Admin</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div className="flex overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-0 px-4 sm:px-6 py-4 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              analytics={analytics}
              loading={analyticsLoading}
              error={analyticsError}
              onRefresh={() => { fetchAnalytics(); fetchUserJourneys(); }}
              userJourneys={userJourneys}
              journeysLoading={journeysLoading}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsTab
              alerts={filteredAlerts}
              allAlerts={alerts}
              stats={alertsStats}
              loading={alertsLoading}
              error={alertsError}
              filter={alertFilter}
              setFilter={setAlertFilter}
              specialties={alertSpecialties}
              states={alertStates}
              onRefresh={fetchAlerts}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={filteredUsers}
              allUsers={users}
              stats={usersStats}
              loading={usersLoading}
              error={usersError}
              filter={userFilter}
              setFilter={setUserFilter}
              onRefresh={fetchUsers}
              formatDate={formatDate}
              formatPrice={formatPrice}
            />
          )}

          {activeTab === 'tools' && (
            <ToolsTab />
          )}
        </div>
      </div>
    </>
  );
}

// Job Alerts Tab Component
function AlertsTab({ alerts, allAlerts, stats, loading, error, filter, setFilter, specialties, states, onRefresh, formatDate }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Subscribers" value={stats?.total || 0} icon="users" color="blue" />
        <StatCard label="Active" value={stats?.active || 0} icon="check" color="emerald" />
        <StatCard label="Specialties" value={stats ? Object.keys(stats.bySpecialty).length : 0} icon="flask" color="purple" />
        <StatCard label="States" value={stats ? Object.keys(stats.byState).length : 0} icon="map" color="amber" />
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={filter.specialty}
              onChange={(e) => setFilter({ ...filter, specialty: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">All Specialties</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filter.state}
              onChange={(e) => setFilter({ ...filter, state: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filter.active}
              onChange={(e) => setFilter({ ...filter, active: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} disabled={loading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <a href="/api/admin/job-alerts-export" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
              Export CSV
            </a>
          </div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Email', 'Specialty', 'State', 'Source', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {alerts.map((alert, idx) => (
                <tr key={alert.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3 text-sm font-medium">{alert.email}</td>
                  <td className="px-4 py-3"><Badge text={alert.specialty} color="purple" /></td>
                  <td className="px-4 py-3 text-sm">{alert.state || '-'}</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-1 rounded">{alert.source || 'unknown'}</span></td>
                  <td className="px-4 py-3"><StatusBadge active={alert.active} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(alert.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden divide-y">
          {alerts.map(alert => (
            <div key={alert.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium break-all pr-2">{alert.email}</span>
                <StatusBadge active={alert.active} />
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {alert.specialty && <Badge text={alert.specialty} color="purple" />}
                {alert.state && <Badge text={alert.state} color="amber" />}
              </div>
              <div className="text-xs text-gray-400">{formatDate(alert.createdAt)} · {alert.source || 'unknown'}</div>
            </div>
          ))}
        </div>
        {alerts.length === 0 && !loading && <EmptyState message="No job alerts found" />}
      </div>
      <div className="text-sm text-gray-500 text-center">Showing {alerts.length} of {allAlerts.length}</div>
    </div>
  );
}

// Users Tab Component
function UsersTab({ users, allUsers, stats, loading, error, filter, setFilter, onRefresh, formatDate, formatPrice }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.total || 0} icon="users" color="blue" />
        <StatCard label="Paid" value={stats?.withSubscription || 0} icon="credit-card" color="emerald" />
        <StatCard label="This Month" value={stats?.thisMonth || 0} icon="calendar" color="purple" />
        <StatCard label="Total Resumes" value={stats?.totalResumes || 0} icon="document" color="amber" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={filter.plan}
              onChange={(e) => setFilter({ ...filter, plan: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Plans</option>
              <option value="paid">Paid Only</option>
              <option value="free">Free Only</option>
            </select>
            <select
              value={filter.hasResumes}
              onChange={(e) => setFilter({ ...filter, hasResumes: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">All Users</option>
              <option value="yes">With Resumes</option>
              <option value="no">No Resumes</option>
            </select>
          </div>
          <button onClick={onRefresh} disabled={loading} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['User', 'Plan', 'Resumes', 'Status', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user, idx) => (
                <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{user.name || 'No name'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {user.subscription?.isActive ? (
                      <div>
                        <Badge text={user.subscription.planName} color="emerald" />
                        <div className="text-xs text-gray-500 mt-1">{formatPrice(user.subscription.price)}</div>
                      </div>
                    ) : (
                      <Badge text="Free" color="gray" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${user.resumeCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {user.resumeCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge active={user.subscription?.isActive} activeText="Active" inactiveText="Free" />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile */}
        <div className="md:hidden divide-y">
          {users.map(user => (
            <div key={user.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{user.name || 'No name'}</div>
                  <div className="text-xs text-gray-500 break-all">{user.email}</div>
                </div>
                <StatusBadge active={user.subscription?.isActive} activeText="Paid" inactiveText="Free" />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{user.resumeCount} resumes</span>
                <span>·</span>
                <span>{formatDate(user.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
        {users.length === 0 && !loading && <EmptyState message="No users found" />}
      </div>
      <div className="text-sm text-gray-500 text-center">Showing {users.length} of {allUsers.length}</div>
    </div>
  );
}

// Tools Tab Component
function ToolsTab() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Link href="/admin/cleanup" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-100 transition-colors">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Resume Cleanup</h3>
        <p className="text-sm text-gray-500">Remove duplicate resumes to reduce database bloat</p>
      </Link>

      <Link href="/admin/job-alerts" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">Job Alerts (Full View)</h3>
        <p className="text-sm text-gray-500">Detailed view of all job alert subscriptions</p>
      </Link>
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({ analytics, loading, error, onRefresh, userJourneys, journeysLoading }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>)}
        </div>
        <div className="h-64 bg-white rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  if (!analytics) {
    return <EmptyState message="No analytics data available" />;
  }

  const { funnel, engagement, breakdowns, recentKnownUsers } = analytics;

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <button onClick={onRefresh} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
          Refresh
        </button>
      </div>

      {/* Funnel Overview - Applied is the ultimate goal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Funnel (All Time)</h3>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
          {/* Page Views */}
          <div className="flex-1 text-center p-3 bg-blue-50 rounded-xl relative group">
            <InfoTooltip text="Each job counted once per visitor session. Refreshes and revisits don't inflate the number." />
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{funnel.total.pageViews.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-blue-700 mt-1">Job Views</div>
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center text-gray-400">
            <svg className="w-6 h-6 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-xs font-medium text-emerald-600">{funnel.rates.applyRate}%</span>
          </div>
          {/* Apply Clicks (modal opened) */}
          <div className="flex-1 text-center p-3 bg-amber-50 rounded-xl relative group">
            <InfoTooltip text="User clicked Apply and the modal opened. They haven't left your site yet." />
            <div className="text-2xl sm:text-3xl font-bold text-amber-600">{funnel.total.applyClicks.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-amber-700 mt-1">Opened Modal</div>
          </div>
          {/* Arrow */}
          <div className="flex flex-col items-center text-gray-400">
            <svg className="w-6 h-6 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="text-xs font-medium text-emerald-600">{funnel.rates.redirectRate}%</span>
          </div>
          {/* Employer Redirects (actually applied) - THE GOAL */}
          <div className="flex-1 text-center p-3 bg-emerald-50 rounded-xl relative group border-2 border-emerald-200">
            <InfoTooltip text="User left your site to apply on the employer's career page. This is the goal!" />
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{funnel.total.employerRedirects?.toLocaleString() || 0}</div>
            <div className="text-xs sm:text-sm text-emerald-700 mt-1 font-semibold">Applied</div>
          </div>
          {/* Email capture inline */}
          <div className="hidden sm:flex flex-col items-center text-gray-300 px-1">
            <span className="text-lg">+</span>
          </div>
          <div className="flex-1 text-center p-3 bg-purple-50 rounded-xl relative group">
            <InfoTooltip text="Users who gave email before applying. Your lead capture rate." />
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{funnel.total.modalSubscribes.toLocaleString()}</div>
            <div className="text-xs sm:text-sm text-purple-700 mt-1">Emails</div>
            <div className="text-xs text-purple-500">({funnel.keyMetrics?.emailCaptureRate || 0}% of applied)</div>
          </div>
        </div>

        {/* Key Business Metrics - fixed positioning */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap justify-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <span className="text-sm text-emerald-700">Apply-Through:</span>
            <span className="text-sm font-bold text-emerald-800">{funnel.keyMetrics?.applyThroughRate || 0}%</span>
            <div className="relative group/tip">
              <svg className="w-4 h-4 text-emerald-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full mb-2 right-0 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50">
                % of job views that led to applications
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full">
            <span className="text-sm text-purple-700">Visitor → Lead:</span>
            <span className="text-sm font-bold text-purple-800">{funnel.keyMetrics?.sessionConversion || 0}%</span>
            <div className="relative group/tip">
              <svg className="w-4 h-4 text-purple-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="absolute bottom-full mb-2 right-0 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-50">
                % of unique visitors who gave email
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Time Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TimeCard title="Today" data={funnel.today} />
        <TimeCard title="Last 7 Days" data={funnel.week} />
        <TimeCard title="Last 30 Days" data={funnel.month} />
      </div>

      {/* All-Time Summary */}
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          All-Time Summary
          <span className="text-xs font-normal text-gray-400">(unique counts)</span>
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Unique Visitors" value={engagement.uniqueSessions} icon="users" color="blue" subtitle="sessions" />
          <StatCard label="Job Views" value={funnel.total.pageViews} icon="document" color="blue" subtitle="deduplicated" />
          <StatCard label="Applications" value={funnel.total.employerRedirects || 0} icon="check" color="emerald" subtitle="to employer sites" />
          <StatCard label="Leads Captured" value={engagement.uniqueEmails} icon="users" color="purple" subtitle="unique emails" />
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Employers */}
        <BreakdownCard
          title="Top Employers"
          data={breakdowns.employers}
        />

        {/* Top Specialties */}
        <BreakdownCard
          title="Top Specialties"
          data={breakdowns.specialties}
        />

        {/* Top States */}
        <BreakdownCard
          title="Top States"
          data={breakdowns.states}
        />

        {/* Top Cities */}
        <BreakdownCard
          title="Top Cities"
          data={breakdowns.cities || []}
          showState
        />
      </div>

      {/* User Journeys */}
      <UserJourneysSection
        journeys={userJourneys?.journeys || []}
        loading={journeysLoading}
        formatDate={formatDate}
      />
    </div>
  );
}

// Time period card for analytics
function TimeCard({ title, data }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{data.pageViews}</div>
          <div className="text-xs text-gray-500">Views</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-600">{data.applyClicks}</div>
          <div className="text-xs text-gray-500">Modals</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-600">{data.employerRedirects || 0}</div>
          <div className="text-xs text-gray-500">Applied</div>
        </div>
        <div>
          <div className="text-lg font-bold text-emerald-600">{data.modalSubscribes}</div>
          <div className="text-xs text-gray-500">Subs</div>
        </div>
      </div>
    </div>
  );
}

// Breakdown card with both clicks and applications
function BreakdownCard({ title, data, showState = false }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="text-amber-600">Modals</span>
          <span className="text-emerald-600">Applied</span>
        </div>
      </div>
      {data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm text-gray-700 truncate pr-2 flex-1">
                {item.name}{showState && item.state ? `, ${item.state}` : ''}
              </span>
              <div className="flex gap-3 text-sm font-medium">
                <span className="w-8 text-right text-amber-600">{item.clicks || 0}</span>
                <span className="w-8 text-right text-emerald-600">{item.applied || 0}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No data yet</p>
      )}
    </div>
  );
}

// Info tooltip with hover
function InfoTooltip({ text, position = 'bottom' }) {
  const positionClasses = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div className="absolute top-1 right-1 group/tooltip">
      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className={`absolute right-0 ${positionClasses} w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 shadow-lg`}>
        {text}
        <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} right-2 border-4 border-transparent ${position === 'top' ? 'border-t-gray-900' : 'border-b-gray-900'}`}></div>
      </div>
    </div>
  );
}

// Event type badge
function EventTypeBadge({ type }) {
  const styles = {
    page_view: 'bg-blue-50 text-blue-700',
    apply_click: 'bg-amber-50 text-amber-700',
    employer_redirect: 'bg-orange-50 text-orange-700',
    modal_subscribe: 'bg-emerald-50 text-emerald-700',
    resume_click: 'bg-purple-50 text-purple-700'
  };
  const labels = {
    page_view: 'View',
    apply_click: 'Modal',
    employer_redirect: 'Applied',
    modal_subscribe: 'Subscribe',
    resume_click: 'Resume'
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  );
}

// User Journeys Section with expandable timelines
function UserJourneysSection({ journeys, loading, formatDate }) {
  const [expandedEmail, setExpandedEmail] = useState(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  if (!journeys || journeys.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-500 text-center">No user journeys yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">User Journeys</h4>
        <span className="text-xs text-gray-500">{journeys.length} known users</span>
      </div>
      <div className="divide-y max-h-[600px] overflow-y-auto">
        {journeys.map((journey, idx) => (
          <div key={journey.email} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
            {/* Email row - clickable to expand */}
            <button
              onClick={() => setExpandedEmail(expandedEmail === journey.email ? null : journey.email)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  journey.eventCounts.employer_redirect > 0 ? 'bg-emerald-500' :
                  journey.eventCounts.apply_click > 0 ? 'bg-amber-500' : 'bg-blue-500'
                }`}>
                  {journey.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-gray-900">{journey.email}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-blue-600">{journey.eventCounts.page_view} views</span>
                    <span className="text-xs text-amber-600">{journey.eventCounts.apply_click} modals</span>
                    <span className="text-xs text-emerald-600">{journey.eventCounts.employer_redirect} applied</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:block">{formatDate(journey.lastSeen)}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedEmail === journey.email ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Expanded journey timeline */}
            {expandedEmail === journey.email && (
              <div className="px-4 pb-4 pt-2 bg-gray-50/50">
                {/* Journey direction indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">START</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="text-gray-400">{journey.events.length} steps</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">LATEST</span>
                </div>
                <div className="relative pl-8 space-y-0">
                  {journey.events.map((event, eventIdx) => {
                    const isFirst = eventIdx === 0;
                    const isLast = eventIdx === journey.events.length - 1;
                    const eventColors = {
                      page_view: { dot: 'bg-blue-500', line: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' },
                      apply_click: { dot: 'bg-amber-500', line: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
                      employer_redirect: { dot: 'bg-emerald-500', line: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                      modal_subscribe: { dot: 'bg-teal-500', line: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-700' }
                    };
                    const color = eventColors[event.eventType] || eventColors.page_view;
                    const eventLabels = {
                      page_view: 'Viewed Job',
                      apply_click: 'Opened Modal',
                      employer_redirect: 'Applied',
                      modal_subscribe: 'Subscribed'
                    };

                    return (
                      <div key={event.id} className="relative pb-4">
                        {/* Vertical line */}
                        {!isLast && (
                          <div className="absolute left-[-18px] top-6 bottom-0 w-0.5 bg-gray-300"></div>
                        )}
                        {/* Step number */}
                        <div className={`absolute left-[-26px] top-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          isFirst ? 'bg-green-500' : isLast ? 'bg-purple-500' : color.dot
                        }`}>
                          {eventIdx + 1}
                        </div>
                        {/* Down arrow between events */}
                        {!isLast && (
                          <div className="absolute left-[-21px] bottom-1 text-gray-400">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M6 9L2 5h8L6 9z" />
                            </svg>
                          </div>
                        )}
                        {/* Event content */}
                        <div className={`${color.bg} rounded-lg p-3 ${isFirst ? 'ring-2 ring-green-300' : ''} ${isLast ? 'ring-2 ring-purple-300' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isFirst && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-medium">START</span>}
                              {isLast && <span className="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded font-medium">LATEST</span>}
                              <span className={`text-sm font-medium ${color.text}`}>
                                {eventLabels[event.eventType] || event.eventType}
                              </span>
                              {event.employer && (
                                <span className="text-xs text-gray-600">at {event.employer}</span>
                              )}
                              {event.specialty && (
                                <span className="text-xs bg-white/60 text-gray-600 px-1.5 py-0.5 rounded">{event.specialty}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(event.createdAt)}</span>
                          </div>
                          {event.jobSlug && (
                            <a
                              href={`/jobs/nursing/${event.jobSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 block truncate"
                            >
                              {event.jobSlug.replace(/-/g, ' ').slice(0, 60)}...
                              <svg className="inline-block w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Reusable Components
function StatCard({ label, value, icon, color, subtitle }) {
  const icons = {
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    flask: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />,
    map: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></>,
    'credit-card': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    document: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  };
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', value: 'text-gray-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', value: 'text-emerald-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', value: 'text-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-600' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold ${c.value}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${c.bg} rounded-xl flex items-center justify-center`}>
          <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[icon]}</svg>
        </div>
      </div>
    </div>
  );
}

function Badge({ text, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return text ? (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${colors[color] || colors.gray}`}>{text}</span>
  ) : null;
}

function StatusBadge({ active, activeText = 'Active', inactiveText = 'Inactive' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
      {active ? activeText : inactiveText}
    </span>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}
