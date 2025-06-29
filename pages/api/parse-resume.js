import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import path from 'path';
// Add document parsing libraries
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Configure for file uploads - needed for formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  console.log('🚀 Resume parsing API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = await parseForm(req);
    console.log('✅ Form parsed successfully');
    
    // Check if a file was uploaded
    if (!files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Handle both array and direct object formats from formidable
    // Newer versions of formidable may return an array
    const fileObject = Array.isArray(files.file) ? files.file[0] : files.file;
    
    // Debug the file object structure
    console.log('📋 File object keys:', Object.keys(fileObject));
    
    // Find the correct properties based on formidable version
    const fileName = fileObject.originalFilename || fileObject.name || fileObject.originalName || 'unknown.pdf';
    const filePath = fileObject.filepath || fileObject.path;
    const fileSize = fileObject.size || 0;
    
    console.log(`📄 File properties: path=${filePath}, name=${fileName}, size=${formatFileSize(fileSize)}`);
    
    if (!filePath) {
      console.error('❌ File path is undefined in file object:', fileObject);
      return res.status(500).json({ error: 'File path is undefined' });
    }
    
    console.log(`📄 Processing file: ${fileName} (${formatFileSize(fileSize)})`);

    // Check file extension
    const fileExt = path.extname(fileName).toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(fileExt)) {
      return res.status(400).json({ 
        error: `Unsupported file format: ${fileExt}. Only PDF, DOCX, and TXT files are supported.`,
        type: 'file_format',
        details: `File type ${fileExt} is not supported`
      });
    }

    try {
      // Parse the resume using OpenAI API (text-based approach)
      const parsedData = await parseResumeWithAI(fileObject, fileName, filePath, fileExt);
      console.log('✅ Resume parsed successfully');
      
      // Log the detailed structure of the parsed data
      console.log('📊 API - Final parsed data structure:', {
        personalInfo: parsedData.personalInfo ? 'Present' : 'Missing',
        summary: typeof parsedData.summary === 'string' ? 'String' : 'Not a string',
        experience: Array.isArray(parsedData.experience) ? `Array with ${parsedData.experience.length} items` : 'Not an array',
        education: Array.isArray(parsedData.education) ? `Array with ${parsedData.education.length} items` : 'Not an array',
        skills: Array.isArray(parsedData.skills) ? `Array with ${parsedData.skills.length} items` : 'Not an array',
        additional: parsedData.additional ? 'Present' : 'Missing'
      });
      
      if (parsedData.experience && parsedData.experience.length > 0) {
        console.log('📊 API - Experience item example:', parsedData.experience[0]);
      }
      
      if (parsedData.education && parsedData.education.length > 0) {
        console.log('📊 API - Education item example:', parsedData.education[0]);
      }
      
      return res.status(200).json({ data: parsedData });
    } catch (error) {
      console.error('❌ Error parsing resume:', error.message || error);
      
      // Get error type and structure
      const errorType = error.type || 'unknown';
      const errorDetails = error.details || error.message || 'Unknown error';
      
      // Return a structured error response with more details for the frontend
      return res.status(500).json({ 
        error: error.message || 'Failed to parse resume',
        type: errorType,
        details: errorDetails,
        fileName: fileName,
        fileExt: fileExt
      });
    }
  } catch (error) {
    console.error('❌ Server error:', error.message);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message,
      type: 'server_error'
    });
  }
}

