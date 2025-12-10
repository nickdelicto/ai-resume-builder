import { useState, useEffect } from 'react';

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
  
  // Dropdown options
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingEmployers, setLoadingEmployers] = useState(false);

  // Fetch available states and specialties on mount
  useEffect(() => {
    async function fetchOptions() {
      try {
        // Fetch states
        const statesRes = await fetch('/api/job-alerts/states');
        const statesData = await statesRes.json();
        if (statesData.states) {
          setStates(statesData.states);
        }

        // Fetch specialties
        const specRes = await fetch('/api/jobs/browse-stats');
        const specData = await specRes.json();
        if (specData.data && specData.data.specialties) {
          setSpecialties(specData.data.specialties.map(s => s.name));
        }
      } catch (err) {
        console.error('Error fetching options:', err);
      }
    }
    fetchOptions();
  }, []);

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
          website: formData.website // Honeypot field (should be empty)
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

  // COMPACT VERSION - Professional blue/white for mid-page placement
  if (compact) {
    return (
      <div className="bg-blue-50 border-2 border-blue-600 rounded-xl shadow-xl p-5">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full flex-shrink-0 shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-blue-900 font-bold text-base">Get Weekly Job Alerts</h3>
              <p className="text-blue-700 text-sm">New jobs delivered every Tuesday</p>
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
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Your email *"
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              />
            </div>

            {/* Row 2: Specialty */}
            <select
              required
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
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
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
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
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-400"
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
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-400"
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm"
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
                    className="text-blue-600 hover:text-blue-800 font-semibold underline inline-flex items-center gap-1"
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
            <p className="text-center text-blue-700 text-xs font-medium">
              ✓ Weekly updates &nbsp; ✓ Highest paying first &nbsp; ✓ Unsubscribe anytime
            </p>
          </form>
        </div>
      </div>
    );
  }

  // FULL VERSION - Large banner for bottom of pages
  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-2xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
      
      <div className="relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-6 shadow-lg">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          FREE JOB ALERTS
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Never Miss Your Perfect RN Job
        </h2>
        <p className="text-blue-100 text-lg mb-8 max-w-2xl">
          Get the highest-paying nursing jobs delivered to your inbox every Tuesday morning. 
          Personalized to your specialty and location preferences.
        </p>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-8 max-w-3xl">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label htmlFor="alert-name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="alert-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="alert-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="alert-email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Specialty */}
              <div>
                <label htmlFor="alert-specialty" className="block text-sm font-semibold text-gray-700 mb-2">
                  Specialty *
                </label>
                <select
                  id="alert-specialty"
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Select specialty</option>
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div>
                <label htmlFor="alert-state" className="block text-sm font-semibold text-gray-700 mb-2">
                  State *
                </label>
                <select
                  id="alert-state"
                  required
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '', employer: '' })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
                >
                  <option value="">Select state</option>
                  {states.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label htmlFor="alert-city" className="block text-sm font-semibold text-gray-700 mb-2">
                  City (Optional)
                </label>
                <select
                  id="alert-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value, employer: '' })}
                  disabled={!formData.state || loadingCities}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {!formData.state 
                      ? 'Select state first' 
                      : loadingCities 
                        ? 'Loading...' 
                        : `All of ${getStateName(formData.state)}`
                    }
                  </option>
                  {cities.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.jobCount} jobs)</option>
                  ))}
                </select>
              </div>

              {/* Employer (Optional) */}
              <div className="md:col-span-2">
                <label htmlFor="alert-employer" className="block text-sm font-semibold text-gray-700 mb-2">
                  Specific Employer (Optional)
                </label>
                <select
                  id="alert-employer"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  disabled={!formData.state || loadingEmployers}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">
                    {!formData.state 
                      ? 'Select a state first' 
                      : loadingEmployers 
                        ? 'Loading employers...' 
                        : 'All Employers'
                    }
                  </option>
                  {employers.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobCount} jobs)</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to get alerts from all employers in your selected location
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 rounded-lg p-4 text-sm">
                <p className="mb-2">{error}</p>
                {manageToken && (
                  <a
                    href={`/job-alerts/manage?token=${manageToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-semibold underline inline-flex items-center gap-1"
                  >
                    Manage your alerts
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Alert...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Subscribe to Job Alerts
                </span>
              )}
            </button>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 pt-2">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Weekly Updates
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Highest Paying First
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Unsubscribe Anytime
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
