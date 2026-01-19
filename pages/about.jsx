import Link from 'next/link';
import Meta from '../components/common/Meta';

export default function AboutPage() {
  return (
    <>
      <Meta
        title="About IntelliResume Health | Our Story"
        description="Learn how IntelliResume Health evolved from a resume builder into a dedicated nursing job board, built by someone surrounded by nurses who understand the struggle."
        keywords="about IntelliResume Health, nursing job board, RN jobs, nurse career"
      />

      <style jsx>{`
        .about-page {
          font-family: var(--font-figtree), 'Inter', sans-serif;
          color: #333;
          line-height: 1.7;
        }

        .hero {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          padding: 80px 20px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 2.8rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        .hero p {
          font-size: 1.25rem;
          color: #4b5563;
          max-width: 600px;
          margin: 0 auto;
        }

        .section {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
        }

        .section h2 {
          font-size: 1.75rem;
          margin-bottom: 24px;
          color: #1f2937;
          position: relative;
          display: inline-block;
        }

        .section h2:after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 50px;
          height: 3px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border-radius: 2px;
        }

        .section p {
          font-size: 1.1rem;
          color: #4b5563;
          margin-bottom: 20px;
        }

        .section ul {
          margin: 20px 0;
          padding-left: 0;
          list-style: none;
        }

        .section li {
          font-size: 1.05rem;
          color: #4b5563;
          margin-bottom: 12px;
          padding-left: 28px;
          position: relative;
        }

        .section li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: 600;
        }

        .highlight-box {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
          border-left: 4px solid #10b981;
          padding: 24px;
          border-radius: 8px;
          margin: 30px 0;
        }

        .highlight-box p {
          font-size: 1.1rem;
          color: #1f2937;
          margin: 0;
          font-weight: 500;
        }

        .quote-section {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          padding: 60px 20px;
          text-align: center;
        }

        .quote-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .quote {
          font-size: 1.5rem;
          font-style: italic;
          color: #1f2937;
          position: relative;
          padding: 0 40px;
          line-height: 1.6;
        }

        .quote:before, .quote:after {
          content: '"';
          font-size: 4rem;
          color: rgba(16, 185, 129, 0.3);
          position: absolute;
          line-height: 0;
        }

        .quote:before {
          left: 0;
          top: 30px;
        }

        .quote:after {
          right: 0;
          bottom: 0;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
          margin-top: 30px;
        }

        .feature-card {
          background: white;
          border-radius: 12px;
          padding: 28px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .feature-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: #059669;
        }

        .feature-title {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 10px;
          color: #1f2937;
        }

        .feature-text {
          color: #6b7280;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .cta-section {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          padding: 70px 20px;
          text-align: center;
          color: white;
        }

        .cta-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .cta-title {
          font-size: 2.2rem;
          margin-bottom: 16px;
          font-weight: 700;
          color: white;
        }

        .cta-text {
          font-size: 1.15rem;
          margin-bottom: 32px;
          opacity: 0.95;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        :global(.cta-button) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white !important;
          color: #059669 !important;
          padding: 18px 36px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1.15rem;
          text-decoration: none !important;
          transition: all 0.2s ease;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
          border: 3px solid white;
        }

        :global(.cta-button:hover) {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          background: #f0fdf4 !important;
        }

        :global(.cta-button-secondary) {
          background: rgba(255, 255, 255, 0.15) !important;
          color: white !important;
          border: 3px solid white;
        }

        :global(.cta-button-secondary:hover) {
          background: rgba(255, 255, 255, 0.25) !important;
          border-color: white;
        }

        .founder-section {
          max-width: 800px;
          margin: 0 auto;
          padding: 60px 20px;
          display: flex;
          gap: 40px;
          align-items: center;
        }

        .founder-image {
          flex: 0 0 180px;
        }

        .founder-image-wrapper {
          width: 180px;
          height: 180px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          border: 4px solid #dcfce7;
        }

        .founder-image-wrapper img {
          width: 100%;
          height: auto;
          min-height: 100%;
          object-fit: cover;
          margin-top: -1%;
          transform: scale(1.5);
          transform-origin: center top;
        }

        .founder-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
        }

        .founder-bio h3 {
          font-size: 1.5rem;
          margin-bottom: 12px;
          color: #1f2937;
        }

        .founder-bio p {
          color: #4b5563;
          margin-bottom: 12px;
          line-height: 1.7;
        }

        .cheeky {
          font-style: italic;
          color: #6b7280;
        }

        :global(.resume-link) {
          color: #059669 !important;
          text-decoration: underline !important;
          text-underline-offset: 3px;
          font-weight: 500;
        }

        :global(.resume-link:hover) {
          color: #047857 !important;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 2.2rem;
          }

          .hero p {
            font-size: 1.1rem;
          }

          .section h2 {
            font-size: 1.5rem;
          }

          .quote {
            font-size: 1.25rem;
            padding: 0 30px;
          }

          .founder-section {
            flex-direction: column;
            text-align: center;
          }

          .cta-title {
            font-size: 1.8rem;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }

          .cta-button {
            width: 100%;
            max-width: 280px;
          }
        }
      `}</style>

      <div className="about-page">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Our Story</h1>
            <p>A resume builder that evolved into the nursing job board we wished existed.</p>
          </div>
        </section>

        {/* Resume Builder Origin - Brief */}
        <section className="section">
          <h2>Where It Started</h2>
          <p>
            IntelliResume began as a simple tool to solve a common problem: creating ATS-friendly resumes tailored to the job, to increase your chances of landing an interview.
            It worked well. People used it. But then the focus expanded.
          </p>
          <p>
            <Link href="/resume-builder" className="resume-link">The resume builder is still here</Link> if you need it - quick, simple, and effective.
          </p>
        </section>

        {/* Why Nursing */}
        <section className="section">
          <h2>Why Nursing?</h2>
          <p>
            My wife is a Registered Nurse. So are several family members and close friends. I&apos;m surrounded by nurses.
          </p>
          <p>
            I&apos;ve seen the burnout firsthand. The long shifts, the emotional toll, and then coming home to scroll through job boards trying to find something better - a different specialty, a hospital with better culture, a schedule that actually works.
          </p>
          <p>
            The problem? Sites like Indeed dump thousands of listings on you. Non-nursing jobs mixed in. Outdated postings. No way to filter by the things that actually matter to nurses - specific hospitals, specialties, or job types.
          </p>

          <div className="highlight-box">
            <p>There was no job board built specifically for nurses, pulling directly from hospital career pages, with the granular filtering nurses actually need.</p>
          </div>

          <p>So we built one.</p>
        </section>

        {/* Quote Section */}
        <section className="quote-section">
          <div className="quote-content">
            <p className="quote">Nurses spend their days caring for everyone else. The least they deserve is a job search that doesn&apos;t add to the burnout.</p>
          </div>
        </section>

        {/* The Solution */}
        <section className="section">
          <h2>IntelliResume Health</h2>
          <p>
            The Number One job board built specifically for Registered Nurses! No fluff, no irrelevant listings, no wading through pages of junk.
          </p>
          <ul>
            <li>Jobs aggregated directly from hospital career pages</li>
            <li>Filter by specialty - ICU, ER, Med-Surg, Telemetry, OR, and more</li>
            <li>Browse by state, city, or specific employer</li>
            <li>Granular job alerts - get notified when your preferred hospital posts in your specialty</li>
            <li>New positions added daily</li>
          </ul>
        </section>

        {/* Features Grid */}
        <section className="section">
          <h2>What Makes Us Different</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="feature-title">Direct From Employers</h3>
              <p className="feature-text">Jobs pulled straight from hospital career pages. No middlemen, no spam, no outdated listings.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
              </div>
              <h3 className="feature-title">Granular Filters</h3>
              <p className="feature-text">Filter by specialty, location, employer, job type. Find exactly what you&apos;re looking for without the noise.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
              </div>
              <h3 className="feature-title">Smart Job Alerts</h3>
              <p className="feature-text">Set alerts by hospital, specialty, or location. New positions come to you - no more endless scrolling.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
              </div>
              <h3 className="feature-title">100% Free for Nurses</h3>
              <p className="feature-text">No subscriptions, no hidden fees. We also offer a <Link href="/scholarship" className="resume-link">scholarship for nursing students</Link> preparing to enter the workforce.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Find Your Next Position?</h2>
            <p className="cta-text">Browse thousands of RN jobs from top healthcare employers across the country.</p>
            <div className="cta-buttons">
              <Link href="/jobs/nursing" className="cta-button">
                Browse Nursing Jobs
              </Link>
              <Link href="/resume-builder" className="cta-button cta-button-secondary">
                Build Your Resume
              </Link>
            </div>
          </div>
        </section>

        {/* Founder Section */}
        <section className="founder-section">
          <div className="founder-image">
            <div className="founder-image-wrapper">
              <img
                src="/images/about/nick.jpg"
                alt="Nick Githinji"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="founder-placeholder" style={{ display: 'none' }}>👨‍💻</div>
            </div>
          </div>
          <div className="founder-bio">
            <h3>Nick Githinji</h3>
            <p>
              Full-time Contracts Manager by day, part-time tool builder by night. Married to an RN, surrounded by nurses, and building tools that make their lives a little easier.
            </p>
            <p className="cheeky">
              🤫 I still get credit for finding the good job postings for the missus. The secret? This site does all the work 😉
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
