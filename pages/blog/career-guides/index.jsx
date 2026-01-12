import Head from 'next/head';
import Link from 'next/link';
import { getAvailableCareerGuides, SPECIALTY_CAREER_DATA } from '../../../lib/constants/specialtyCareerData';
import CategoryNav from '../../../components/blog/CategoryNav';

// Helper to get correct article ("a" vs "an")
const getArticle = (name) => /^[aeiouAEIOU]/.test(name) ? 'an' : 'a';

/**
 * Career Guides Index Page
 * Simple, clean category page listing all nursing career guides
 */
export default function CareerGuidesIndex({ guides }) {
  return (
    <>
      <Head>
        <title>Nursing Career Guides | How to Become a Nurse | IntelliResume</title>
        <meta
          name="description"
          content="Comprehensive guides on how to become a nurse in various specialties. Learn about education requirements, certifications, salaries, and career paths."
        />
      </Head>

      <div className="page-container">
        <CategoryNav />

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="separator">/</span>
          <Link href="/blog">Resources</Link>
          <span className="separator">/</span>
          <span className="current">Career Guides</span>
        </nav>

        {/* Category Header - Compact style matching other categories */}
        <header className="category-header">
          <div className="category-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div className="category-text">
            <h1>Career Guides</h1>
            <p>Step-by-step guides on how to become a nurse in high-demand specialties. Education requirements, certifications, salaries, and career paths.</p>
          </div>
        </header>

        {/* Guides Grid */}
        <div className="guides-grid">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/blog/career-guides/${guide.slug}`}
              className="guide-card"
            >
              <span className="badge">{guide.demandLevel}</span>
              <h2>How to Become {getArticle(guide.name)} {guide.name} Nurse</h2>
              <p>{guide.description}</p>
              <div className="meta">
                <span>{guide.avgSalary}</span>
                <span className="dot">•</span>
                <span>{guide.timeToSpecialize}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* More Coming */}
        <div className="more-coming">
          <p>More specialty guides coming soon — ER, L&D, Med-Surg, OR, and more.</p>
        </div>

        <style jsx>{`
          .page-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 20px 80px;
            font-family: var(--font-figtree), ui-sans-serif, system-ui, sans-serif;
          }

          .breadcrumb {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
            color: #6b7280;
            padding: 16px 0;
          }

          .breadcrumb :global(a) {
            color: #0d9488;
            text-decoration: none;
          }

          .breadcrumb :global(a:hover) {
            text-decoration: underline;
          }

          .separator {
            color: #d1d5db;
          }

          .current {
            color: #374151;
          }

          .category-header {
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            padding: 1.5rem 2rem;
            background: #f8fafc;
            border-left: 5px solid #0d9488;
            border-radius: 0 8px 8px 0;
            margin-bottom: 2rem;
          }

          .category-icon {
            width: 48px;
            height: 48px;
            background: #0d9488;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
          }

          .category-text {
            flex: 1;
          }

          .category-text h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #111827;
            margin: 0 0 0.5rem;
          }

          .category-text p {
            font-size: 1rem;
            color: #6b7280;
            margin: 0;
            line-height: 1.5;
          }

          .guides-grid {
            display: grid;
            gap: 20px;
          }

          @media (min-width: 640px) {
            .guides-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .guide-card {
            display: block;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 24px;
            text-decoration: none;
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .guide-card:hover {
            border-color: #0d9488;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }

          .badge {
            display: inline-block;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: #ecfdf5;
            color: #059669;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 12px;
          }

          .guide-card h2 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 8px;
            line-height: 1.4;
          }

          .guide-card p {
            font-size: 0.9rem;
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 16px;
          }

          .meta {
            font-size: 0.85rem;
            color: #0d9488;
            font-weight: 500;
          }

          .dot {
            margin: 0 8px;
            color: #d1d5db;
          }

          .more-coming {
            text-align: center;
            margin-top: 48px;
            padding: 24px;
            background: #f9fafb;
            border-radius: 8px;
          }

          .more-coming p {
            margin: 0;
            color: #6b7280;
            font-size: 0.95rem;
          }
        `}</style>
      </div>
    </>
  );
}

export async function getStaticProps() {
  const slugs = getAvailableCareerGuides();

  const guides = slugs.map(slug => {
    const data = SPECIALTY_CAREER_DATA[slug];
    return {
      slug,
      name: data.name,
      description: data.seo.description.substring(0, 120) + '...',
      avgSalary: data.quickFacts.avgSalary,
      timeToSpecialize: data.quickFacts.typicalTimeToSpecialize,
      demandLevel: data.quickFacts.demandLevel
    };
  });

  return {
    props: {
      guides
    }
  };
}
