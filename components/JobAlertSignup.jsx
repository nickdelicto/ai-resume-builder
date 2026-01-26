import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

// SWR fetcher
const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * Reusable Job Alert Signup Component
 * Displays a signup form for job alerts on job listing pages
 * Supports smart pre-filling based on page context
 * Uses native <select> dropdowns for perfect mobile compatibility
 * 
 * @param {string} specialty - Pre-filled specialty (optional)
 * @param {string} state - Pre-filled state code (optional)
 * @param {string} city - Pre-filled city (optional)
 * @param {boolean} compact - If true, shows compact horizontal layout for mid-page placement
 */
export default function JobAlertSignup({ specialty = '', state = '', city = '', compact = false }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: specialty,
    state: state,
    city: city,
    employer: '', // Optional employer filter
    website: '' // HONEYPOT FIELD - hidden from users, bots will fill it
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [manageToken, setManageToken] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  
  // Dropdown options - use SWR for caching across all instances
  const { data: statesData } = useSWR('/api/job-alerts/states', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
  });
  const states = statesData?.states || [];

  const { data: browseStatsData } = useSWR('/api/jobs/browse-stats', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 300000, // 5 minutes
  });
  const specialties = browseStatsData?.data?.specialties?.map(s => s.name) || [];

  const [cities, setCities] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingEmployers, setLoadingEmployers] = useState(false);

  // Pre-fill email from URL query params (for redirects from homepage)
  useEffect(() => {
    if (router.isReady && router.query.email) {
      setFormData(prev => ({ ...prev, email: router.query.email }));
    }
  }, [router.isReady, router.query.email]);

  // Fetch cities when state changes
  useEffect(() => {
    async function fetchCities() {
      if (!formData.state) {
        setCities([]);
        setEmployers([]);
        return;
      }

      setLoadingCities(true);
      try {
        const res = await fetch(`/api/job-alerts/cities?state=${formData.state}`);
        const data = await res.json();
        if (data.cities) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      } finally {
        setLoadingCities(false);
      }
    }
    fetchCities();
  }, [formData.state]);

  // Fetch employers when state or city changes
  useEffect(() => {
    async function fetchEmployers() {
      if (!formData.state) {
        setEmployers([]);
        return;
      }

      setLoadingEmployers(true);
      try {
        let url = `/api/job-alerts/employers?state=${formData.state}`;
        if (formData.city) {
          url += `&city=${encodeURIComponent(formData.city)}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.employers) {
          setEmployers(data.employers);
        }
      } catch (err) {
        console.error('Error fetching employers:', err);
      } finally {
        setLoadingEmployers(false);
      }
    }
    fetchEmployers();
  }, [formData.state, formData.city]);

  // Load and execute reCAPTCHA v3 for spam protection
  useEffect(() => {
    // Load reCAPTCHA script if not already loaded
    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        executeRecaptcha();
      };
    } else if (window.grecaptcha) {
      executeRecaptcha();
    }

    function executeRecaptcha() {
      if (window.grecaptcha && window.grecaptcha.ready) {
        window.grecaptcha.ready(() => {
          window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'job_alert_signup' })
            .then(token => {
              setRecaptchaToken(token);
            })
            .catch(err => {
              console.error('reCAPTCHA execution error:', err);
            });
        });
      }
    }
  }, []);

  // Get full state name for display
  const getStateName = (stateCode) => {
    const stateObj = states.find(s => s.code === stateCode);
    return stateObj ? stateObj.name : stateCode;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.state) {
      setError('Please select a state');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate FRESH reCAPTCHA token right before submission (tokens expire after 2 minutes)
      let freshToken = recaptchaToken;
      if (window.grecaptcha && window.grecaptcha.ready) {
        try {
          freshToken = await window.grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, 
            { action: 'job_alert_submit' }
          );
          console.log('Fresh reCAPTCHA token generated for submission');
        } catch (err) {
          console.error('Failed to generate fresh reCAPTCHA token:', err);
          setError('Security verification failed. Please refresh the page.');
          setLoading(false);
          return;
        }
      } else {
        console.error('reCAPTCHA not loaded');
        setError('Security verification not ready. Please refresh the page.');
        setLoading(false);
        return;
      }

      // Build location string for display
      let locationStr = formData.city 
        ? `${formData.city}, ${formData.state}` 
        : getStateName(formData.state);
      
      // Add employer to location if selected
      const selectedEmployer = employers.find(e => e.id === formData.employer);
      if (selectedEmployer) {
        locationStr = `${locationStr} (${selectedEmployer.name})`;
      }
      
      const response = await fetch('/api/salary-calculator/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          specialty: formData.specialty,
          location: locationStr,
          state: formData.state,
          city: formData.city || null,
          employerId: formData.employer || null,
          recaptchaToken: freshToken, // Fresh token generated right before submission
          website: formData.website, // Honeypot field (should be empty)
          source: router.asPath || window.location.pathname // Track where signup came from
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', specialty: specialty, state: state, city: city, employer: '', website: '' });
      } else {
        setError(data.message || data.error || 'Failed to subscribe');
        if (data.manageToken) {
          setManageToken(data.manageToken);
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset form handler
  const handleReset = () => {
    setSuccess(false);
    setError('');
    setManageToken(null);
  };

  if (success) {
    // Compact success state
    if (compact) {
      return (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-5 border-l-4 border-green-800">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div className="text-white flex-1">
                <p className="font-bold text-base">You're All Set! 🎉</p>
                <p className="text-sm text-green-100">
                  We'll send you {formData.specialty || 'RN'} job alerts every Tuesday at 7 AM EST.
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="bg-white text-green-700 hover:bg-green-50 font-semibold px-4 py-2 rounded-lg transition-all text-sm w-full md:w-auto md:self-start"
            >
              Create Another Alert
            </button>
          </div>
        </div>
      );
    }

    // Full success state
    return (
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2">You're All Set! 🎉</h3>
        <p className="text-green-100 mb-3">
          We'll send you {formData.specialty || 'RN'} job alerts every Tuesday at 7 AM EST.
        </p>
        <p className="text-sm text-green-100 mb-6">
          Check your inbox for a confirmation email!
        </p>
        <button
          onClick={handleReset}
          className="bg-white text-green-700 hover:bg-green-50 font-semibold px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          Create Another Alert
        </button>
      </div>
    );
  }

  // COMPACT VERSION - Professional teal/white for mid-page placement
  if (compact) {
    return (
      <div className="bg-teal-50 border-2 border-teal-600 rounded-xl shadow-xl p-5">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-teal-600 rounded-full flex-shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-teal-900 font-bold text-base">Get Weekly Job Alerts</h3>
              <p className="text-teal-700 text-sm">New jobs delivered every Tuesday</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* HONEYPOT FIELD - Hidden from humans, bots will fill it */}
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              tabIndex="-1"
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
              aria-hidden="true"
            />

            {/* Row 1: Name, Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                className="px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
              />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Your email *"
                className="px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
              />
            </div>

            {/* Row 2: Specialty */}
            <select
              required
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
            >
              <option value="">Select specialty *</option>
              {specialties.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>

            {/* Row 3: State, City */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '', employer: '' })}
                className="px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm"
              >
                <option value="">Select state *</option>
                {states.map(s => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>

              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value, employer: '' })}
                disabled={!formData.state || loadingCities}
                className="px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">{formData.state ? `All of ${getStateName(formData.state)}` : 'Select state first'}</option>
                {cities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Employer (Optional), Subscribe Button */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={formData.employer}
                onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                disabled={!formData.state || loadingEmployers}
                className="px-4 py-2.5 rounded-lg border-2 border-teal-200 bg-white text-gray-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">
                  {!formData.state 
                    ? 'Select state first' 
                    : loadingEmployers 
                      ? 'Loading...' 
                      : 'All Employers (Optional)'
                  }
                </option>
                {employers.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm"
              >
                {loading ? 'Subscribing...' : '📬 Subscribe'}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-xs bg-red-50 p-3 rounded border border-red-200">
                <p className="mb-2">{error}</p>
                {manageToken && (
                  <a
                    href={`/job-alerts/manage?token=${manageToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-800 font-semibold underline inline-flex items-center gap-1"
                  >
                    Manage your alerts
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Benefits */}
            <p className="text-center text-teal-700 text-xs font-medium">
              ✓ Weekly updates &nbsp; ✓ Highest paying first &nbsp; ✓ Unsubscribe anytime
            </p>
          </form>
        </div>
      </div>
    );
  }

  // FULL VERSION - Compact banner for bottom of pages
  return (
    <div className="max-w-3xl mx-auto bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-lg p-5 md:p-6">
      {/* Header Row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Get Job Alerts</h2>
          <p className="text-teal-100 text-sm">Top-paying jobs sent weekly. Free.</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 space-y-3">
        {/* HONEYPOT */}
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          tabIndex="-1"
          autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
          aria-hidden="true"
        />

        {/* Row 1: Name, Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your name"
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm"
          />
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Email *"
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm"
          />
        </div>

        {/* Row 2: Specialty, State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            required
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm"
          >
            <option value="">Specialty *</option>
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
          <select
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '', employer: '' })}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm"
          >
            <option value="">State *</option>
            {states.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Row 3: City, Employer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value, employer: '' })}
            disabled={!formData.state || loadingCities}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{formData.state ? `All of ${getStateName(formData.state)}` : 'City (optional)'}</option>
            {cities.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <select
            value={formData.employer}
            onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
            disabled={!formData.state || loadingEmployers}
            className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-200 text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{formData.state ? 'All employers' : 'Employer (optional)'}</option>
            {employers.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            <p>{error}</p>
            {manageToken && (
              <a href={`/job-alerts/manage?token=${manageToken}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-medium">
                Manage alerts →
              </a>
            )}
          </div>
        )}

        {/* Submit + Benefits Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {loading ? 'Subscribing...' : 'Subscribe Free'}
          </button>
          <p className="text-xs text-gray-500 text-center md:text-left">
            Weekly emails · Highest paying first · Unsubscribe anytime
          </p>
        </div>
      </form>
    </div>
  );
}
