/**
 * Dynamic Sitemap for Job Pages
 * Generates XML sitemap including:
 * - All individual job pages
 * - All state pages
 * - All city pages
 * - All specialty pages
 * - All employer pages
 */

const { PrismaClient } = require('@prisma/client');
const { getStateFullName } = require('../lib/jobScraperUtils');
const { jobTypeToSlug } = require('../lib/constants/jobTypes');

const prisma = new PrismaClient();

export async function getServerSideProps({ res }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://intelliresume.net';
  
  try {
    // Fetch all data in parallel
    const [
      jobs,
      states,
      cities,
      specialties,
      employers,
      stateSpecialties,
      citySpecialties,
      employerSpecialties,
      employerJobTypes
    ] = await Promise.all([
      // All active jobs
      prisma.nursingJob.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { scrapedAt: 'desc' }
      }),
      // All states with jobs
      prisma.nursingJob.groupBy({
        by: ['state'],
        where: { isActive: true },
        _count: { id: true }
      }),
      // All cities with jobs (state + city)
      prisma.nursingJob.groupBy({
        by: ['state', 'city'],
        where: { isActive: true },
        _count: { id: true }
      }),
      // All specialties with jobs
      prisma.nursingJob.groupBy({
        by: ['specialty'],
        where: { 
          isActive: true,
          specialty: { not: null }
        },
        _count: { id: true }
      }),
      // All employers with jobs (relation is called 'jobs' in schema, not 'nursingJobs')
      prisma.healthcareEmployer.findMany({
        where: {
          jobs: {
            some: {
              isActive: true
            }
          }
        },
        select: { slug: true },
        orderBy: { name: 'asc' }
      }),
      // All state + specialty combinations
      prisma.nursingJob.groupBy({
        by: ['state', 'specialty'],
        where: {
          isActive: true,
          specialty: { not: null }
        },
        _count: { id: true }
      }),
      // All city + specialty combinations
      prisma.nursingJob.groupBy({
        by: ['state', 'city', 'specialty'],
        where: {
          isActive: true,
          specialty: { not: null }
        },
        _count: { id: true }
      }),
      // All employer + specialty combinations
      prisma.nursingJob.groupBy({
        by: ['employerId', 'specialty'],
        where: {
          isActive: true,
          employerId: { not: null },
          specialty: { not: null }
        },
        _count: { id: true }
      }),
      // All employer + job type combinations
      prisma.nursingJob.groupBy({
        by: ['employerId', 'jobType'],
        where: {
          isActive: true,
          employerId: { not: null },
          jobType: { not: null }
        },
        _count: { id: true }
      })
    ]);

    // Start building XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Helper to escape XML special characters
    const escapeXml = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    // Helper to add URL entry
    const addUrl = (path, lastmod, changefreq = 'weekly', priority = '0.7') => {
      const lastmodDate = lastmod ? new Date(lastmod).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const escapedUrl = escapeXml(`${baseUrl}${path}`);
      xml += `  <url>\n`;
      xml += `    <loc>${escapedUrl}</loc>\n`;
      xml += `    <lastmod>${lastmodDate}</lastmod>\n`;
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `  </url>\n`;
    };

    // 0. Main jobs listing page (always include this)
    addUrl(
      '/jobs/nursing',
      null,
      'daily',
      '0.8'
    );

    // 1. Individual job pages (highest priority - these are most specific)
    if (jobs && Array.isArray(jobs)) {
      jobs.forEach(job => {
        if (job && job.slug) {
          addUrl(
            `/jobs/nursing/${job.slug}`,
            job.updatedAt,
            'weekly',
            '0.8'
          );
        }
      });
    }

    // 2. State pages (high priority - location-based searches)
    if (states && Array.isArray(states)) {
      states.forEach(stateData => {
        if (!stateData || !stateData.state) return;
        const stateCode = stateData.state.toLowerCase();
        const stateFullName = getStateFullName(stateData.state);
      
      // Add state code URL (e.g., /jobs/nursing/oh)
      addUrl(
        `/jobs/nursing/${stateCode}`,
        null,
        'weekly',
        '0.7'
      );
      
      // Also add state name URL if it's different (e.g., /jobs/nursing/ohio)
      if (stateFullName && stateFullName.toLowerCase() !== stateCode) {
        const stateNameSlug = stateFullName.toLowerCase().replace(/\s+/g, '-');
        addUrl(
          `/jobs/nursing/${stateNameSlug}`,
          null,
          'weekly',
          '0.7'
        );
      }
      });
    }

    // 3. City pages (high priority - very specific location searches)
    if (cities && Array.isArray(cities)) {
      cities.forEach(cityData => {
        if (!cityData || !cityData.state || !cityData.city) return;
        const stateCode = cityData.state.toLowerCase();
        const citySlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${citySlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // 4. State salary pages
    if (states && Array.isArray(states)) {
      states.forEach(stateData => {
        if (!stateData || !stateData.state) return;
        const stateCode = stateData.state.toLowerCase();
        addUrl(
          `/jobs/nursing/${stateCode}/salary`,
          null,
          'weekly',
          '0.6'
        );
      });
    }

    // 5. City salary pages
    if (cities && Array.isArray(cities)) {
      cities.forEach(cityData => {
        if (!cityData || !cityData.state || !cityData.city) return;
        const stateCode = cityData.state.toLowerCase();
        const citySlug = cityData.city.toLowerCase().replace(/\s+/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${citySlug}/salary`,
          null,
          'weekly',
          '0.6'
        );
      });
    }

    // 6. State + Specialty pages (NEW programmatic pages)
    if (stateSpecialties && Array.isArray(stateSpecialties)) {
      stateSpecialties.forEach(data => {
        if (!data || !data.state || !data.specialty) return;
        const stateCode = data.state.toLowerCase();
        const specialtySlug = data.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${specialtySlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // 7. City + Specialty pages (NEW programmatic pages)
    if (citySpecialties && Array.isArray(citySpecialties)) {
      citySpecialties.forEach(data => {
        if (!data || !data.state || !data.city || !data.specialty) return;
        const stateCode = data.state.toLowerCase();
        const citySlug = data.city.toLowerCase().replace(/\s+/g, '-');
        const specialtySlug = data.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${citySlug}/${specialtySlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // 8. State + Specialty salary pages (NEW programmatic pages)
    if (stateSpecialties && Array.isArray(stateSpecialties)) {
      stateSpecialties.forEach(data => {
        if (!data || !data.state || !data.specialty) return;
        const stateCode = data.state.toLowerCase();
        const specialtySlug = data.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${specialtySlug}/salary`,
          null,
          'weekly',
          '0.6'
        );
      });
    }

    // 9. City + Specialty salary pages (NEW programmatic pages)
    if (citySpecialties && Array.isArray(citySpecialties)) {
      citySpecialties.forEach(data => {
        if (!data || !data.state || !data.city || !data.specialty) return;
        const stateCode = data.state.toLowerCase();
        const citySlug = data.city.toLowerCase().replace(/\s+/g, '-');
        const specialtySlug = data.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/${stateCode}/${citySlug}/${specialtySlug}/salary`,
          null,
          'weekly',
          '0.6'
        );
      });
    }

    // 10. National Specialty pages
    if (specialties && Array.isArray(specialties)) {
      specialties.forEach(specData => {
        if (!specData || !specData.specialty) return;
        const specialtySlug = specData.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/specialty/${specialtySlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // 11. Employer pages
    if (employers && Array.isArray(employers)) {
      employers.forEach(employer => {
        if (!employer || !employer.slug) return;
        addUrl(
          `/jobs/nursing/employer/${employer.slug}`,
        null,
        'weekly',
        '0.7'
      );
      });
    }

    // 12. Employer + Specialty pages
    if (employerSpecialties && Array.isArray(employerSpecialties)) {
      // First, get employer slugs for all employerIds
      const employerIds = [...new Set(employerSpecialties.map(e => e.employerId).filter(Boolean))];
      const employersById = await prisma.healthcareEmployer.findMany({
        where: { id: { in: employerIds } },
        select: { id: true, slug: true }
      });
      
      const employerIdToSlug = {};
      employersById.forEach(emp => {
        employerIdToSlug[emp.id] = emp.slug;
      });

      employerSpecialties.forEach(data => {
        if (!data || !data.employerId || !data.specialty) return;
        const employerSlug = employerIdToSlug[data.employerId];
        if (!employerSlug) return;
        
        const specialtySlug = data.specialty.toLowerCase().replace(/\s+/g, '-').replace(/\s*&\s*/g, '-');
        addUrl(
          `/jobs/nursing/employer/${employerSlug}/${specialtySlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // 13. Employer + Job Type pages
    if (employerJobTypes && Array.isArray(employerJobTypes)) {
      // Get employer slugs for all employerIds
      const employerIds = [...new Set(employerJobTypes.map(e => e.employerId).filter(Boolean))];
      const employersById = await prisma.healthcareEmployer.findMany({
        where: { id: { in: employerIds } },
        select: { id: true, slug: true }
      });
      
      const employerIdToSlug = {};
      employersById.forEach(emp => {
        employerIdToSlug[emp.id] = emp.slug;
      });

      employerJobTypes.forEach(data => {
        if (!data || !data.employerId || !data.jobType) return;
        const employerSlug = employerIdToSlug[data.employerId];
        if (!employerSlug) return;
        
        // Normalize job type slug (handles PRN -> per-diem, etc.)
        const jobTypeSlug = jobTypeToSlug(data.jobType);
        if (!jobTypeSlug) return;
        
        addUrl(
          `/jobs/nursing/employer/${employerSlug}/${jobTypeSlug}`,
          null,
          'weekly',
          '0.7'
        );
      });
    }

    // Close XML
    xml += '</urlset>';

    // Set response headers
    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    
    // Write XML to response
    res.write(xml);
    res.end();

    return {
      props: {}
    };

  } catch (error) {
    console.error('Error generating job sitemap:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Return minimal sitemap on error (at least the main page)
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/jobs/nursing</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.write(errorXml);
    res.end();

    return {
      props: {}
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Default export (required by Next.js but won't render anything)
export default function JobSitemap() {
  return null;
}