// Helper function to parse form data with files
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Parse resume using OpenAI's API with text extraction
async function parseResumeWithAI(file, fileName, filePath, fileExt) {
  try {
    // Read the file
    const fileBuffer = await fs.readFile(filePath);
    console.log(`🔍 Processing ${fileExt} file (${formatFileSize(fileBuffer.length)})`);
    
    // Extract text based on file type
    let extractedText = '';
    let extractionMethod = '';
    
    try {
      if (fileExt === '.pdf') {
        // Extract text from PDF
        console.log(`🔍 Processing .pdf file (${formatFileSize(fileBuffer.length)})`);
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
        extractionMethod = 'pdf-parse';
      } else if (fileExt === '.docx') {
        // Extract text from DOCX
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = result.value;
        extractionMethod = 'mammoth';
      } else {
        // For text files, just read as UTF-8
        extractedText = fileBuffer.toString('utf-8');
        extractionMethod = 'direct';
      }
      
      console.log(`✅ Extracted ${extractedText.length} characters using ${extractionMethod}`);
      
      // Check if extraction was successful - if not, throw an error to stop processing
      if (!extractedText || extractedText.length < 100) {
        console.log('⚠️ Text extraction yielded insufficient content, throwing error');
        throw new Error('Insufficient text content extracted from file');
      }
    } catch (error) {
      console.error(`❌ Error extracting text from ${fileExt} file:`, error.message);
      // Kept for potential future logging/debugging
      // const extractionError = error;
      
      // Instead of fallback text, throw a more specific error that will be caught by the outer try/catch
      if (error.message.includes('Invalid PDF structure')) {
        throw {
          message: `Invalid PDF structure. Your file appears to be corrupted or in an unsupported format.`,
          type: 'file_corrupted',
          fileType: fileExt
        };
      } else if (error.message.includes('Insufficient text content')) {
        throw {
          message: `We couldn't extract enough text from your resume. Please try a different file format.`,
          type: 'extraction_failed',
          fileType: fileExt
        };
      } else {
        throw {
          message: `Failed to extract text from your ${fileExt.replace('.', '')} file: ${error.message}`,
          type: 'extraction_failed',
          fileType: fileExt
        };
      }
    }
    
    // Add a sample of text content for debugging (first 200 chars)
    const textSample = extractedText.substring(0, 200).replace(/\n/g, ' ');
    console.log(`💬 Extracted text sample: ${textSample}...`);
    
    // The prompt that instructs the model what to extract
    const prompt = `
You are an expert resume parser. Your task is to extract structured information from a resume.

The text was extracted from a ${fileExt.replace('.', '')} file using ${extractionMethod}.

Please extract the following information from this resume text:

1. Personal Information:
   - Name
   - Email
   - Phone
   - Location
   - LinkedIn URL (if present)
   - Personal website (if present)

2. Professional Summary/Objective (if present)

3. Work Experience:
   - For each position:
     - Job title
     - Company name
     - Location
     - Dates (start and end)
     - Description/responsibilities/achievements

4. Education:
   - IMPORTANT: Include ONLY formal education (degrees, diplomas) from colleges and universities
   - Do NOT include certificates, courses, bootcamps, or training programs here
   - For each education entry:
     - Degree (e.g., Bachelor's, Master's, Ph.D.)
     - Institution (university/college name)
     - Location
     - Dates
     - GPA, honors, or relevant coursework (if present)

5. Skills:
   - List all technical and professional skills
   - Do NOT include language skills here (e.g., "Fluent in Spanish", "German")
   - Focus on job-related abilities, tools, technologies, and competencies

6. Additional Information:
   - Certifications (IMPORTANT: Put ALL certificates, courses, training programs, bootcamps here)
   - Languages (IMPORTANT: Put ALL language skills here, including proficiency levels if mentioned)
   - Projects
   - Volunteer work
   - Awards/achievements

Format the response as a valid JSON object with the following structure:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "title": "",
      "company": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "education": [
    {
      "degree": "",
      "school": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "skills": [],
  "additional": {
    "certifications": [
      {
        "name": "",
        "issuer": "",
        "date": "",
        "description": ""
      }
    ],
    "projects": [],
    "languages": [
      {
        "language": "",
        "proficiency": ""
      }
    ],
    "volunteer": [],
    "awards": []
  }
}

IMPORTANT GUIDELINES:
- For Education: Include ONLY formal degrees from academic institutions (universities/colleges)
- For Certifications: Include ALL professional certificates, courses, bootcamps, and training programs
- For Languages: Extract ALL language skills and set proficiency to "Fluent" if not explicitly stated
- For Skills: Include technical, professional, and soft skills BUT NOT languages
- Leave fields empty if the information is not in the document
- Do not make up information or use placeholders
- Ensure valid JSON format with properly structured arrays and objects
`;

    // Create the request to OpenAI with a text-based approach
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: extractedText
        }
      ],
      response_format: { type: "json_object" },
    });

    console.log('📊 Response received from OpenAI');
    
    // Parse the JSON response
    const content = response.choices[0].message.content;
    
    // Log a sample of the response for debugging
    console.log('📝 Sample of response content:', content.substring(0, 200) + '...');
    
    try {
      const parsedContent = JSON.parse(content);
      
      // Validate the parsed data has basic required fields and structure
      if (!parsedContent.personalInfo || 
          !parsedContent.personalInfo.name || 
          (!Array.isArray(parsedContent.experience) || parsedContent.experience.length === 0)) {
        throw {
          message: 'Failed to extract meaningful data from resume',
          type: 'extraction_incomplete',
          details: 'The resume didn\'t contain enough recognizable information'
        };
      }
      
      return parsedContent;
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError);
      throw {
        message: 'Failed to parse resume data into valid format',
        type: 'format_error',
        details: jsonError.message
      };
    }
  } catch (error) {
    console.error('❌ File reading or API error:', error.message || error);
    // Pass through the error with type if it exists
    if (error.type) {
      throw error;
    } else {
      throw new Error(`Failed to parse resume: ${error.message || error}`);
    }
  }
} 