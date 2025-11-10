import { getAllPosts, getCategories } from '../lib/blog/api';

const BlogSitemap = () => {
  return null;
};

export const getServerSideProps = async ({ res }) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intelliresume.net';
  
  // Generate sitemap XML
  const sitemap = await generateSitemap(baseUrl);
  
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();
  
  return {
    props: {},
  };
};

async function generateSitemap(baseUrl) {
  try {
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
    
    // Get all blog posts and categories
    const allPosts = await getAllPosts();
    const categories = await getCategories();
    
    // Add content silo pages
    const contentSilos = [
      'resume-examples',
      'job-descriptions',
      'career-advice'
    ];
    
    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add blog main page
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${baseUrl}/blog`)}</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
    
    // Add blog categories
    categories.forEach(category => {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/blog/${category.slug}`)}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });
    
    // Add content silo pages
    contentSilos.forEach(silo => {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/blog/${silo}`)}</loc>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    });
    
    // Add blog posts
    allPosts.forEach(post => {
      const lastmod = post.updatedDate || post.publishedDate;
      
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(`${baseUrl}/blog/${post.category}/${post.slug}`)}</loc>\n`;
      
      if (lastmod) {
        const formattedDate = new Date(lastmod).toISOString().split('T')[0];
        xml += `    <lastmod>${formattedDate}</lastmod>\n`;
      }
      
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      xml += `  </url>\n`;
    });
    
    // Close XML
    xml += '</urlset>';
    
    return xml;
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
  }
}

export default BlogSitemap; 