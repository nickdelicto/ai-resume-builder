import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

/**
 * JobSearchHero - Main hero section for the jobs-first homepage
 * 
 * DESIGN v3.0:
 * - Two-column layout: Content left, circular nurse image right (desktop)
 * - Mobile-first: Image on top, content below
 * - Circular nurse portrait with decorative rings
 * - Floating specialty badges with job counts
 * - Smooth wave transition to next section
 */
const JobSearchHero = ({ initialStats = null }) => {
  const router = useRouter();

  // State for browse stats data - use SSR data if available
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);

  // State for search filters
  const [selectedState, setSelectedState] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');

  // State for typewriter animation
  const [animatedWord, setAnimatedWord] = useState('Starts');
  const [showCursor, setShowCursor] = useState(false);

  // State for smile crossfade animation
  const [showSmile, setShowSmile] = useState(false);

  // Typewriter animation effect: "Starts" → delete → "Thrives"
  useEffect(() => {
    const startWord = 'Starts';
    const endWord = 'Thrives';
    const deleteSpeed = 150;  // ms per character delete
    const typeSpeed = 150;   // ms per character type
    const initialDelay = 1500; // wait before starting animation
    const finalCursorDelay = 1500; // how long cursor stays after typing

    let timeoutId;

    // Start animation after initial delay
    timeoutId = setTimeout(() => {
      setShowCursor(true);
      let currentWord = startWord;
      let charIndex = startWord.length;

      // Delete phase
      const deleteChar = () => {
        if (charIndex > 0) {
          charIndex--;
          currentWord = startWord.slice(0, charIndex);
          setAnimatedWord(currentWord || '\u200B'); // zero-width space to maintain height
          timeoutId = setTimeout(deleteChar, deleteSpeed);
        } else {
          // Start typing phase
          charIndex = 0;
          timeoutId = setTimeout(typeChar, 150); // brief pause before typing
        }
      };

      // Type phase
      const typeChar = () => {
        if (charIndex < endWord.length) {
          charIndex++;
          currentWord = endWord.slice(0, charIndex);
          setAnimatedWord(currentWord);
          timeoutId = setTimeout(typeChar, typeSpeed);
        } else {
          // Animation complete - hide cursor after a moment
          timeoutId = setTimeout(() => {
            setShowCursor(false);
          }, finalCursorDelay);
        }
      };

      deleteChar();
    }, initialDelay);

    return () => clearTimeout(timeoutId);
  }, []);

  // Smile crossfade animation - synced with typewriter finishing "Thrives"
  // Timing: 1500ms delay + 900ms delete + 150ms pause + 1050ms type = 3600ms
  useEffect(() => {
    const smileTimeout = setTimeout(() => {
      setShowSmile(true);
    }, 4100);

    return () => clearTimeout(smileTimeout);
  }, []);

  // Only fetch client-side if SSR stats not provided (fallback)
  useEffect(() => {
    if (initialStats) return; // Skip fetch if we have SSR data

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/jobs/browse-stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching browse stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [initialStats]);

  // Calculate total jobs from states
  const totalJobs = stats?.states?.reduce((sum, s) => sum + s.count, 0) || 0;
  
  // Get top 3 employers for subheadline
  const topEmployers = stats?.employers?.slice(0, 3) || [];
  
  // Get specialty job counts for floating badges (dynamic data)
  const getSpecialtyCount = (slug) => {
    const spec = stats?.specialties?.find(s => s.slug?.toLowerCase() === slug.toLowerCase());
    return spec?.count || 0;
  };
  
  // Handle search button click
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedState) params.set('state', selectedState);
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    if (selectedJobType) params.set('jobType', selectedJobType);

    const queryString = params.toString();
    // Navigate to filters section for immediate refinement
    router.push(`/jobs/nursing${queryString ? `?${queryString}` : ''}#filters`);
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  return (
    <section className="hero-section">
      {/* Background decorative blobs */}
      <div className="bg-blob blob-1" aria-hidden="true"></div>
      <div className="bg-blob blob-2" aria-hidden="true"></div>
      <div className="bg-blob blob-3" aria-hidden="true"></div>
      
      {/* Dot pattern overlay */}
      <div className="dot-pattern" aria-hidden="true"></div>
      
      <div className="hero-container">
        <div className="hero-grid">
          
          {/* HEADLINE AREA: Shows first on mobile (order-1), part of left column on desktop */}
          <div className="headline-area">
            {/* Main Headline */}
            <h1 className="hero-headline">
              Your RN Career <span className="highlight">{animatedWord}<span className={`typing-cursor ${showCursor ? 'visible' : ''}`}>|</span> Here!</span>
            </h1>
            
            {/* Subheadline with job count */}
            <p className="hero-subheadline">
              {loading ? (
                <span className="loading-text">Finding opportunities...</span>
              ) : (
                <>
                  <span className="job-count">{formatNumber(totalJobs)}+</span>
                  {' '}nursing jobs from{' '}
                  {topEmployers.length > 0 ? (
                    <>
                      <span className="employer-name">{topEmployers[0]?.name}</span>
                      {topEmployers[1] && <>, <span className="employer-name">{topEmployers[1]?.name}</span></>}
                      {topEmployers[2] && <>, <span className="employer-name">{topEmployers[2]?.name}</span></>}
                      , and more. Find your next nursing opportunity today!
                    </>
                  ) : (
                    'top healthcare systems nationwide.'
                  )}
                </>
              )}
            </p>
          </div>

          {/* SEARCH AREA: Shows third on mobile (order-3), part of left column on desktop */}
          <div className="search-area">
            {/* Search Filters Card */}
            <div className="search-container">
              <div className="search-filters">
                {/* State/Location Dropdown */}
                <div className="filter-group">
                  <label htmlFor="state-select">Location</label>
                  <select 
                    id="state-select"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All States</option>
                    {stats?.states
                      ?.sort((a, b) => b.count - a.count)
                      ?.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.fullName} ({formatNumber(state.count)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Specialty Dropdown */}
                <div className="filter-group">
                  <label htmlFor="specialty-select">Specialty</label>
                  <select
                    id="specialty-select"
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Specialties</option>
                    {stats?.specialties
                      ?.sort((a, b) => b.count - a.count)
                      ?.slice(0, 20)
                      ?.map((spec) => (
                        <option key={spec.slug} value={spec.slug}>
                          {spec.name} ({formatNumber(spec.count)})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Job Type Dropdown */}
                <div className="filter-group">
                  <label htmlFor="jobtype-select">Job Type</label>
                  <select
                    id="jobtype-select"
                    value={selectedJobType}
                    onChange={(e) => setSelectedJobType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Types</option>
                    {stats?.jobTypes?.map((type) => (
                      <option key={type.slug} value={type.slug}>
                        {type.name} ({formatNumber(type.count)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Button - inline styles for guaranteed rendering */}
                <button
                  className="search-button"
                  onClick={handleSearch}
                  aria-label="Search for nursing jobs"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '14px 28px',
                    marginTop: '4px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Search Jobs</span>
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.25)', color: 'white', padding: '10px 14px', borderRadius: '50px', fontSize: '14px', fontWeight: '500', fontFamily: "var(--font-figtree), 'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                </svg>
                Updated Weekly
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.25)', color: 'white', padding: '10px 14px', borderRadius: '50px', fontSize: '14px', fontWeight: '500', fontFamily: "var(--font-figtree), 'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Direct from Employers
              </span>

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.25)', color: 'white', padding: '10px 14px', borderRadius: '50px', fontSize: '14px', fontWeight: '500', fontFamily: "var(--font-figtree), 'Inter', sans-serif", whiteSpace: 'nowrap' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                100% Free
              </span>
            </div>
          </div>
          
          {/* RIGHT COLUMN: Circular Nurse Image (order-2 on mobile, order-2 on desktop) */}
          <div className="image-column">
            <div className="image-wrapper">
              {/* Decorative rings behind image */}
              <div className="ring ring-outer" aria-hidden="true"></div>
              <div className="ring ring-middle" aria-hidden="true"></div>
              <div className="ring ring-inner pulse-ring" aria-hidden="true"></div>
              
              {/* Main circular image with smile crossfade */}
              <div className="nurse-image-container">
                {/* Base image (neutral expression) */}
                <Image
                  src="/images/nurse-hero-transparent.webp"
                  alt="Registered nurse professional"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                  priority
                  sizes="(max-width: 640px) 240px, (max-width: 1024px) 280px, 360px"
                />
                {/* Smiling image - fades in on top */}
                <Image
                  src="/images/nurse-hero-smiling.webp"
                  alt=""
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                  priority
                  sizes="(max-width: 640px) 240px, (max-width: 1024px) 280px, 360px"
                  className={`smile-overlay ${showSmile ? 'visible' : ''}`}
                />
                {/* Gradient overlay for depth */}
                <div className="image-overlay" aria-hidden="true"></div>
              </div>
              
              {/* Floating specialty badges */}
              <div className="floating-badge badge-icu float-1">
                <span className="badge-title">ICU</span>
                <span className="badge-count">{getSpecialtyCount('icu') || 89} jobs</span>
              </div>
              
              <div className="floating-badge badge-er float-2">
                <span className="badge-title">ER</span>
                <span className="badge-count">{getSpecialtyCount('er') || 68} jobs</span>
              </div>
              
              <div className="floating-badge badge-travel float-3">
                <span className="badge-title">Med-Surg</span>
                <span className="badge-count">{getSpecialtyCount('med-surg') || 118} jobs</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Wave at BOTTOM of hero - filled with mint to create curved cutout */}
      {/* Smooth single-arc sweep: teal dips down in center-right area */}
      <div className="wave-bottom" aria-hidden="true">
        <svg viewBox="0 0 1440 175" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 100L48 93.3C96 86.7 192 73.3 288 66.7C384 60 480 60 576 63.3C672 66.7 768 73.3 864 76.7C960 80 1056 80 1152 76.7C1248 73.3 1344 66.7 1392 63.3L1440 60V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0Z" fill="#f0fdfa"/>
        </svg>
      </div>

      <style jsx>{`
        /* ============================================
           HERO SECTION - Main container
           Mobile-first approach
           ============================================ */
        .hero-section {
          background: linear-gradient(155deg, #064e3b 0%, #0f766e 35%, #14b8a6 100%);
          padding: 30px 16px 60px;
          position: relative;
          overflow: visible;
          min-height: 550px;
          margin-bottom: 0;
          padding-bottom: 160px; /* Extra space for wave and rings */
        }
        
        /* Wave at bottom - creates curved transition to next section */
        .wave-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 140px;
          z-index: 2;
          line-height: 0;
        }
        
        .wave-bottom svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        
        /* ============================================
           BACKGROUND DECORATIVE ELEMENTS
           ============================================ */
        .bg-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }
        
        .blob-1 {
          top: -50px;
          right: -50px;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.05);
        }
        
        .blob-2 {
          bottom: 100px;
          left: -100px;
          width: 350px;
          height: 350px;
          background: rgba(20, 184, 166, 0.1);
        }
        
        .blob-3 {
          top: 40%;
          left: 30%;
          width: 200px;
          height: 200px;
          background: rgba(251, 191, 36, 0.05);
        }
        
        .dot-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
        }
        
        /* ============================================
           CONTAINER & GRID
           ============================================ */
        .hero-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 8px;
          position: relative;
          z-index: 1;
        }
        
        .hero-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        
        /* ============================================
           HEADLINE AREA (Mobile: order 1 - shows first)
           ============================================ */
        .headline-area {
          order: 1;
          text-align: center;
          width: 100%;
        }
        
        /* ============================================
           IMAGE COLUMN (Mobile: order 2 - shows after headline)
           ============================================ */
        .image-column {
          order: 2;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 30px; /* Extra space below rings on mobile */
        }
        
        /* ============================================
           SEARCH AREA (Mobile: order 3 - shows last)
           ============================================ */
        .search-area {
          order: 3;
          text-align: center;
          width: 100%;
        }
        
        .image-wrapper {
          position: relative;
          width: 220px;
          height: 220px;
        }
        
        /* ============================================
           DECORATIVE RINGS
           ============================================ */
        .ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        
        .ring-outer {
          inset: -40px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
        
        .ring-middle {
          inset: -24px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        
        .ring-inner {
          inset: -10px;
          border: 2px solid rgba(255, 255, 255, 0.25);
        }
        
        .pulse-ring {
          animation: pulse-ring 3s ease-in-out infinite;
        }
        
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(1.03); opacity: 0.15; }
        }
        
        /* ============================================
           NURSE IMAGE
           ============================================ */
        .nurse-image-container {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          /* Fix for older iOS Safari not clipping absolutely positioned children */
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          border: 4px solid rgba(255, 255, 255, 0.25);
          box-shadow:
            0 25px 50px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        /* Smile crossfade - GPU accelerated opacity transition */
        .nurse-image-container :global(.smile-overlay) {
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          will-change: opacity;
        }

        .nurse-image-container :global(.smile-overlay.visible) {
          opacity: 1;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(6, 78, 59, 0.3) 0%, transparent 50%);
          pointer-events: none;
        }
        
        /* ============================================
           FLOATING BADGES
           ============================================ */
        .floating-badge {
          position: absolute;
          background: white;
          border-radius: 12px;
          padding: 10px 16px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          text-align: center;
          z-index: 10;
        }
        
        .badge-title {
          display: block;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .badge-count {
          display: block;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #059669;
        }
        
        .badge-icu {
          top: 5%;
          left: -20px;
          transform: rotate(-6deg);
        }
        
        .badge-er {
          top: 45%;
          right: -25px;
          transform: rotate(6deg);
        }
        
        .badge-travel {
          bottom: -5px;
          left: 20%;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          transform: rotate(3deg);
        }
        
        .badge-travel .badge-title {
          color: white;
        }
        
        .badge-travel .badge-count {
          color: #fef3c7;
        }
        
        /* Floating animations */
        .float-1 {
          animation: float1 4s ease-in-out infinite;
        }
        
        .float-2 {
          animation: float2 5s ease-in-out infinite 0.5s;
        }
        
        .float-3 {
          animation: float3 4.5s ease-in-out infinite 1s;
        }
        
        @keyframes float1 {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-8px) rotate(-6deg); }
        }
        
        @keyframes float2 {
          0%, 100% { transform: translateY(0) rotate(6deg); }
          50% { transform: translateY(-6px) rotate(6deg); }
        }
        
        @keyframes float3 {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        
        /* ============================================
           HEADLINE
           ============================================ */
        .hero-headline {
          font-family: var(--font-figtree), 'Inter', -apple-system, sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: white;
          margin: 0 0 16px 0;
          line-height: 1.15;
          letter-spacing: -0.02em;
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
        }
        
        .hero-headline .highlight {
          background: linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Typing cursor animation */
        .typing-cursor {
          opacity: 0;
          -webkit-text-fill-color: #fcd34d;
          font-weight: 400;
          margin-left: -2px;
          transition: opacity 0.1s ease;
        }

        .typing-cursor.visible {
          opacity: 1;
          animation: blink 0.7s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* ============================================
           SUBHEADLINE
           ============================================ */
        .hero-subheadline {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }
        
        .loading-text {
          opacity: 0.7;
          font-style: italic;
        }
        
        .job-count {
          font-weight: 800;
          font-size: 1.3em;
          color: #fcd34d;
          text-shadow: 0 0 20px rgba(252, 211, 77, 0.5);
        }
        
        .employer-name {
          font-weight: 600;
          color: white;
        }
        
        /* ============================================
           SEARCH CONTAINER
           ============================================ */
        .search-container {
          background: white;
          border-radius: 16px;
          padding: 12px;
          box-shadow: 
            0 25px 60px rgba(0, 0, 0, 0.2),
            0 10px 30px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }
        
        .search-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: flex-end;
        }
        
        .filter-group {
          flex: 1 1 100%;
        }
        
        .filter-group label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
          padding-left: 12px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
        }
        
        .filter-select {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          color: #1e293b;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 40px;
        }
        
        .filter-select:hover {
          border-color: #14b8a6;
          background-color: white;
        }
        
        .filter-select:focus {
          outline: none;
          border-color: #14b8a6;
          background-color: white;
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
        }
        
        /* ============================================
           SEARCH BUTTON
           ============================================ */
        .search-button {
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          flex: 1 1 100% !important;
          margin-top: 4px !important;
          padding: 14px 24px !important;
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
          background-color: #f59e0b !important;
          color: white !important;
          border: none !important;
          border-radius: 12px !important;
          font-size: 15px !important;
          font-weight: 700 !important;
          font-family: var(--font-figtree), 'Inter', sans-serif !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          box-shadow: 0 4px 15px rgba(245, 158, 11, 0.35) !important;
        }
        
        .search-button:hover {
          background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(245, 158, 11, 0.45) !important;
        }
        
        .search-button svg {
          flex-shrink: 0;
        }
        
        /* ============================================
           TRUST BADGES
           ============================================ */
        .trust-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }

        .trust-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          padding: 8px 12px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 500;
          font-family: var(--font-figtree), 'Inter', sans-serif;
          white-space: nowrap;
        }

        .trust-pill svg {
          flex-shrink: 0;
          opacity: 0.9;
          width: 14px;
          height: 14px;
        }
        
        /* ============================================
           WAVE TRANSITION
           ============================================ */
        /* Wave moved to BrowseByState for cleaner overlap */
        
        /* ============================================
           RESPONSIVE: LARGER PHONES (481px+)
           ============================================ */
        @media (min-width: 481px) {
          .hero-section {
            padding: 40px 20px 110px;
          }
          
          .image-wrapper {
            width: 260px;
            height: 260px;
          }
          
          .badge-icu {
            left: -30px;
          }
          
          .badge-er {
            right: -35px;
          }
          
          .hero-headline {
            font-size: 2.2rem;
          }
          
          .trust-badges {
            gap: 10px;
          }

          .trust-pill {
            padding: 10px 16px;
            font-size: 13px;
            gap: 8px;
          }

          .trust-pill svg {
            width: 16px;
            height: 16px;
          }
        }
        
        /* ============================================
           RESPONSIVE: TABLETS (641px+)
           ============================================ */
        @media (min-width: 641px) {
          .hero-section {
            padding: 50px 24px 120px;
            min-height: 650px;
          }
          
          .image-wrapper {
            width: 300px;
            height: 300px;
          }
          
          .badge-icu {
            left: -40px;
            padding: 12px 18px;
          }
          
          .badge-er {
            right: -45px;
            padding: 12px 18px;
          }
          
          .badge-travel {
            padding: 12px 18px;
          }
          
          .hero-headline {
            font-size: 2.6rem;
          }
          
          .hero-subheadline {
            font-size: 1.1rem;
          }
          
          .filter-group {
            flex: 1 1 calc(50% - 5px);
          }

          .search-button {
            flex: 1 1 100%;
          }

          .trust-badges {
            gap: 12px;
          }

          .trust-pill {
            padding: 10px 18px;
          }
        }
        
        /* ============================================
           RESPONSIVE: DESKTOP (1024px+)
           Two-column layout
           ============================================ */
        @media (min-width: 1024px) {
          .hero-section {
            padding: 60px 32px 200px;
            min-height: 700px;
          }
          
          .hero-grid {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            grid-template-rows: auto auto;
            grid-template-areas:
              "headline image"
              "search image";
            gap: 16px 24px;
            align-items: center;
          }
          
          .headline-area {
            grid-area: headline;
            text-align: left;
          }
          
          .search-area {
            grid-area: search;
            text-align: left;
          }
          
          .image-column {
            grid-area: image;
            justify-content: flex-end;
            align-self: center;
            margin-bottom: 0; /* Reset mobile margin */
          }
          
          .image-wrapper {
            width: 380px;
            height: 380px;
          }
          
          .ring-outer {
            inset: -60px;
          }
          
          .ring-middle {
            inset: -40px;
          }
          
          .ring-inner {
            inset: -20px;
          }
          
          .badge-icu {
            left: -45px;
            top: 10%;
          }
          
          .badge-er {
            right: -50px;
            top: 50%;
          }
          
          .badge-travel {
            bottom: 0;
            left: 15%;
          }
          
          .hero-headline {
            font-size: 3rem;
            margin-bottom: 20px;
          }
          
          .hero-subheadline {
            font-size: 1.15rem;
            margin-bottom: 28px;
          }
          
          .search-container {
            padding: 20px 24px;
            border-radius: 20px;
          }

          .filter-group {
            flex: 1;
          }

          .search-button {
            flex: 0 0 auto;
            margin-top: 0;
            padding: 14px 32px;
          }
          
          .trust-badges {
            justify-content: flex-start !important; /* Override inline style for desktop */
            gap: 16px; /* Matches state pills desktop spacing */
          }
          
        }
        
        /* ============================================
           RESPONSIVE: LARGE DESKTOP (1280px+)
           ============================================ */
        @media (min-width: 1280px) {
          .hero-container {
            padding: 0 56px;
          }
          
          .hero-grid {
            grid-template-columns: 1.4fr 1fr;
            gap: 20px 32px;
          }
          
          .image-wrapper {
            width: 420px;
            height: 420px;
          }
          
          .ring-outer {
            inset: -70px;
          }
          
          .ring-middle {
            inset: -48px;
          }
          
          .ring-inner {
            inset: -24px;
          }
          
          .badge-icu {
            left: -55px;
          }
          
          .badge-er {
            right: -60px;
          }
          
          .hero-headline {
            font-size: 3.5rem;
          }
          
          .hero-subheadline {
            font-size: 1.25rem;
            max-width: 650px;
          }
        }
      `}</style>
      
      {/* Global styles for responsive layouts - bypasses styled-jsx scoping issues */}
      <style jsx global>{`
        /* DESKTOP (1024px+): Two-column grid layout with grid-template-areas */
        @media (min-width: 1024px) {
          .hero-section .hero-grid {
            display: grid !important;
            grid-template-columns: 1.5fr 1fr !important;
            grid-template-rows: auto auto !important;
            grid-template-areas:
              "headline image"
              "search image" !important;
            gap: 16px 24px !important;
            align-items: center !important;
          }
          
          .hero-section .headline-area {
            grid-area: headline !important;
            text-align: left !important;
          }
          
          .hero-section .search-area {
            grid-area: search !important;
            text-align: left !important;
          }
          
          .hero-section .image-column {
            grid-area: image !important;
            justify-content: flex-end !important;
            align-self: center !important;
            margin-bottom: 0 !important; /* Reset mobile margin */
          }
          
          .hero-section .image-wrapper {
            width: 380px !important;
            height: 380px !important;
          }
          
          .hero-section .ring-outer {
            inset: -60px !important;
          }
          
          .hero-section .ring-middle {
            inset: -40px !important;
          }
          
          .hero-section .ring-inner {
            inset: -20px !important;
          }
          
          .hero-section .trust-badges {
            justify-content: flex-start !important;
          }
          
          .hero-section .filter-group {
            flex: 1 !important;
          }
          
          .hero-section .search-button {
            flex: 0 0 auto !important;
            margin-top: 0 !important;
          }

          .hero-section .search-container {
            padding: 20px 24px !important;
            border-radius: 20px !important;
          }
        }
        
        /* LARGE DESKTOP (1280px+) */
        @media (min-width: 1280px) {
          .hero-section .hero-grid {
            grid-template-columns: 1.4fr 1fr !important;
            gap: 32px !important;
          }

          .hero-section .image-wrapper {
            width: 420px !important;
            height: 420px !important;
          }

          .hero-section .ring-outer {
            inset: -70px !important;
          }

          .hero-section .ring-middle {
            inset: -48px !important;
          }

          .hero-section .ring-inner {
            inset: -24px !important;
          }

          .hero-section .search-container {
            padding: 24px 28px !important;
          }
        }
      `}</style>
    </section>
  );
};

export default JobSearchHero;
