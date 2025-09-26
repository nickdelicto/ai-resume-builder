/**
 * MDX Utilities
 * 
 * This module provides utilities for working with MDX content.
 * These functions will be useful if we decide to use MDX for content in the future,
 * either with local files or with Strapi's rich text fields.
 */

import { serialize } from 'next-mdx-remote/serialize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

/**
 * Serialize MDX content for rendering
 * @param {string} content - The MDX content to serialize
 * @returns {Promise<Object>} Serialized MDX content
 */
export async function serializeMDX(content) {
  return serialize(content, {
    mdxOptions: {
      rehypePlugins: [
        rehypeSlug, // Add IDs to headings
        [rehypeAutolinkHeadings, { behavior: 'wrap' }], // Add links to headings
        rehypeHighlight, // Syntax highlighting
      ],
      remarkPlugins: [
        remarkGfm, // GitHub-flavored Markdown
      ],
    },
  });
}

/**
 * Extract table of contents from MDX content
 * @param {string} content - The MDX content
 * @returns {Promise<Array>} Array of heading objects with id and text
 */
export async function extractTableOfContents(content) {
  // Regular expression to match headings (# Heading, ## Heading, etc.)
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length; // Number of # symbols
    const text = match[2].trim();
    
    // Generate an ID similar to what rehype-slug would create
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Convert HTML content to MDX
 * This is useful when migrating from HTML-based content to MDX
 * @param {string} html - The HTML content
 * @returns {string} Equivalent MDX content
 */
export function htmlToMDX(html) {
  // This is a simplified implementation
  // For a real implementation, consider using a library like turndown
  
  // Replace common HTML elements with MDX equivalents
  let mdx = html
    .replace(/<h1>(.*?)<\/h1>/g, '# $1')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1')
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<ul>(.*?)<\/ul>/gs, (match, p1) => {
      return p1.replace(/<li>(.*?)<\/li>/g, '- $1\n');
    })
    .replace(/<ol>(.*?)<\/ol>/gs, (match, p1) => {
      let index = 1;
      return p1.replace(/<li>(.*?)<\/li>/g, () => {
        return `${index++}. $1\n`;
      });
    });
    
  return mdx.trim();
}

/**
 * Process content for Strapi integration
 * This function will handle Strapi's rich text format when we integrate with it
 * @param {Object} strapiContent - Content from Strapi API
 * @returns {Promise<Object>} Processed content ready for rendering
 */
export async function processStrapiContent(strapiContent) {
  // This is a placeholder function for future Strapi integration
  // The actual implementation will depend on how Strapi formats its content
  
  // For now, we'll assume strapiContent might contain markdown or HTML
  // that needs to be converted to MDX
  
  if (!strapiContent) return null;
  
  // If the content is already in MDX format
  if (strapiContent.mdx) {
    return await serializeMDX(strapiContent.mdx);
  }
  
  // If the content is in HTML format
  if (strapiContent.html) {
    const mdx = htmlToMDX(strapiContent.html);
    return await serializeMDX(mdx);
  }
  
  // If the content is in Markdown format
  if (strapiContent.markdown) {
    return await serializeMDX(strapiContent.markdown);
  }
  
  // If the content is in Strapi's rich text format
  if (strapiContent.richText) {
    // This would need to be implemented based on Strapi's rich text format
    // For now, we'll just pass it through
    return strapiContent.richText;
  }
  
  return null;
} 