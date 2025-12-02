import { useState, useEffect } from 'react';

/**
 * Reusable Job Alert Signup Component
 * Displays a signup form for job alerts on job listing pages
 * Supports smart pre-filling based on page context
 * 
 * @param {string} specialty - Pre-filled specialty (optional)
 * @param {string} location - Pre-filled location (optional, format: "City, State" or "State")
 * @param {string} state - Pre-filled state code (optional)
 * @param {string} city - Pre-filled city (optional)
 * @param {boolean} compact - If true, shows compact horizontal layout for mid-page placement
 */
export default function JobAlertSignup({ specialty = '', location = '', state = '', city = '', compact = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: specialty,
    location: location,
    state: state,
    city: city
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [manageToken, setManageToken] = useState(null); // For "manage alerts" link when limit reached
  const [locations, setLocations] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [locationValid, setLocationValid] = useState(location !== '');

  // Fetch available locations and specialties on mount
  useEffect(() => {
    async function fetchOptions() {
      try {
        // Fetch locations
        const locRes = await fetch('/api/salary-calculator/locations');
        const locData = await locRes.json();
        // Extract just the string values from the API response
        const locationStrings = (locData.locations || []).map(loc => 
          typeof loc === 'string' ? loc : loc.value || loc
        );
        setLocations(locationStrings);

        // Fetch specialties (from a static list or API)
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

  // Validate location against available options
  useEffect(() => {
    if (!formData.location) {
      setLocationValid(false);
      return;
    }
    const isValid = locations.some(loc => 
      loc.toLowerCase() === formData.location.toLowerCase()
    );
    setLocationValid(isValid);
  }, [formData.location, locations]);

  /**
   * Parse location string into city and state
   * e.g., "Binghamton, NY" -> { city: "Binghamton", state: "NY" }
   * or "Ohio" -> { city: null, state: "OH" }
   */
  const parseLocation = (locationString) => {
    if (!locationString) return { city: null, state: null };
    
    // Check if it's "City, State" format
    if (locationString.includes(',')) {
      const parts = locationString.split(',').map(p => p.trim());
      return {
        city: parts[0],
        state: parts[1]
      };
    }
    
    // Otherwise, assume it's just a state name
    return {
      city: null,
      state: locationString.trim()
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!locationValid) {
      setError('Please select a valid location from the dropdown');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Parse location before submitting
      const { city: parsedCity, state: parsedState } = parseLocation(formData.location);
      
      const response = await fetch('/api/salary-calculator/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          city: parsedCity || formData.city,
          state: parsedState || formData.state
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({ name: '', email: '', specialty: specialty, location: location, state: state, city: city });
        // Don't auto-hide success - user must click "Create Another Alert" to reset
      } else {
        setError(data.message || data.error || 'Failed to subscribe');
        // If user hit 5-alert limit, store token for "manage alerts" link
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
              onClick={() => {
                setSuccess(false);
                setError('');
                setManageToken(null);
              }}
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
          We'll send you {formData.specialty || 'RN'} job alerts for {formData.location || 'your area'} every Tuesday at 7 AM EST.
        </p>
        <p className="text-sm text-green-100 mb-6">
          Check your inbox for a confirmation email!
        </p>
        <button
          onClick={() => {
            setSuccess(false);
            setError('');
            setManageToken(null);
          }}
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
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900">Get Weekly RN Job Alerts</h3>
              <p className="text-sm text-blue-700">New {specialty || 'nursing'} jobs in {location || 'your area'} • Every Tuesday</p>
            </div>
          </div>

          {/* Form - 2 rows for better spacing */}
          <form onSubmit={handleSubmit} className="space-y-3">
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

            {/* Row 2: Specialty, Location, Button */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                required
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="px-4 py-2.5 rounded-lg border-2 border-blue-200 bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              >
                <option value="">Select specialty *</option>
                {specialties.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              <input
                type="text"
                required
                list="locations-list-compact"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Location *"
                autoComplete="off"
                className={`px-4 py-2.5 rounded-lg border-2 ${
                  locationValid || !formData.location ? 'border-blue-200' : 'border-red-400'
                } bg-white text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm`}
              />
              <datalist id="locations-list-compact">
                {locations.map(loc => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>

              <button
                type="submit"
                disabled={loading || !locationValid}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
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
              ✓ Weekly alerts • ✓ Unsubscribe anytime • ✓ 100% Free
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-2xl shadow-2xl p-8 md:p-10 relative overflow-hidden">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/3 translate-y-1/3"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase mb-4 shadow-md">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Weekly Job Alerts
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Never Miss a Fresh RN Job Opening
          </h2>
          <p className="text-blue-50 text-lg max-w-2xl mx-auto">
            Get {specialty || 'tailored RN'} job alerts delivered to your inbox every Tuesday • 100% Free
          </p>
        </div>

        {/* Form Card - White container for contrast */}
        <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <option value="">Select a specialty</option>
                  {specialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="alert-location" className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  id="alert-location"
                  required
                  list="locations-list"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Cleveland, Ohio or Ohio"
                  autoComplete="off"
                  className={`w-full px-4 py-3 rounded-lg border-2 ${
                    locationValid || !formData.location
                      ? 'border-gray-300'
                      : 'border-red-400'
                  } text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all`}
                />
                <datalist id="locations-list">
                  {locations.map(loc => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
                {!locationValid && formData.location && (
                  <p className="text-red-600 text-xs mt-1">
                    Please select a valid location from the dropdown
                  </p>
                )}
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
              disabled={loading || !locationValid}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg py-4 rounded-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
            >
              {loading ? 'Subscribing...' : '📬 Send Me Job Alerts'}
            </button>

            <p className="text-center text-gray-600 text-sm">
              ✓ Weekly Alerts • ✓ Unsubscribe anytime • ✓ 100% Free
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

