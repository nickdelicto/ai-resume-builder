// Simple test endpoint for skills generation API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the request data for debugging
    console.log('Test Skills API - Request received:', {
      method: req.method,
      bodySize: JSON.stringify(req.body).length,
      existingSkillsCount: req.body.existingSkills?.length || 0,
      hasProfileContext: !!req.body.professionalContext,
      experienceCount: req.body.experience?.length || 0,
      hasSummary: !!req.body.summary,
      hasJobContext: !!req.body.jobContext,
      requestedCount: req.body.count || 8
    });

    // Check for required data
    const requiredFields = ['experience'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required data', 
        missingFields 
      });
    }

    // Generate mock skills based on job titles
    const jobTitles = req.body.experience.map(exp => exp.title.toLowerCase());
    let mockSkills = [];
    
    // Add technical skills for developer/engineer roles
    if (jobTitles.some(title => title.includes('develop') || title.includes('engineer'))) {
      mockSkills = mockSkills.concat([
        'JavaScript', 'React', 'Node.js', 'TypeScript', 'Docker',
        'CI/CD', 'RESTful APIs', 'AWS', 'Git', 'System Design'
      ]);
    }
    
    // Add management skills for manager/director roles
    if (jobTitles.some(title => title.includes('manager') || title.includes('director'))) {
      mockSkills = mockSkills.concat([
        'Team Leadership', 'Strategic Planning', 'Budget Management',
        'Performance Evaluation', 'Process Improvement', 'Agile Methodology'
      ]);
    }
    
    // Add general professional skills
    mockSkills = mockSkills.concat([
      'Communication', 'Problem Solving', 'Critical Thinking',
      'Time Management', 'Project Management', 'Data Analysis'
    ]);
    
    // Filter out any skills that match existing skills
    const existingSkills = req.body.existingSkills || [];
    const filteredSkills = mockSkills.filter(skill => 
      !existingSkills.some(existing => 
        existing.toLowerCase() === skill.toLowerCase())
    );
    
    // Limit to requested count
    const count = req.body.count || 8;
    const selectedSkills = filteredSkills.slice(0, count);

    return res.status(200).json({
      skills: selectedSkills,
      debug: {
        receivedData: {
          existingSkillsCount: req.body.existingSkills?.length || 0,
          experienceCount: req.body.experience?.length || 0,
          requestedCount: count
        }
      }
    });
  } catch (error) {
    console.error('Test Skills API - Error:', error);
    return res.status(500).json({ 
      error: 'Server error processing request',
      message: error.message
    });
  }
} 