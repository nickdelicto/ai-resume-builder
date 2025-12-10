/**
 * Rule-based job description formatter
 * Applies simple text transformations to improve readability
 * Used for scrapers that return raw, unformatted text (e.g., Hartford HealthCare)
 */

/**
 * Format Hartford HealthCare job descriptions with proper spacing and structure
 * @param {string} rawDescription - Raw text from scraper
 * @returns {string} Formatted description with line breaks and spacing
 */
function formatHartfordDescription(rawDescription) {
  if (!rawDescription || rawDescription.length < 100) {
    return rawDescription; // Too short to format
  }
  
  let formatted = rawDescription;
  
  // Step 1: Fix Hartford-specific metadata patterns
  // These are ALWAYS at the start: "Location Detail: XXXShift Detail: YYY"
  // Make them bold labels, not headers
  formatted = formatted.replace(/^Location Detail:\s*/i, '**Location Detail:**\n\n');
  formatted = formatted.replace(/Shift Detail:\s*/g, '\n\n**Shift Detail:**\n\n');
  formatted = formatted.replace(/Work Location Type:\s*/g, '\n\n**Work Location Type:**\n\n');
  
  // Step 2: Fix Hartford pattern where "Qualifications" appears after text
  // Pattern: "continuum. Qualifications Minimum" -> "continuum.\n\n## Qualifications\n\nMinimum"
  formatted = formatted.replace(/\.\s*Qualifications\s+(Minimum\s+Requirements:)/gi, '.\n\n## Qualifications\n\n$1');
  
  // Fix duplicate "Qualifications Qualifications" pattern
  formatted = formatted.replace(/Qualifications\s+Qualifications/gi, 'Qualifications');
  
  // Step 3: Fix specific patterns where section appears after a word
  // Pattern: "preferred Experience:" -> "preferred\n\n## Experience"
  formatted = formatted.replace(/\b(preferred|required)\s+(Education|Experience):/gi, '$1\n\n## $2\n\n');
  
  // Step 4: Fix closing paren immediately followed by capital
  // Pattern: ")Word" -> ")\n\nWord"
  formatted = formatted.replace(/\)([A-Z])/g, ')\n\n$1');
  
  // Step 5: Fix missing spaces after periods
  // Pattern: period followed by capital letter with no space
  formatted = formatted.replace(/\.([A-Z])/g, '. $1');
  
  // Step 6: Fix missing spaces between lowercase and uppercase words
  // Pattern: "wordWord" -> "word Word" (common in Hartford descriptions)
  formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
  
  // Step 7: Fix bullet points without line breaks
  // Pattern: "word• " -> "word\n\n• "
  formatted = formatted.replace(/([a-z])•\s*/g, '$1\n\n• ');
  
  // Step 7b: Fix bullets with no space after them
  // Pattern: "•Word" -> "• Word"
  formatted = formatted.replace(/•([A-Z])/g, '• $1');
  
  // Step 7c: Fix bullet points that are lumped together with single line breaks
  // Pattern: "\n•" -> "\n\n•" (convert single line break to paragraph break)
  formatted = formatted.replace(/\n•/g, '\n\n•');
  
  // Step 7d: Also fix bullets directly after text
  // Pattern: "text•" or "word •" -> "text\n\n•"
  formatted = formatted.replace(/([a-z.])(\s*)•/gi, '$1\n\n•');
  
  // Step 9: Normalize all "Responsibilities" variants to just "Responsibilities:"
  // Replace long-form with simple form for consistency
  formatted = formatted.replace(/Responsibilities\s+include\s+but,?\s+are\s+not\s+limited\s+to\s+the\s+following:/gi, 
    'Responsibilities:');
  formatted = formatted.replace(/Responsibilities\s+include:/gi, 'Responsibilities:');
  
  // Step 9b: Make "Job Summary" a heading whenever it appears (2 words)
  // Pattern: "Job Summary:" anywhere -> "\n\n**Job Summary:**\n\n"
  formatted = formatted.replace(/Job\s+Summary:/gi, '\n\n**Job Summary:**\n\n');
  
  // Step 9c: Make "Responsibilities:" a heading whenever it appears
  // Pattern: "Responsibilities:" anywhere -> "\n\n**Responsibilities:**\n\n"
  formatted = formatted.replace(/Responsibilities:/gi, '\n\n**Responsibilities:**\n\n');
  
  // Step 9d: Make "Qualifications" a heading whenever it appears
  // Pattern: "Qualifications" (standalone word) -> "\n\n## Qualifications\n\n"
  formatted = formatted.replace(/\bQualifications\b/gi, '\n\n## Qualifications\n\n');
  
  // Other main sections
  const mainSections = [
    { pattern: /\n\nQualifications\s*\n/gi, replacement: '\n\n## Qualifications\n' },
    { pattern: /\n\nRequirements\s*\n/gi, replacement: '\n\n## Requirements\n' },
    { pattern: /\n\nEducation:\s*/gi, replacement: '\n\n## Education\n\n' },
    { pattern: /\n\nExperience:\s*/gi, replacement: '\n\n## Experience\n\n' },
    { pattern: /\n\nSkills:\s*/gi, replacement: '\n\n## Skills\n\n' },
    { pattern: /\n\nBenefits\s*\n/gi, replacement: '\n\n## Benefits\n' }
  ];
  
  mainSections.forEach(({ pattern, replacement }) => {
    formatted = formatted.replace(pattern, replacement);
  });
  
  // Step 10: Handle inline section headers that should be on their own line
  // Pattern: "License Education:" -> "License\n\n## Education"
  // But only when it's clearly a new section (capital letter, followed by colon)
  formatted = formatted.replace(/\s+(Education|Experience):\s*•/gi, '\n\n## $1\n\n•');
  
  // Step 11: Fix inline subsection headers that should be on their own line
  // Pattern: "text Job Summary: more text" -> "text\n\n**Job Summary:**\n\nmore text"
  const inlineHeaders = [
    'Job Summary:',
    'Responsibilities:',
    'Key Responsibilities:',
    'Minimum Requirements:',
    'What we offer:',
    'Why join us:',
    'About us:'
  ];
  
  inlineHeaders.forEach(header => {
    // Break out headers that appear after ANY character (not just lowercase)
    // Pattern: "word Job Summary:" or ". Job Summary:" -> "word\n\n**Job Summary:**"
    const regex = new RegExp(`([.!?a-z])\\s+(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    formatted = formatted.replace(regex, `$1\n\n**$2**\n\n`);
  });
  
  // Step 12: Handle special Hartford phrase "We take great care of careers."
  // This MUST always start a new paragraph
  formatted = formatted.replace(/([a-z])\s+(We take great care of careers\.)/gi, '$1\n\n$2');
  
  // Step 12b: Add paragraph breaks after subsection headers (with colons) that are already on their own line
  const subsectionHeaders = [
    'Program Description:',
    'Application Process:',
    'The Role of the OR Nurse:',
    'ELIGIBLE OR UNITS:'
  ];
  
  subsectionHeaders.forEach(header => {
    // Add double line break after header if not already present
    const regex = new RegExp(`(${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?!\n\n)`, 'gi');
    formatted = formatted.replace(regex, `**$1**\n\n`);
  });
  
  // Step 13: Convert remaining bullet points to proper line breaks
  // Pattern: bullet character (•, ·, ◦) followed by text
  formatted = formatted.replace(/([.!?])\s*•\s*/g, '$1\n\n• '); // Bullet after sentence
  formatted = formatted.replace(/:\s*•\s*/g, ':\n\n• '); // Bullet after colon
  
  // Step 14: Break long paragraphs (over 500 chars) into smaller chunks
  // ONLY apply to sections without bullets (bullets are already well-formatted)
  if (!formatted.includes('•')) {
    // Find sentences and add breaks every 3-4 sentences
    const sentences = formatted.split(/(?<=[.!?])\s+(?=[A-Z])/);
    let result = '';
    let currentParagraph = '';
    let sentenceCount = 0;
    
    sentences.forEach((sentence, index) => {
      currentParagraph += sentence + ' ';
      sentenceCount++;
      
      // Add paragraph break after 3 sentences OR if current para > 400 chars
      if (sentenceCount >= 3 || currentParagraph.length > 400) {
        result += currentParagraph.trim() + '\n\n';
        currentParagraph = '';
        sentenceCount = 0;
      }
      
      // Last sentence: flush remaining
      if (index === sentences.length - 1 && currentParagraph.trim()) {
        result += currentParagraph.trim();
      }
    });
    
    formatted = result || formatted;
  }
  
  // Step 14b: Ensure ALL bullets have proper paragraph spacing
  // Convert all single-newline bullets to double-newline bullets
  formatted = formatted.replace(/\n•/g, '\n\n•');
  
  // Step 15: Clean up excessive line breaks (more than 2 in a row)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Step 16: Clean up extra spaces (NOT newlines) around line breaks
  // Use [ \t]+ instead of \s+ to avoid matching newlines
  formatted = formatted.replace(/[ \t]+\n/g, '\n');  // Remove spaces/tabs before newlines
  formatted = formatted.replace(/\n[ \t]+/g, '\n'); // Remove spaces/tabs after newlines (but NOT other newlines)
  
  // Step 17: Trim whitespace
  formatted = formatted.trim();
  
  return formatted;
}

module.exports = {
  formatHartfordDescription
};

