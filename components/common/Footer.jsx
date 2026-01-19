import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Brand Section - Spans top */}
        <div className="footer-brand-full">
          <Link href="/" className="footer-logo">
            <div className="logo-container">
              <span className="footer-logo-text">IntelliResume Health</span>
            </div>
          </Link>
          <p className="footer-tagline">
            Your RN Career Starts Here
          </p>
        </div>

        {/* Navigation Columns */}
        <div className="footer-nav-columns">
          {/* Column 1: RN Jobs by State */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">
              RN Jobs by State
              <span className="footer-hiring-badge">(Hiring!)</span>
            </h3>
            <ul className="footer-nav-links">
              <li><Link href="/jobs/nursing/oh">Ohio</Link></li>
              <li><Link href="/jobs/nursing/ny">New York</Link></li>
              <li><Link href="/jobs/nursing/fl">Florida</Link></li>
              <li><Link href="/jobs/nursing/md">Maryland</Link></li>
              <li><Link href="/jobs/nursing/ct">Connecticut</Link></li>
              <li><Link href="/jobs/nursing" className="footer-more-link">More +</Link></li>
            </ul>
          </div>

          {/* Column 2: RN Jobs by Specialty */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">
              RN Jobs by Specialty
              <span className="footer-hiring-badge">(Hiring!)</span>
            </h3>
            <ul className="footer-nav-links">
              <li><Link href="/jobs/nursing/specialty/icu">ICU / Critical Care</Link></li>
              <li><Link href="/jobs/nursing/specialty/er">Emergency Room</Link></li>
              <li><Link href="/jobs/nursing/specialty/med-surg">Med-Surg</Link></li>
              <li><Link href="/jobs/nursing/specialty/telemetry">Telemetry</Link></li>
              <li><Link href="/jobs/nursing/specialty/or">OR / Surgical</Link></li>
              <li><Link href="/jobs/nursing" className="footer-more-link">More +</Link></li>
            </ul>
          </div>

          {/* Column 3: Resume Builder */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">Build Your Resume</h3>
            <ul className="footer-nav-links">
              <li><Link href="/builder/new">Build New Resume</Link></li>
              <li><Link href="/builder/import">Improve Existing Resume</Link></li>
              <li><Link href="/builder/target">Tailor to Job Description</Link></li>
              <li><Link href="/blog">Blog</Link></li>
            </ul>
          </div>

          {/* Column 4: Resources & Support */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">Resources & Support</h3>
            <ul className="footer-nav-links">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/nursing-scholarship">Nursing Scholarship</Link></li>
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/sitemap.xml" target="_blank" rel="noopener noreferrer">Sitemap</Link></li>
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="footer-social-section">
          <div className="footer-social-links">
            <a href="#" aria-label="LinkedIn" className="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="#" aria-label="X (Twitter)" className="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.258 10.152L23.176 0h-2.113L13.584 8.322L7.176 0H0l9.706 14.41L0 24h2.113l7.91-8.755L16.824 24H24l-9.742-13.848zm-2.173 3.572L10.93 12.12l-6.01-8.952h2.583l4.842 7.24l1.156 1.605l6.323 9.38h-2.583l-5.156-7.669z"/>
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="footer-social-link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p className="footer-copyright">
          © {currentYear} IntelliResume Health. All rights reserved.
        </p>
      </div>
      
      <style jsx>{`
        .footer-container {
          background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
          padding: 3rem 1.5rem 1.5rem;
          border-top: 1px solid rgba(226, 232, 240, 0.8);
          font-family: 'Inter', sans-serif;
        }
        
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .footer-brand-full {
          text-align: center;
          margin-bottom: 3rem;
        }
        
        .footer-logo {
          text-decoration: none;
          display: inline-block;
          margin-bottom: 0.75rem;
        }
        
        .logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .footer-logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #14b8a6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .footer-tagline {
          color: #64748b;
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }
        
        .footer-nav-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2.5rem;
          margin-bottom: 2.5rem;
        }
        
        .footer-nav-column {
          display: flex;
          flex-direction: column;
        }
        
        .footer-column-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 1rem 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        
        .footer-hiring-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: #059669;
          font-style: italic;
          transform: rotate(-2deg);
          text-transform: none;
          letter-spacing: 0.3px;
          display: inline-block;
          position: relative;
          top: -1px;
        }
        
        .footer-nav-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .footer-nav-links li {
          margin: 0;
        }
        
        .footer-nav-links a {
          color: #64748b;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.2s ease;
          display: inline-block;
        }
        
        .footer-nav-links a:hover {
          color: #1a73e8;
        }
        
        .footer-nav-links :global(.footer-more-link) {
          color: #1a73e8;
          font-weight: 600;
        }
        
        .footer-nav-links :global(.footer-more-link):hover {
          color: #1557b0;
        }
        
        .footer-social-section {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }
        
        .footer-social-links {
          display: flex;
          gap: 1rem;
        }
        
        .footer-social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #f1f5f9;
          color: #64748b;
          transition: all 0.2s ease;
        }
        
        .footer-social-link:hover {
          background-color: #1a73e8;
          color: white;
          transform: translateY(-2px);
        }
        
        .footer-bottom {
          max-width: 1200px;
          margin: 2rem auto 0;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(226, 232, 240, 0.5);
          text-align: center;
        }
        
        .footer-copyright {
          color: #94a3b8;
          font-size: 0.875rem;
        }
        
        @media (max-width: 1024px) {
          .footer-nav-columns {
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
          }
        }
        
        @media (max-width: 640px) {
          .footer-nav-columns {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          
          .footer-brand-full {
            margin-bottom: 2rem;
          }
          
          .footer-tagline {
            max-width: 280px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .footer-column-title {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer; 