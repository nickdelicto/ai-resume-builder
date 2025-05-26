// Simple test endpoint to debug experience format issues

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resumeData } = req.body;
    
    // Validate input data
    if (!resumeData) {
      return res.status(400).json({ error: 'Missing resume data' });
    }
    
    // Log details about the experience data
    console.log('📊 TEST - Experience data received');
    
    if (!resumeData.experience || !Array.isArray(resumeData.experience)) {
      console.log('📊 TEST - No valid experience array found');
      return res.status(200).json({
        status: 'error',
        message: 'No valid experience array found',
        dataType: typeof resumeData.experience
      });
    }
    
    console.log(`📊 TEST - Found ${resumeData.experience.length} experience items`);
    
    // Analyze each experience item
    const analysis = resumeData.experience.map((exp, index) => {
      console.log(`📊 TEST - Experience ${index + 1}:`, exp);
      
      // Check for description field
      const hasDescription = !!exp.description;
      const descriptionLength = exp.description ? exp.description.length : 0;
      const descriptionSample = exp.description ? exp.description.substring(0, 100) + '...' : 'NONE';
      
      // Check for bullet point formatting
      const hasBulletPoints = exp.description ? (
        exp.description.includes('• ') || 
        exp.description.includes('- ') || 
        exp.description.includes('* ') ||
        exp.description.includes('\n\n')
      ) : false;
      
      console.log(`📊 TEST - Experience ${index + 1} has description: ${hasDescription}`);
      console.log(`📊 TEST - Description length: ${descriptionLength}`);
      console.log(`📊 TEST - Has bullet formatting: ${hasBulletPoints}`);
      
      return {
        index,
        title: exp.title || 'MISSING',
        company: exp.company || 'MISSING',
        hasDescription,
        descriptionLength,
        hasBulletPoints,
        descriptionSample
      };
    });
    
    // Return the analysis
    return res.status(200).json({
      status: 'success',
      experienceCount: resumeData.experience.length,
      analysis
    });
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      message: error.message 
    });
  }
} 