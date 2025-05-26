// Simple test endpoint for summary generation API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the request data for debugging
    console.log('Test Summary API - Request received:', {
      method: req.method,
      bodySize: JSON.stringify(req.body).length,
      hasExistingSummary: !!req.body.existingSummary,
      experienceCount: req.body.experience?.length || 0,
      hasJobContext: !!req.body.jobContext,
      action: req.body.action
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

    // Return a mocked response
    return res.status(200).json({
      summary: "This is a test summary generated for development purposes. In production, this would be an AI-generated professional summary customized based on your experience and job target. Your real summary would be tailored to highlight your most relevant qualifications and achievements.",
      debug: {
        receivedData: {
          hasExistingSummary: !!req.body.existingSummary,
          experienceCount: req.body.experience?.length || 0,
          action: req.body.action || 'generate'
        }
      }
    });
  } catch (error) {
    console.error('Test Summary API - Error:', error);
    return res.status(500).json({ 
      error: 'Server error processing request',
      message: error.message
    });
  }
} 