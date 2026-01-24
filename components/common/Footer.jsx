import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container">
      <div className="footer-content">
        {/* Brand Section - Spans top */}
        <div className="footer-brand-full">
          <Link href="/" className="footer-logo">
            <img
              src="/images/intelliresume-health-logo.webp"
              alt="IntelliResume Health"
              className="footer-logo-image"
            />
          </Link>
          <p className="footer-tagline">Your RN Career Thrives Here</p>
        </div>

        {/* Navigation Columns - 3 columns */}
        <div className="footer-nav-columns">
          {/* Column 1: Career Tools */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">Career Tools</h3>
            <ul className="footer-nav-links">
              <li>
                <Link href="/builder/new">Build New Resume</Link>
              </li>
              <li>
                <Link href="/builder/import">Improve Existing Resume</Link>
              </li>
              <li>
                <Link href="/builder/target">Tailor to Job Description</Link>
              </li>
              <li>
                <Link href="/jobs/nursing#job-alert-form">Set Up Job Alerts</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Nursing Pay Data */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">Nursing Pay Data</h3>
            <ul className="footer-nav-links">
              <li>
                <Link href="/jobs/nursing/rn-salary-calculator">Salary Calculator</Link>
              </li>
              <li>
                <Link href="#">RN Salary by State</Link>
              </li>
              <li>
                <Link href="/jobs/nursing/sign-on-bonus">Sign-On Bonus RN Jobs</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: About & Support */}
          <div className="footer-nav-column">
            <h3 className="footer-column-title">About & Support</h3>
            <ul className="footer-nav-links">
              <li>
                <Link href="/about">About Us</Link>
              </li>
              <li>
                <Link href="/nursing-scholarship">Nursing Scholarship</Link>
              </li>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Links */}
        <div className="footer-social-section">
          <div className="footer-social-links">
            <a href="#" aria-label="LinkedIn" className="footer-social-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a href="#" aria-label="X (Twitter)" className="footer-social-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14.258 10.152L23.176 0h-2.113L13.584 8.322L7.176 0H0l9.706 14.41L0 24h2.113l7.91-8.755L16.824 24H24l-9.742-13.848zm-2.173 3.572L10.93 12.12l-6.01-8.952h2.583l4.842 7.24l1.156 1.605l6.323 9.38h-2.583l-5.156-7.669z" />
              </svg>
            </a>
            <a href="#" aria-label="Facebook" className="footer-social-link">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
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
          font-family: var(--font-figtree), 'Inter', sans-serif;
        }

        .footer-content {
          max-width: 900px;
          margin: 0 auto;
        }

        .footer-brand-full {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .footer-logo {
          text-decoration: none;
          display: block;
          text-align: center;
        }

        .footer-logo-image {
          height: 200px;
          width: auto;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }

        .footer-tagline {
          color: #64748b;
          font-size: 0.95rem;
          margin: -5.5rem 0 0 0;
          text-align: center;
          padding-left: 0.8rem;
        }

        .footer-nav-columns {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
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
          color: #0d9488;
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
          background-color: #0d9488;
          color: white;
          transform: translateY(-2px);
        }

        .footer-bottom {
          max-width: 900px;
          margin: 2rem auto 0;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(226, 232, 240, 0.5);
          text-align: center;
        }

        .footer-copyright {
          color: #94a3b8;
          font-size: 0.875rem;
          margin: 0;
        }

        @media (max-width: 768px) {
          .footer-nav-columns {
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
          }

          .footer-logo-image {
            height: 170px;
          }

          .footer-tagline {
            margin-top: -4.7rem;
            padding-left: 2.3rem;
          }
        }

        @media (max-width: 480px) {
          .footer-nav-columns {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .footer-brand-full {
            margin-bottom: 2rem;
          }

          .footer-logo-image {
            height: 170px;
          }

          .footer-tagline {
            margin-top: -4.7rem;
            padding-left: 2.3rem;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;
