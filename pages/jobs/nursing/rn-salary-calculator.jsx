import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SPECIALTIES } from '../../../lib/constants/specialties';
import { getStateCode } from '../../../lib/jobScraperUtils';

export default function RNSalaryCalculator() {
  const [specialty, setSpecialty] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState(3);
  const [jobType, setJobType] = useState('any');
  const [shiftType, setShiftType] = useState('any');
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [salaryData, setSalaryData] = useState(null);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [emailForAlert, setEmailForAlert] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [subscribeError, setSubscribeError] = useState(null);

  // Use master specialties list for consistency
  const specialties = SPECIALTIES;
  
  // Get current year for dynamic content
  const currentYear = new Date().getFullYear();

  // Fetch available locations on component mount
  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('/api/salary-calculator/locations');
        const data = await response.json();
        
        if (data.success) {
          setLocations(data.locations);
        }
      } catch (err) {
        console.error('Failed to load locations:', err);
      } finally {
        setLoadingLocations(false);
      }
    }
    
    fetchLocations();
  }, []);

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    if (!specialty || !location) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate location exists in our list (strict validation)
    const isValidLocation = locations.some(loc => 
      loc.value.toLowerCase() === location.trim().toLowerCase()
    );
    
    if (!isValidLocation && locations.length > 0) {
      setError('Please select a valid location from the dropdown list. Start typing to see available options.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSalaryData(null);
    
    try {
      const response = await fetch('/api/salary-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialty,
          location,
          experience: parseInt(experience),
          jobType: jobType !== 'any' ? jobType : null,
          shiftType: shiftType !== 'any' ? shiftType : null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || 'Unable to calculate salary');
        setShowResults(false);
      } else {
        setSalaryData(data);
        setShowResults(true);
        setError(null);
        
        // Scroll to results after a brief delay
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err) {
      console.error('Calculation error:', err);
      setError('Something went wrong. Please try again.');
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubscribe = async () => {
    if (!emailForAlert) {
      setSubscribeError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForAlert)) {
      setSubscribeError('Please enter a valid email address');
      return;
    }

    setSubscribing(true);
    setSubscribeError(null);

    try {
      // Parse location to extract city and state properly
      let stateCode = null;
      let cityName = null;
      
      if (location.includes(',')) {
        // Format: "Cleveland, OH" or "Cleveland, Ohio"
        const parts = location.split(',').map(s => s.trim());
        cityName = parts[0];
        const statePart = parts[1];
        
        // Convert state name to code if needed
        stateCode = statePart.length === 2 
          ? statePart.toUpperCase() 
          : getStateCode(statePart) || statePart.toUpperCase();
      } else {
        // Just state: "Ohio" or "OH"
        if (location.length === 2) {
          stateCode = location.toUpperCase();
        } else {
          stateCode = getStateCode(location);
        }
      }

      const response = await fetch('/api/salary-calculator/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailForAlert,
          specialty,
          location,
          state: stateCode,
          city: cityName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setSubscribeError(data.message || 'Failed to subscribe. Please try again.');
      } else {
        setSubscribeSuccess(true);
        setEmailForAlert(''); // Clear the email field
      }
    } catch (err) {
      console.error('Subscribe error:', err);
      setSubscribeError('Something went wrong. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <>
      <Head>
        <title>RN Salary Calculator - Free Nursing Salary Estimator {currentYear} | IntelliResume</title>
        <meta name="description" content={`Calculate your registered nurse salary based on specialty, location, and experience. Get accurate RN salary estimates for ${currentYear} with our free nursing salary calculator.`} />
        <meta name="keywords" content="rn salary calculator, nursing salary calculator, registered nurse salary, nurse pay calculator, nursing salary estimator" />
        <link rel="canonical" href="https://intelliresume.net/jobs/nursing/rn-salary-calculator" />
        <meta property="og:title" content={`RN Salary Calculator - Free Nursing Salary Estimator ${currentYear}`} />
        <meta property="og:description" content={`Calculate your registered nurse salary based on specialty, location, and experience. Get accurate RN salary estimates for ${currentYear}.`} />
        <meta property="og:url" content="https://intelliresume.net/jobs/nursing/rn-salary-calculator" />
        <meta property="og:type" content="website" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50" style={{ fontFamily: "'Figtree', 'Inter', sans-serif" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          
          {/* Breadcrumbs */}
          <nav className="mb-4 sm:mb-6 text-sm">
            <ol className="flex items-center space-x-2 text-gray-600 flex-wrap">
              <li><Link href="/" className="hover:text-blue-600">Home</Link></li>
              <li><span className="mx-2">/</span></li>
              <li><Link href="/jobs/nursing" className="hover:text-blue-600">RN Jobs</Link></li>
              <li><span className="mx-2">/</span></li>
              <li className="text-gray-900 font-medium">Salary Calculator</li>
            </ol>
          </nav>

          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
              💰 RN Salary Calculator
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              See what you should be earning in {currentYear}. Get personalized salary estimates based on your specialty, location, and experience.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Takes 10 seconds
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                100% Free
              </span>
            </div>
          </div>

          {/* Calculator Form */}
          <form onSubmit={handleCalculate} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
            
            {/* Specialty Selection */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="specialty" className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                1. What's your nursing specialty? <span className="text-red-500">*</span>
              </label>
              <select
                id="specialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="w-full px-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              >
                <option value="">Select a specialty...</option>
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            {/* Location Input with Autocomplete */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="location" className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                2. Where do you work (or want to work)? <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="location"
                  name="location"
                  list="location-suggestions"
                  autoComplete="off"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={loadingLocations ? "Loading locations..." : "Start typing: Cleveland, OH or Ohio"}
                  className="w-full px-4 py-3 sm:py-4 text-base sm:text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                  disabled={loadingLocations}
                />
                {location && locations.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {locations.some(loc => loc.value.toLowerCase() === location.trim().toLowerCase()) ? (
                      <span className="text-green-600 text-xl">✓</span>
                    ) : (
                      <span className="text-orange-500 text-xl">⚠</span>
                    )}
                  </div>
                )}
              </div>
              <datalist id="location-suggestions">
                {locations.map((loc, idx) => (
                  <option key={idx} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </datalist>
              <p className="mt-2 text-sm text-gray-500">
                {loadingLocations ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading available locations...
                  </span>
                ) : location && !locations.some(loc => loc.value.toLowerCase() === location.trim().toLowerCase()) ? (
                  <span className="text-orange-600">
                    ⚠️ Please select a location from the dropdown suggestions
                  </span>
                ) : (
                  `Type to search ${locations.length} available locations (cities or states)`
                )}
              </p>
            </div>

            {/* Experience Slider */}
            <div className="mb-6 sm:mb-8">
              <label htmlFor="experience" className="block text-base sm:text-lg font-semibold text-gray-900 mb-3">
                3. How many years of RN experience do you have?
              </label>
              <div className="px-2">
                <input
                  type="range"
                  id="experience"
                  min="0"
                  max="20"
                  step="1"
                  value={experience}
                  onChange={(e) => setExperience(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(experience / 20) * 100}%, #e5e7eb ${(experience / 20) * 100}%, #e5e7eb 100%)`
                  }}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">0 years</span>
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                      {experience === 20 ? '20+' : experience}
                    </div>
                    <div className="text-sm text-gray-600">
                      {experience === 0 ? 'New Grad' : experience === 1 ? 'year' : 'years'}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">20+ years</span>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Options */}
            <div className="mb-6 sm:mb-8">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border-2 border-gray-200 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{showAdvanced ? '▼' : '▶'}</span>
                  <span className="text-base sm:text-lg font-semibold text-gray-900">
                    Advanced Options (Optional)
                  </span>
                </div>
                <span className="text-sm text-gray-500 hidden sm:inline">
                  {showAdvanced ? 'Hide' : 'Refine by job type & shift'}
                </span>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 sm:p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Job Type Dropdown */}
                    <div>
                      <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-2">
                        Job Type
                      </label>
                      <select
                        id="jobType"
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="any">Any Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Per Diem">Per Diem</option>
                        <option value="Contract">Contract</option>
                        <option value="Travel">Travel</option>
                      </select>
                    </div>

                    {/* Shift Type Dropdown */}
                    <div>
                      <label htmlFor="shiftType" className="block text-sm font-medium text-gray-700 mb-2">
                        Shift
                      </label>
                      <select
                        id="shiftType"
                        value={shiftType}
                        onChange={(e) => setShiftType(e.target.value)}
                        className="w-full px-3 py-2 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                      >
                        <option value="any">Any Shift</option>
                        <option value="days">Days</option>
                        <option value="nights">Nights</option>
                        <option value="evenings">Evenings</option>
                        <option value="variable">Variable</option>
                        <option value="rotating">Rotating</option>
                      </select>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-3">
                    💡 These filters help narrow results. If limited data is available, we'll automatically broaden the search.
                  </p>
                </div>
              )}
            </div>

            {/* Calculate Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 sm:py-5 px-6 rounded-xl text-lg sm:text-xl transition-colors shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Calculating...
                </span>
              ) : (
                'Calculate My Salary →'
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              ⚡ Instant results • No signup required
            </p>
          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 sm:p-6 mb-8">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Unable to Calculate</h3>
                  <p className="text-red-700">{error}</p>
                  <p className="text-sm text-red-600 mt-2">Try a different location or specialty, or browse our <Link href="/jobs/nursing" className="underline font-semibold">available jobs</Link>.</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Section (shows real data after calculation) */}
          {showResults && salaryData && (
            <div id="results" className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Your Estimated Salary
                </h2>
                <p className="text-gray-600 mb-2">
                  {specialty} RN • {location} • {experience} {experience === 1 ? 'year' : 'years'} experience
                </p>
                
                {/* Show which filters were applied */}
                {salaryData.metadata.requestedFilters && (salaryData.metadata.requestedFilters.jobType || salaryData.metadata.requestedFilters.shiftType) && (
                  <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 mb-4">
                    <p className="text-sm text-blue-700">
                      {salaryData.metadata.filtersApplied.jobType && salaryData.metadata.requestedFilters.jobType && 
                        <span>✓ {salaryData.metadata.requestedFilters.jobType} </span>
                      }
                      {salaryData.metadata.filtersApplied.shiftType && salaryData.metadata.requestedFilters.shiftType && 
                        <span>✓ {salaryData.metadata.requestedFilters.shiftType} shift </span>
                      }
                      {(!salaryData.metadata.filtersApplied.jobType && salaryData.metadata.requestedFilters.jobType) ||
                       (!salaryData.metadata.filtersApplied.shiftType && salaryData.metadata.requestedFilters.shiftType) ? (
                        <span className="text-xs">(broadened for more data)</span>
                      ) : null}
                    </p>
                  </div>
                )}
                
                {/* Main Salary Display */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6 sm:p-8 mb-6">
                  <div className="text-4xl sm:text-5xl font-bold text-blue-600 mb-2">
                    {formatCurrency(salaryData.salary.annual.min)} - {formatCurrency(salaryData.salary.annual.max)}
                  </div>
                  <div className="text-lg sm:text-xl text-gray-700">
                    per year (${salaryData.salary.hourly.min} - ${salaryData.salary.hourly.max}/hour)
                  </div>
                  {salaryData.metadata.fallbackToState && (
                    <p className="text-sm text-blue-600 mt-2">
                      ℹ️ Showing state average (limited city data available)
                    </p>
                  )}
                </div>

                {/* Comparison Stats */}
                {(salaryData.comparisons.state || salaryData.comparisons.national) && (
                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">📊 Market Averages</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {salaryData.comparisons.state && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">State Average</div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(salaryData.comparisons.state.annual)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            ${salaryData.comparisons.state.hourly}/hour
                          </div>
                        </div>
                      )}
                      {salaryData.comparisons.national && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm text-gray-600 mb-1">National Average</div>
                          <div className="text-xl font-bold text-gray-900">
                            {formatCurrency(salaryData.comparisons.national.annual)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            ${salaryData.comparisons.national.hourly}/hour
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Based on {salaryData.metadata.jobCount} active {specialty} RN job{salaryData.metadata.jobCount === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
                
                {/* Email Capture for Matching Jobs */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <p className="text-gray-900 text-lg font-semibold mb-2">
                    💼 See {specialty} RN Jobs Matching Your Estimate
                  </p>
                  <p className="text-gray-600 mb-6">
                    Get actual {specialty} positions in {location} sorted by salary. We'll email you:
                  </p>
                  
                  <ul className="text-left max-w-md mx-auto mb-6 space-y-2 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Active {specialty} RN jobs in your area</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Sorted by highest paying first</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Direct links to apply immediately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>Alerts when new matching jobs are posted</span>
                    </li>
                  </ul>

                  {subscribeSuccess ? (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 max-w-lg mx-auto">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="font-semibold text-green-900 mb-1">✅ You're all set!</h4>
                          <p className="text-green-700 text-sm">
                            We'll email you matching {specialty} RN jobs in {location} shortly. Check your inbox!
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                        <input
                          type="email"
                          value={emailForAlert}
                          onChange={(e) => setEmailForAlert(e.target.value)}
                          placeholder="Enter your email"
                          className="flex-1 px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={subscribing}
                        />
                        <button 
                          onClick={handleSubscribe}
                          disabled={subscribing}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors whitespace-nowrap shadow-md hover:shadow-lg"
                        >
                          {subscribing ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Subscribing...
                            </span>
                          ) : (
                            'Email Me Jobs →'
                          )}
                        </button>
                      </div>

                      {subscribeError && (
                        <p className="text-sm text-red-600 mt-2 text-center">{subscribeError}</p>
                      )}

                      <p className="text-xs text-gray-500 mt-3">
                        We'll send you real job opportunities. No spam, unsubscribe anytime.
                      </p>
                    </>
                  )}
                </div>

                {/* Calculate Another */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setSalaryData(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base"
                  >
                    ← Calculate Another Salary
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* How It Works */}
          {!showResults && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                How Our Calculator Works
              </h2>
              <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real Market Data</h3>
                  <p className="text-sm text-gray-600">Based on actual RN job postings across the U.S.</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Personalized Estimate</h3>
                  <p className="text-sm text-gray-600">Adjusted for your specialty, location, and experience</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">💼</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Matching Jobs</h3>
                  <p className="text-sm text-gray-600">See actual job openings with your estimated salary</p>
                </div>
              </div>
            </div>
          )}

          {/* CTA to Jobs */}
          <div className="text-center bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 sm:p-8 border border-purple-100">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Ready to Find Your Next RN Job?
            </h3>
            <p className="text-gray-600 mb-4 sm:mb-6 max-w-2xl mx-auto">
              Browse thousands of nursing jobs across all specialties and locations
            </p>
            <Link
              href="/jobs/nursing"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 rounded-xl text-base sm:text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Browse RN Jobs →
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </>
  );
}

