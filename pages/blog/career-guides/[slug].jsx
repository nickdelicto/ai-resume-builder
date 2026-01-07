import Head from 'next/head';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { getSpecialtyCareerData } from '../../../lib/constants/specialtyCareerData';
import { slugToSpecialty } from '../../../lib/constants/specialties';
import { getStateFullName } from '../../../lib/jobScraperUtils';

const { calculateSalaryStats } = require('../../../lib/utils/salaryStatsUtils');

const prisma = new PrismaClient();

/**
 * Career Guide Page
 *
 * "How to Become a [Specialty] Nurse" - comprehensive career guide
 * Combines static researched content with live database data
 */
export default function CareerGuidePage({
  careerData,
  liveStats,
  guideSlug,
  specialtySlug,
  relatedGuides
}) {
  if (!careerData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Career Guide Not Found</h1>
          <p className="text-gray-600 mb-6">We're still working on this career guide.</p>
          <Link href="/blog/career-guides" className="text-teal-600 hover:text-teal-700 font-medium">
            View Available Guides
          </Link>
        </div>
      </div>
    );
  }

  const { seo, quickFacts, introduction, roleOverview, steps, skills, certifications, salary, jobOutlook, careerAdvancement, faqs, meta } = careerData;

  // Get current year for dynamic title
  const currentYear = new Date().getFullYear();

  // Replace {year} placeholder in title
  const pageTitle = seo.title.replace('{year}', currentYear);

  // Format currency
  const formatSalary = (value) => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  // Format text with bold and markdown links for HTML rendering
  const formatTextHtml = (text) => {
    if (!text) return text;
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-link">$1</a>');
  };

  // Parse markdown links [text](url) to JSX (for non-HTML contexts)
  const parseMarkdownLinks = (text) => {
    if (!text) return text;
    const parts = [];
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a key={match.index} href={match[2]} target="_blank" rel="noopener noreferrer" className="inline-link">
          {match[1]}
        </a>
      );
      lastIndex = regex.lastIndex;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords.join(', ')} />
        {/* Open Graph tags */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://intelliresume.net/blog/career-guides/${guideSlug}`} />
        <meta property="og:image" content={`https://intelliresume.net/images/og/career-guides/${guideSlug}.jpg`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="IntelliResume Health" />

        {/* Twitter/X Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seo.description} />
        <meta name="twitter:image" content={`https://intelliresume.net/images/og/career-guides/${guideSlug}.jpg`} />

        <link rel="canonical" href={`https://intelliresume.net/blog/career-guides/${guideSlug}`} />

        {/* FAQ Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }} />

        {/* Article Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": pageTitle,
            "description": seo.description,
            "author": {
              "@type": "Organization",
              "name": "IntelliResume Health Editorial Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "IntelliResume Health",
              "url": "https://intelliresume.net"
            },
            "dateModified": meta.lastUpdated
          })
        }} />

        {/* HowTo Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": `How to Become a ${careerData.name} Nurse`,
            "description": seo.description,
            "totalTime": `P${quickFacts.typicalTimeToSpecialize.replace(/[^0-9]/g, '')}Y`,
            "step": steps.map((step, idx) => ({
              "@type": "HowToStep",
              "position": idx + 1,
              "name": step.title,
              "text": step.content.replace(/\*\*.*?\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').substring(0, 500)
            }))
          })
        }} />

        {/* BreadcrumbList Schema */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Resources",
                "item": "https://intelliresume.net/blog"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Career Guides",
                "item": "https://intelliresume.net/blog/career-guides"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": `${careerData.name} Nurse`,
                "item": `https://intelliresume.net/blog/career-guides/${guideSlug}`
              }
            ]
          })
        }} />
      </Head>

      <article className="career-guide">
        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href="/blog">Resources</Link>
          <span className="separator">/</span>
          <Link href="/blog/career-guides">Career Guides</Link>
          <span className="separator">/</span>
          <span className="current">{careerData.name} Nurse</span>
        </nav>

        {/* Hero Section */}
        <header className="hero">
          <div className="hero-content">
            <div className="hero-badge">Career Guide</div>
            <h1>{pageTitle}</h1>
            <p className="hero-meta">
              Last updated: {meta.lastUpdated} | Sources: {meta.sources.slice(0, 2).map(s => typeof s === 'string' ? s : s.name).join(', ')}
            </p>
          </div>
        </header>

        {/* Quick Facts Card */}
        <div className="quick-facts-card">
          <h2 className="quick-facts-title">Quick Facts</h2>
          <div className="quick-facts-grid">
            <div className="quick-fact">
              <span className="quick-fact-icon">💰</span>
              <div>
                <span className="quick-fact-label">Average Salary</span>
                <span className="quick-fact-value">
                  {liveStats.avgSalary ? formatSalary(liveStats.avgSalary) : quickFacts.avgSalary}
                </span>
                {liveStats.jobCount > 0 && (
                  <span className="quick-fact-source">Based on {liveStats.jobCount.toLocaleString()} jobs</span>
                )}
              </div>
            </div>
            <div className="quick-fact">
              <span className="quick-fact-icon">📈</span>
              <div>
                <span className="quick-fact-label">Job Growth</span>
                <span className="quick-fact-value">{quickFacts.jobGrowth}</span>
              </div>
            </div>
            <div className="quick-fact">
              <span className="quick-fact-icon">⏱️</span>
              <div>
                <span className="quick-fact-label">Time to Specialize</span>
                <span className="quick-fact-value">{quickFacts.typicalTimeToSpecialize}</span>
              </div>
            </div>
            <div className="quick-fact">
              <span className="quick-fact-icon">📋</span>
              <div>
                <span className="quick-fact-label">Certification</span>
                <span className="quick-fact-value">
                  {quickFacts.certificationRequired ? 'Required' : quickFacts.certificationRecommended ? 'Recommended' : 'Optional'}
                </span>
              </div>
            </div>
          </div>

          {/* Live Job CTA */}
          {liveStats.jobCount > 0 && (
            <div className="quick-facts-cta">
              <Link href={`/jobs/nursing/specialty/${specialtySlug}`} className="quick-facts-link">
                Browse {liveStats.jobCount.toLocaleString()} {careerData.name} Jobs →
              </Link>
            </div>
          )}
        </div>

        {/* Table of Contents */}
        <nav className="toc">
          <h2>In This Guide</h2>
          <ol>
            <li><a href="#introduction">Introduction</a></li>
            <li><a href="#what-they-do">What Does a {careerData.name} Nurse Do?</a></li>
            <li><a href="#how-to-become">How to Become a {careerData.name} Nurse</a></li>
            <li><a href="#skills">Essential Skills</a></li>
            <li><a href="#certifications">Certifications</a></li>
            <li><a href="#salary">Salary & Job Outlook</a></li>
            <li><a href="#career-paths">Career Advancement</a></li>
            <li><a href="#faqs">FAQs</a></li>
          </ol>
        </nav>

        {/* Introduction */}
        <section id="introduction" className="content-section">
          {introduction.split('\n\n').map((para, idx) => (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatTextHtml(para) }} />
          ))}
        </section>

        {/* What They Do */}
        <section id="what-they-do" className="content-section">
          <h2>{roleOverview.title}</h2>
          {roleOverview.content.split('\n\n').map((para, idx) => (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatTextHtml(para) }} />
          ))}

          <h3>Daily Responsibilities</h3>
          <ul className="responsibilities-list">
            {roleOverview.dailyResponsibilities.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatTextHtml(item) }} />
            ))}
          </ul>

          <h3>Work Environment</h3>
          {roleOverview.workEnvironment.split('\n\n').map((para, idx) => (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatTextHtml(para) }} />
          ))}
        </section>

        {/* How to Become */}
        <section id="how-to-become" className="content-section">
          <h2>How to Become a {careerData.name} Nurse: Step by Step</h2>

          <div className="steps-container">
            {steps.map((step) => (
              <div key={step.number} className="step-card">
                <div className="step-header">
                  <span className="step-number">Step {step.number}</span>
                  <h3>{step.title}</h3>
                </div>
                <div className="step-content">
                  {step.content.split('\n\n').map((para, idx) => {
                    const lines = para.split('\n').filter(line => line.trim());

                    // Check if this is a pure list block (all lines are bullets)
                    const isListBlock = lines.length > 0 && lines.every(line => /^[\-•]\s/.test(line.trim()));

                    if (isListBlock) {
                      return (
                        <ul key={idx} className="step-list">
                          {lines.map((line, i) => (
                            <li key={i} dangerouslySetInnerHTML={{
                              __html: formatTextHtml(line.replace(/^[\-•]\s*/, ''))
                            }} />
                          ))}
                        </ul>
                      );
                    }

                    // Check if this is a header + list combo (header line followed by bullets)
                    const firstLineIsHeader = lines.length > 1 && !lines[0].trim().startsWith('-') && !lines[0].trim().startsWith('•');
                    const restAreBullets = lines.slice(1).every(line => /^[\-•]\s/.test(line.trim()));

                    if (firstLineIsHeader && restAreBullets && lines.length > 1) {
                      const headerFormatted = formatTextHtml(lines[0]);
                      return (
                        <div key={idx} className="step-block">
                          <p dangerouslySetInnerHTML={{ __html: headerFormatted }} />
                          <ul className="step-list">
                            {lines.slice(1).map((line, i) => (
                              <li key={i} dangerouslySetInnerHTML={{
                                __html: formatTextHtml(line.replace(/^[\-•]\s*/, ''))
                              }} />
                            ))}
                          </ul>
                        </div>
                      );
                    }

                    // Regular paragraph - handle bold and link formatting
                    const formatted = formatTextHtml(para);
                    return <p key={idx} dangerouslySetInnerHTML={{ __html: formatted }} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section id="skills" className="content-section">
          <h2>Essential Skills for {careerData.name} Nurses</h2>

          <div className="skills-grid">
            <div className="skills-column">
              <h3>Technical Skills</h3>
              <ul className="skills-list">
                {skills.technical.map((skill, idx) => (
                  <li key={idx}>
                    <strong>{skill.name}</strong>
                    <span dangerouslySetInnerHTML={{ __html: formatTextHtml(skill.description) }} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="skills-column">
              <h3>Soft Skills</h3>
              <ul className="skills-list">
                {skills.soft.map((skill, idx) => (
                  <li key={idx}>
                    <strong>{skill.name}</strong>
                    <span dangerouslySetInnerHTML={{ __html: formatTextHtml(skill.description) }} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Certifications */}
        <section id="certifications" className="content-section">
          <h2>Certifications for {careerData.name} Nurses</h2>

          <div className="certifications-grid">
            {certifications.filter(c => c.isPrimary || c.recommended).map((cert, idx) => (
              <div key={idx} className={`cert-card ${cert.isPrimary ? 'primary' : ''}`}>
                {cert.isPrimary && <div className="cert-badge">Primary Certification</div>}
                <h3>{cert.name}</h3>
                <p className="cert-fullname">{cert.fullName}</p>
                <p className="cert-org">Offered by: {cert.organization}</p>

                <div className="cert-details">
                  <div className="cert-detail">
                    <span className="cert-detail-label">Requirements:</span>
                    <span>{cert.requirements}</span>
                  </div>
                  {cert.examDetails && (
                    <div className="cert-detail">
                      <span className="cert-detail-label">Exam:</span>
                      <span>{cert.examDetails}</span>
                    </div>
                  )}
                  {cert.renewalPeriod && (
                    <div className="cert-detail">
                      <span className="cert-detail-label">Renewal:</span>
                      <span>Every {cert.renewalPeriod}</span>
                    </div>
                  )}
                </div>

                {cert.url && (
                  <a href={cert.url} target="_blank" rel="noopener noreferrer" className="cert-link">
                    Learn More ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Salary Section - Hybrid Static + Live */}
        <section id="salary" className="content-section">
          <h2>{careerData.name} Nurse Salary & Job Outlook</h2>

          {/* Live Data Banner */}
          {liveStats.jobCount > 0 && (
            <div className="live-data-banner">
              <span className="live-indicator"></span>
              Based on {liveStats.jobCount.toLocaleString()} active {careerData.name} job postings on {' '}<Link href={`/jobs/nursing/specialty/${specialtySlug}`} className="live-data-link">IntelliResume Health</Link>
            </div>
          )}

          <p dangerouslySetInnerHTML={{ __html: formatTextHtml(salary.overview) }} />

          {/* Salary Stats */}
          <div className="salary-stats">
            <div className="salary-stat main">
              <span className="salary-label">Average Salary</span>
              <span className="salary-value">
                {liveStats.avgSalary ? formatSalary(liveStats.avgSalary) : salary.national.average}
              </span>
              <span className="salary-subtext">per year</span>
            </div>
            <div className="salary-stat">
              <span className="salary-label">Entry Level</span>
              <span className="salary-value">
                {liveStats.minSalary ? formatSalary(liveStats.minSalary) : salary.national.range.low}
              </span>
            </div>
            <div className="salary-stat">
              <span className="salary-label">Experienced</span>
              <span className="salary-value">
                {liveStats.maxSalary ? formatSalary(liveStats.maxSalary) : salary.national.range.high}
              </span>
            </div>
          </div>

          {/* Top States - Live Data */}
          {liveStats.topStates && liveStats.topStates.length > 0 && (
            <div className="live-data-section">
              <div className="live-data-section-header">
                <span className="live-data-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <h3>Top States for {careerData.name} Nurses</h3>
              </div>
              <p className="live-data-subtitle">Based on current job availability</p>
              <div className="states-grid">
                {liveStats.topStates.map((state, idx) => (
                  <Link
                    key={idx}
                    href={`/jobs/nursing/${state.state.toLowerCase()}/${specialtySlug}`}
                    className="state-card"
                  >
                    <span className="state-name">{getStateFullName(state.state) || state.state}</span>
                    <span className="state-jobs">{state.count} jobs</span>
                    {state.avgSalary && (
                      <span className="state-salary">{formatSalary(state.avgSalary)} avg</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top Employers - Live Data */}
          {liveStats.topEmployers && liveStats.topEmployers.length > 0 && (
            <div className="live-data-section">
              <div className="live-data-section-header">
                <span className="live-data-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18"/>
                    <path d="M9 8h1"/>
                    <path d="M9 12h1"/>
                    <path d="M9 16h1"/>
                    <path d="M14 8h1"/>
                    <path d="M14 12h1"/>
                    <path d="M14 16h1"/>
                    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
                  </svg>
                </span>
                <h3>Top Employers Hiring {careerData.name} Nurses</h3>
              </div>
              <div className="employers-grid">
                {liveStats.topEmployers.map((emp, idx) => (
                  <Link
                    key={idx}
                    href={`/jobs/nursing/employer/${emp.slug}/${specialtySlug}`}
                    className="employer-card"
                  >
                    <span className="employer-name">{emp.name}</span>
                    <span className="employer-jobs">{emp.count} open positions</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Job Outlook */}
          <div className="job-outlook">
            <h3>Job Outlook</h3>
            <div className="outlook-header">
              <div className="outlook-stat-box">
                <span className="outlook-number">{jobOutlook.growth}</span>
                <span className="outlook-period">Projected growth {jobOutlook.growthPeriod}</span>
              </div>
              {jobOutlook.growthDescription && (
                <span className="outlook-badge">{jobOutlook.growthDescription}</span>
              )}
            </div>
            <div className="outlook-content">
              {jobOutlook.content.split('\n\n').map((paragraph, idx) => {
                // Parse **bold:** pattern for headings
                const boldMatch = paragraph.match(/^\*\*(.+?):\*\*\s*(.*)$/);
                if (boldMatch) {
                  return (
                    <div key={idx} className="outlook-point">
                      <strong>{boldMatch[1]}:</strong> <span dangerouslySetInnerHTML={{ __html: formatTextHtml(boldMatch[2]) }} />
                    </div>
                  );
                }
                return <p key={idx} dangerouslySetInnerHTML={{ __html: formatTextHtml(paragraph) }} />;
              })}
            </div>
          </div>
        </section>

        {/* Career Advancement */}
        <section id="career-paths" className="content-section">
          <h2>Career Advancement for {careerData.name} Nurses</h2>
          <p dangerouslySetInnerHTML={{ __html: formatTextHtml(careerAdvancement.content) }} />

          <div className="career-paths-grid">
            {careerAdvancement.paths.map((path, idx) => (
              <div key={idx} className="career-path-card">
                <h3>{path.title}</h3>
                <p dangerouslySetInnerHTML={{ __html: formatTextHtml(path.description) }} />
              </div>
            ))}
          </div>
        </section>

        {/* Featured Jobs CTA */}
        {liveStats.featuredJobs && liveStats.featuredJobs.length >= 1 && (
          <section className="featured-jobs-section">
            <h2>Featured {careerData.name} Nurse Jobs</h2>
            <div className="featured-jobs-grid">
              {liveStats.featuredJobs.slice(0, 5).map((job, idx) => (
                <Link key={idx} href={`/jobs/nursing/${job.slug}`} className="featured-job-card">
                  <h3>{job.title}</h3>
                  <div className="job-meta">
                    <span className="job-employer">{job.employer}</span>
                    <span className="job-meta-divider">•</span>
                    <span className="job-location">{job.city}, {job.state}</span>
                    {job.salary && (
                      <>
                        <span className="job-meta-divider">•</span>
                        <span className="job-salary">{job.salary}</span>
                      </>
                    )}
                  </div>
                  <div className="job-tags">
                    {job.specialty && <span className="job-tag tag-specialty">{job.specialty}</span>}
                    {job.jobType && <span className="job-tag tag-type">{job.jobType}</span>}
                    {job.shiftType && <span className="job-tag tag-shift">{job.shiftType}</span>}
                  </div>
                </Link>
              ))}
            </div>
            <div className="view-all-jobs">
              <Link href={`/jobs/nursing/specialty/${specialtySlug}`} className="view-all-button">
                View All {liveStats.jobCount.toLocaleString()} {careerData.name} Jobs
              </Link>
            </div>
          </section>
        )}

        {/* FAQs */}
        <section id="faqs" className="content-section">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <details key={idx} className="faq-item">
                <summary>{faq.question}</summary>
                <p dangerouslySetInnerHTML={{ __html: formatTextHtml(faq.answer) }} />
              </details>
            ))}
          </div>
        </section>

        {/* Related Career Guides */}
        {relatedGuides && relatedGuides.length > 0 && (
          <section className="related-guides-section">
            <h2>Continue Reading</h2>
            <div className="related-guides-grid">
              {relatedGuides.map((guide) => (
                <Link key={guide.slug} href={`/blog/career-guides/${guide.slug}`} className="related-guide-card">
                  <span className="guide-tag">Career Guide</span>
                  <h3>How to Become {/^[aeiou]/i.test(guide.name) ? 'an' : 'a'} {guide.name} Nurse</h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        <style jsx>{`
          .career-guide {
            max-width: 800px;
            margin: 0 auto;
            padding: 24px 16px 80px;
            font-family: 'Figtree', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 1.125rem;
            color: #1a202c;
            line-height: 1.8;
          }

          /* Breadcrumb */
          .breadcrumb {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
            color: #64748b;
            margin-bottom: 24px;
          }
          .breadcrumb a {
            color: #0d9488;
            text-decoration: none;
          }
          .breadcrumb a:hover {
            text-decoration: underline;
          }
          .breadcrumb .separator {
            color: #cbd5e1;
          }

          /* Hero */
          .hero {
            margin-bottom: 32px;
          }
          .hero-badge {
            display: inline-block;
            background: linear-gradient(135deg, #0d9488, #14b8a6);
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 12px;
            border-radius: 16px;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .hero h1 {
            font-size: 2.25rem;
            font-weight: 800;
            line-height: 1.2;
            margin: 0 0 12px;
            color: #0f172a;
          }
          .hero-meta {
            font-size: 0.875rem;
            color: #64748b;
          }

          /* Quick Facts Card - Mobile First */
          .quick-facts-card {
            background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
            border: 2px solid #5eead4;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          }
          @media (min-width: 480px) {
            .quick-facts-card {
              padding: 20px;
              border-radius: 14px;
            }
          }
          @media (min-width: 640px) {
            .quick-facts-card {
              padding: 24px;
              border-radius: 16px;
              margin-bottom: 32px;
            }
          }
          .quick-facts-title {
            font-size: 0.8125rem;
            font-weight: 700;
            color: #0f766e;
            margin: 0 0 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          @media (min-width: 640px) {
            .quick-facts-title {
              font-size: 1rem;
              margin: 0 0 16px;
            }
          }
          .quick-facts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          @media (min-width: 480px) {
            .quick-facts-grid {
              gap: 14px;
            }
          }
          @media (min-width: 640px) {
            .quick-facts-grid {
              grid-template-columns: repeat(4, 1fr);
              gap: 16px;
            }
          }
          .quick-fact {
            display: flex;
            align-items: flex-start;
            gap: 8px;
          }
          @media (min-width: 640px) {
            .quick-fact {
              gap: 12px;
            }
          }
          .quick-fact-icon {
            font-size: 1.25rem;
            flex-shrink: 0;
          }
          @media (min-width: 640px) {
            .quick-fact-icon {
              font-size: 1.5rem;
            }
          }
          .quick-fact-label {
            display: block;
            font-size: 0.6875rem;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
          }
          @media (min-width: 640px) {
            .quick-fact-label {
              font-size: 0.75rem;
            }
          }
          .quick-fact-value {
            display: block;
            font-size: 0.9375rem;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.2;
          }
          @media (min-width: 640px) {
            .quick-fact-value {
              font-size: 1.125rem;
            }
          }
          .quick-fact-source {
            display: block;
            font-size: 0.625rem;
            color: #64748b;
            font-style: italic;
            margin-top: 2px;
          }
          @media (min-width: 640px) {
            .quick-fact-source {
              font-size: 0.7rem;
            }
          }
          .quick-facts-cta {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #99f6e4;
            text-align: center;
          }
          @media (min-width: 640px) {
            .quick-facts-cta {
              margin-top: 24px;
              padding-top: 24px;
            }
          }
          :global(.quick-facts-link) {
            display: inline;
            color: #0f766e;
            font-weight: 600;
            font-size: 0.9375rem;
            text-decoration: underline;
            text-decoration-style: dotted;
            text-underline-offset: 4px;
            transition: all 0.2s ease;
          }
          :global(.quick-facts-link:hover) {
            color: #0d9488;
          }
          .cta-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
            color: white;
            font-weight: 700;
            font-size: 0.9375rem;
            padding: 16px 28px;
            border-radius: 10px;
            text-decoration: none;
            transition: all 0.25s ease;
            box-shadow: 0 4px 16px rgba(13, 148, 136, 0.45);
            border: none;
          }
          @media (min-width: 640px) {
            .cta-button {
              font-size: 1rem;
              padding: 18px 32px;
            }
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(13, 148, 136, 0.6);
            background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
          }
          .cta-button svg {
            transition: transform 0.2s;
            width: 18px;
            height: 18px;
          }
          .cta-button:hover svg {
            transform: translateX(4px);
          }
          .cta-button.primary {
            padding: 18px 36px;
            font-size: 1.125rem;
          }

          /* Table of Contents */
          .toc {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 40px;
          }
          .toc h2 {
            font-size: 0.875rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 12px;
          }
          .toc ol {
            margin: 0;
            padding-left: 20px;
          }
          .toc li {
            margin: 8px 0;
          }
          .toc a {
            color: #0d9488;
            text-decoration: none;
            font-weight: 500;
          }
          .toc a:hover {
            text-decoration: underline;
          }

          /* Content Sections */
          .content-section {
            margin-bottom: 48px;
            scroll-margin-top: 80px;
          }
          .content-section h2 {
            font-size: 1.875rem;
            font-weight: 700;
            color: #1a73e8;
            margin: 0 0 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
            margin-top: 48px;
            cursor: pointer;
            transition: border-color 0.2s ease;
          }
          .content-section h2:first-child {
            margin-top: 0;
          }
          .content-section h2:hover {
            border-bottom-color: #1a73e8;
          }
          .content-section h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a73e8;
            margin: 32px 0 16px;
            cursor: pointer;
            border-bottom: 1px solid transparent;
            padding-bottom: 4px;
            display: inline-block;
            transition: border-color 0.2s ease;
          }
          .content-section h3:hover {
            border-bottom-color: #1a73e8;
          }
          .content-section p {
            margin: 0 0 24px;
            color: #1a202c;
          }

          /* Responsibilities List */
          .responsibilities-list {
            list-style: none;
            padding: 0;
            margin: 16px 0;
          }
          .responsibilities-list li {
            position: relative;
            padding-left: 28px;
            margin-bottom: 12px;
            color: #1a202c;
          }
          .responsibilities-list li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #0d9488;
            font-weight: 700;
          }

          /* Steps */
          .steps-container {
            display: flex;
            flex-direction: column;
            gap: 32px;
          }
          .step-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px 28px 24px;
            position: relative;
          }
          .step-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .step-number {
            display: inline-block;
            background: linear-gradient(135deg, #0d9488, #14b8a6);
            color: white;
            font-size: 0.875rem;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 6px;
            white-space: nowrap;
          }
          .step-card h3 {
            font-size: 1.25rem;
            margin: 0;
            color: #1a73e8;
            line-height: 1.3;
          }
          .step-content p {
            margin-bottom: 20px;
            line-height: 1.8;
          }
          .step-content p:last-child {
            margin-bottom: 0;
          }
          .step-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
          }
          .step-list li {
            margin: 12px 0;
            padding-left: 24px;
            position: relative;
            line-height: 1.7;
          }
          .step-list li::before {
            content: "•";
            position: absolute;
            left: 8px;
            color: #0d9488;
            font-weight: bold;
          }
          .step-block {
            margin-bottom: 24px;
          }
          .step-block:last-child {
            margin-bottom: 0;
          }
          .step-block p {
            margin-bottom: 8px;
          }
          .step-block .step-list {
            margin-top: 8px;
            margin-bottom: 0;
          }
          .step-content > *:last-child {
            margin-bottom: 0;
          }

          /* Inline Links (parsed from markdown) - must be global for dangerouslySetInnerHTML */
          :global(.inline-link) {
            color: #0891b2;
            text-decoration: none;
            border-bottom: 1px dotted #0891b2;
            transition: all 0.2s ease;
            font-weight: 500;
          }
          :global(.inline-link:hover) {
            color: #0e7490;
            border-bottom-style: solid;
            border-bottom-color: #0e7490;
          }

          /* Skills Grid */
          .skills-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            margin-top: 24px;
          }
          @media (min-width: 640px) {
            .skills-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          .skills-column {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 24px;
          }
          .skills-column h3 {
            margin: 0 0 16px;
            color: #0d9488;
            font-size: 1.125rem;
            font-weight: 700;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .skills-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .skills-list li {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 10px;
            transition: all 0.2s;
          }
          .skills-list li:last-child {
            margin-bottom: 0;
          }
          .skills-list li:hover {
            border-color: #0d9488;
            box-shadow: 0 2px 6px rgba(13, 148, 136, 0.1);
          }
          .skills-list li strong {
            display: block;
            color: #0f172a;
            margin-bottom: 4px;
            font-size: 0.9375rem;
          }
          .skills-list li span {
            font-size: 0.9375rem;
            color: #64748b;
            line-height: 1.5;
          }

          /* Certifications */
          .certifications-grid {
            display: grid;
            gap: 20px;
          }
          @media (min-width: 768px) {
            .certifications-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .cert-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .cert-card.primary {
            background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
            border-color: #5eead4;
          }
          .cert-badge {
            position: absolute;
            top: -10px;
            right: 16px;
            background: #0d9488;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .cert-card h3 {
            font-size: 1.25rem;
            margin: 0 0 2px;
            color: #0d9488;
          }
          .cert-fullname {
            font-size: 0.9375rem;
            color: #64748b;
            margin: 0 0 4px;
            font-style: italic;
          }
          .cert-org {
            font-size: 0.9375rem;
            color: #0d9488;
            font-weight: 500;
            margin: 0 0 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .cert-details {
            display: grid;
            gap: 10px;
            flex-grow: 1;
          }
          .cert-detail {
            font-size: 0.9375rem;
            line-height: 1.5;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .cert-detail-label {
            font-weight: 600;
            color: #475569;
            font-size: 0.8125rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .cert-detail span:last-child {
            color: #1e293b;
          }
          .cert-link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 16px;
            color: #0d9488;
            font-weight: 600;
            font-size: 0.9375rem;
            text-decoration: none;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .cert-link:hover {
            text-decoration: underline;
          }

          /* Salary Section */
          .live-data-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1px solid #6ee7b7;
            color: #047857;
            padding: 14px 18px;
            border-radius: 10px;
            font-size: 0.9rem;
            margin-bottom: 24px;
          }
          .live-indicator {
            width: 10px;
            height: 10px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.9); }
          }

          .salary-stats {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            margin: 28px 0;
          }
          @media (min-width: 480px) {
            .salary-stats {
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
            }
          }
          .salary-stat {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px 16px;
            text-align: center;
          }
          .salary-stat.main {
            background: linear-gradient(135deg, #0d9488, #0f766e);
            border: none;
            color: white;
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
          }
          .salary-label {
            display: block;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
            margin-bottom: 6px;
          }
          .salary-value {
            display: block;
            font-size: 1.75rem;
            font-weight: 700;
          }
          .salary-subtext {
            font-size: 0.75rem;
            opacity: 0.7;
            margin-top: 2px;
          }

          /* Live Data Link - styled like external link */
          :global(.live-data-link) {
            color: #0891b2;
            text-decoration: none;
            border-bottom: 1px dotted #0891b2;
            transition: all 0.2s ease;
            font-weight: 700;
          }
          :global(.live-data-link):hover {
            color: #0e7490;
            border-bottom-style: solid;
            border-bottom-color: #0e7490;
          }

          /* Live Data Sections Container - Dark Theme */
          .live-data-section {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 16px;
            padding: 24px 20px;
            margin: 32px 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          @media (min-width: 640px) {
            .live-data-section {
              padding: 32px;
            }
          }
          .live-data-section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .live-data-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #14b8a6, #0d9488);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.125rem;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(20, 184, 166, 0.3);
          }
          .live-data-section h3 {
            font-size: 1.125rem;
            font-weight: 700;
            color: white;
            margin: 0;
            line-height: 1.3;
          }
          @media (min-width: 640px) {
            .live-data-section h3 {
              font-size: 1.25rem;
            }
          }
          .live-data-subtitle {
            font-size: 0.875rem;
            color: #94a3b8;
            margin: 0 0 20px;
            font-weight: 500;
          }

          /* States Grid */
          .states-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          @media (min-width: 480px) {
            .states-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (min-width: 640px) {
            .states-grid {
              grid-template-columns: repeat(5, 1fr);
              gap: 12px;
            }
          }

          /* Employers Grid */
          .employers-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          @media (min-width: 480px) {
            .employers-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (min-width: 640px) {
            .employers-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
            }
          }

          /* State & Employer Cards - Dark Theme */
          .state-card, .employer-card {
            display: flex;
            flex-direction: column;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 14px 12px;
            text-decoration: none;
            transition: all 0.2s;
          }
          @media (min-width: 640px) {
            .state-card, .employer-card {
              padding: 16px 14px;
            }
          }
          .state-card:hover, .employer-card:hover {
            background: rgba(20, 184, 166, 0.18);
            border-color: rgba(20, 184, 166, 0.5);
            box-shadow: 0 6px 20px rgba(20, 184, 166, 0.25);
            transform: translateY(-3px);
          }
          .state-name, .employer-name {
            display: block;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 6px;
            font-size: 0.9375rem;
            line-height: 1.3;
          }
          @media (min-width: 640px) {
            .state-name, .employer-name {
              font-size: 1rem;
            }
          }
          .state-jobs, .employer-jobs {
            display: block;
            font-size: 0.8125rem;
            color: #5eead4;
            font-weight: 700;
          }
          @media (min-width: 640px) {
            .state-jobs, .employer-jobs {
              font-size: 0.875rem;
            }
          }
          .state-salary {
            display: block;
            font-size: 0.75rem;
            color: #cbd5e1;
            margin-top: 6px;
          }
          @media (min-width: 640px) {
            .state-salary {
              font-size: 0.8125rem;
            }
          }

          /* Job Outlook */
          .job-outlook {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 28px;
            margin: 32px 0;
          }
          .job-outlook h3 {
            margin: 0 0 20px;
            color: #1a73e8;
            font-size: 1.25rem;
            font-weight: 700;
          }
          .outlook-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid #e2e8f0;
            flex-wrap: wrap;
          }
          .outlook-stat-box {
            display: flex;
            flex-direction: column;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 24px;
            text-align: center;
          }
          .outlook-number {
            font-size: 2.25rem;
            font-weight: 800;
            color: #0d9488;
            line-height: 1;
          }
          .outlook-period {
            font-size: 0.8125rem;
            color: #64748b;
            margin-top: 4px;
          }
          .outlook-badge {
            display: inline-block;
            background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
            border: 1px solid #6ee7b7;
            color: #047857;
            font-size: 0.8125rem;
            font-weight: 600;
            padding: 8px 16px;
            border-radius: 20px;
          }
          .outlook-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .outlook-content p {
            margin: 0;
            color: #475569;
            line-height: 1.7;
          }
          .outlook-point {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 16px;
            color: #475569;
            line-height: 1.6;
          }
          .outlook-point strong {
            color: #0d9488;
            font-weight: 600;
          }

          .sources-note {
            font-size: 0.8125rem;
            color: #94a3b8;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          .sources-note a {
            color: #64748b;
            text-decoration: none;
          }
          .sources-note a:hover {
            color: #0d9488;
            text-decoration: underline;
          }

          /* Career Paths */
          .career-paths-grid {
            display: grid;
            gap: 16px;
            margin-top: 24px;
          }
          @media (min-width: 640px) {
            .career-paths-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          .career-path-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            transition: all 0.2s;
          }
          .career-path-card:hover {
            border-color: #0d9488;
            box-shadow: 0 4px 12px rgba(13, 148, 136, 0.1);
          }
          .career-path-card h3 {
            color: #0d9488;
            margin: 0 0 10px;
            font-size: 1.125rem;
            font-weight: 700;
          }
          .career-path-card p {
            font-size: 0.9375rem;
            margin: 0;
            color: #475569;
            line-height: 1.6;
          }

          /* FAQs */
          .faq-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 24px;
          }
          .faq-item {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            transition: all 0.2s;
          }
          .faq-item:hover {
            border-color: #cbd5e1;
          }
          .faq-item[open] {
            border-color: #0d9488;
            box-shadow: 0 2px 8px rgba(13, 148, 136, 0.1);
          }
          .faq-item summary {
            padding: 18px 20px;
            font-weight: 600;
            color: #0f172a;
            cursor: pointer;
            list-style: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 1rem;
          }
          .faq-item summary::-webkit-details-marker {
            display: none;
          }
          .faq-item summary::after {
            content: '+';
            font-size: 1.5rem;
            color: #0d9488;
            font-weight: 300;
            transition: transform 0.2s;
          }
          .faq-item[open] summary::after {
            content: '−';
          }
          .faq-item p {
            padding: 0 20px 20px;
            margin: 0;
            color: #475569;
            line-height: 1.7;
            font-size: 0.9375rem;
          }

          /* Related Career Guides */
          .related-guides-section {
            margin-top: 56px;
            padding-top: 40px;
            border-top: 1px solid #e2e8f0;
          }
          .related-guides-section h2 {
            font-size: 0.875rem;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 20px;
            padding-bottom: 0;
            border-bottom: none;
          }
          .related-guides-grid {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          @media (min-width: 640px) {
            .related-guides-grid {
              flex-direction: row;
              gap: 24px;
            }
          }
          .related-guide-card {
            display: block;
            text-decoration: none;
            padding: 16px 0;
            border-bottom: 1px solid #f1f5f9;
            transition: all 0.15s;
          }
          @media (min-width: 640px) {
            .related-guide-card {
              flex: 1;
              padding: 0;
              border-bottom: none;
            }
          }
          .related-guide-card:hover h3 {
            color: #0d9488;
          }
          .guide-tag {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 600;
            color: #0d9488;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-bottom: 6px;
          }
          .related-guide-card h3 {
            font-size: 1.0625rem;
            font-weight: 600;
            color: #0f172a;
            margin: 0;
            line-height: 1.4;
            transition: color 0.15s;
          }

          /* Featured Jobs - Dark Theme Vertical List */
          .featured-jobs-section {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 16px;
            padding: 28px 24px;
            margin: 48px 0;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          @media (min-width: 640px) {
            .featured-jobs-section {
              padding: 36px 32px;
            }
          }
          .featured-jobs-section h2 {
            margin: 0 0 24px;
            border: none;
            padding: 0;
            color: #ffffff;
            font-size: 1.375rem;
            font-weight: 700;
            line-height: 1.3;
          }
          @media (min-width: 640px) {
            .featured-jobs-section h2 {
              font-size: 1.5rem;
            }
          }
          .featured-jobs-grid {
            display: flex;
            flex-direction: column;
            gap: 50px;
            margin-bottom: 28px;
          }
          @media (min-width: 640px) {
            .featured-jobs-grid {
              gap: 50px;
            }
          }
          .featured-job-card {
            display: flex;
            flex-direction: column;
            padding: 16px;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            transition: all 0.2s;
          }
          @media (min-width: 640px) {
            .featured-job-card {
              padding: 20px;
            }
          }
          .featured-job-card:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(94, 234, 212, 0.3);
          }
          :global(.featured-job-card) h3 {
            font-size: 1.0625rem;
            color: #ffffff;
            margin: 0 0 8px;
            font-weight: 400;
            line-height: 1.5;
            transition: color 0.2s;
          }
          :global(.featured-job-card:hover) h3 {
            color: #ffffff;
            font-weight: 700;
          }
          @media (min-width: 640px) {
            :global(.featured-job-card) h3 {
              font-size: 1.125rem;
            }
          }
          .job-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
            font-size: 0.875rem;
            line-height: 1.4;
          }
          @media (min-width: 640px) {
            .job-meta {
              font-size: 0.9375rem;
            }
          }
          .job-meta-divider {
            color: #64748b;
          }
          .job-employer {
            color: #5eead4;
            font-weight: 500;
          }
          .job-location {
            color: #cbd5e1;
          }
          .job-salary {
            color: #86efac;
            font-weight: 500;
          }
          .job-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .job-tag {
            display: inline-block;
            font-size: 0.75rem;
            font-weight: 500;
            padding: 4px 10px;
            border-radius: 4px;
            line-height: 1.3;
          }
          .tag-specialty {
            background: rgba(14, 165, 233, 0.2);
            color: #7dd3fc;
            border: 1px solid rgba(14, 165, 233, 0.3);
          }
          .tag-type {
            background: rgba(168, 85, 247, 0.2);
            color: #d8b4fe;
            border: 1px solid rgba(168, 85, 247, 0.3);
          }
          .tag-shift {
            background: rgba(251, 191, 36, 0.2);
            color: #fcd34d;
            border: 1px solid rgba(251, 191, 36, 0.3);
          }
          .view-all-jobs {
            text-align: center;
            margin-top: 12px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          :global(.view-all-button) {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
            color: white;
            font-weight: 400;
            font-size: 1.0625rem;
            padding: 18px 36px;
            border-radius: 12px;
            text-decoration: none;
            border: 2px solid rgba(94, 234, 212, 0.3);
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            text-transform: none;
            letter-spacing: 0.02em;
          }
          @media (min-width: 640px) {
            :global(.view-all-button) {
              font-size: 1.125rem;
              padding: 10px 40px;
            }
          }
          :global(.view-all-button):hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 30px rgba(20, 184, 166, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
            background: linear-gradient(135deg, #2dd4bf 0%, #14b8a6 100%);
            border-color: rgba(94, 234, 212, 0.5);
          }
          :global(.view-all-button)::after {
            content: '→';
            font-size: 1rem;
            font-weight: 400;
            transition: transform 0.25s ease;
          }
          :global(.view-all-button):hover::after {
            transform: translateX(6px);
          }

          @media (max-width: 640px) {
            .hero h1 {
              font-size: 1.75rem;
            }
            .salary-stats {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </article>
    </>
  );
}

/**
 * Server-Side Props
 * Fetches static career data + live database stats
 */
export async function getServerSideProps({ params }) {
  const { slug } = params;

  // Get static career data using the full SEO-friendly slug
  const careerData = getSpecialtyCareerData(slug);

  if (!careerData) {
    // Return 404 for guides that don't exist
    return {
      notFound: true
    };
  }

  // Get the specialty name for database queries (from the data's specialty field)
  const specialtySlug = careerData.specialty || slug;
  const specialtyName = slugToSpecialty(specialtySlug) || careerData.fullName;

  // Fetch live stats from database
  let liveStats = {
    jobCount: 0,
    avgSalary: null,
    minSalary: null,
    maxSalary: null,
    topStates: [],
    topEmployers: [],
    featuredJobs: []
  };

  try {
    // Run all queries in parallel
    const [
      jobsWithSalary,
      jobCount,
      topStatesRaw,
      topEmployersData,
      featuredJobsData
    ] = await Promise.all([
      // Fetch jobs with salary data for proper midpoint calculation
      prisma.nursingJob.findMany({
        where: {
          specialty: specialtyName,
          isActive: true,
          OR: [
            { salaryMinAnnual: { not: null } },
            { salaryMaxAnnual: { not: null } }
          ]
        },
        select: {
          salaryMinHourly: true,
          salaryMaxHourly: true,
          salaryMinAnnual: true,
          salaryMaxAnnual: true,
          state: true
        }
      }),

      // Total job count
      prisma.nursingJob.count({
        where: {
          specialty: specialtyName,
          isActive: true
        }
      }),

      // Top states by job count
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: {
          specialty: specialtyName,
          isActive: true
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),

      // Top employers
      prisma.nursingJob.groupBy({
        by: ['employerId'],
        where: {
          specialty: specialtyName,
          isActive: true
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 6
      }),

      // Featured jobs
      prisma.nursingJob.findMany({
        where: {
          specialty: specialtyName,
          isActive: true
        },
        select: {
          slug: true,
          title: true,
          city: true,
          state: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
          specialty: true,
          jobType: true,
          shiftType: true,
          employer: {
            select: { name: true }
          }
        },
        orderBy: { postedDate: 'desc' },
        take: 5
      })
    ]);

    // Get employer details
    let topEmployers = [];
    if (topEmployersData.length > 0) {
      const employerIds = topEmployersData.map(e => e.employerId).filter(Boolean);
      const employers = await prisma.healthcareEmployer.findMany({
        where: { id: { in: employerIds } },
        select: { id: true, name: true, slug: true }
      });

      const employerMap = {};
      employers.forEach(emp => {
        employerMap[emp.id] = emp;
      });

      topEmployers = topEmployersData
        .filter(e => employerMap[e.employerId])
        .map(e => ({
          name: employerMap[e.employerId].name,
          slug: employerMap[e.employerId].slug,
          count: e._count.id
        }));
    }

    // Format salary based on original type (hourly vs annual)
    const formatJobSalary = (job) => {
      if (!job.salaryMax && !job.salaryMin) return null;

      const isHourly = job.salaryType?.toLowerCase() === 'hourly';
      const suffix = isHourly ? '/hr' : '/yr';

      const min = job.salaryMin;
      const max = job.salaryMax;

      // Show range if both exist and are different
      if (min && max && min !== max) {
        return `$${min.toLocaleString()}-$${max.toLocaleString()}${suffix}`;
      }

      // Show single value (prefer max, fallback to min)
      const value = max || min;
      return `$${value.toLocaleString()}${suffix}`;
    };

    // Format featured jobs
    const featuredJobs = featuredJobsData.map(job => ({
      slug: job.slug,
      title: job.title,
      employer: job.employer?.name || 'Healthcare Facility',
      city: job.city,
      state: job.state,
      salary: formatJobSalary(job),
      specialty: job.specialty,
      jobType: job.jobType,
      shiftType: job.shiftType
    }));

    // Calculate salary stats using the same midpoint logic as salary pages
    const salaryStats = calculateSalaryStats(jobsWithSalary);

    // Calculate per-state salary averages using midpoint logic
    const topStates = topStatesRaw.map(s => {
      const stateJobs = jobsWithSalary.filter(j => j.state === s.state);
      const stateStats = calculateSalaryStats(stateJobs);
      return {
        state: s.state,
        count: s._count.id,
        avgSalary: stateStats.annual?.average ? Math.round(stateStats.annual.average) : null
      };
    });

    liveStats = {
      jobCount,
      avgSalary: salaryStats.annual?.average ? Math.round(salaryStats.annual.average) : null,
      minSalary: salaryStats.annual?.min ? Math.round(salaryStats.annual.min) : null,
      maxSalary: salaryStats.annual?.max ? Math.round(salaryStats.annual.max) : null,
      topStates,
      topEmployers,
      featuredJobs,
      isGeneralJobs
    };

  } catch (error) {
    console.error('Error fetching live stats:', error);
    // Continue with empty live stats - page still works with static data
  } finally {
    await prisma.$disconnect();
  }

  return {
    props: {
      careerData,
      liveStats,
      guideSlug: slug,           // SEO-friendly slug for canonical URL
      specialtySlug              // Specialty slug for job page links
    }
  };
}
