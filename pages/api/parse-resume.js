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
You are an expert resume parser specializing in healthcare and nursing resumes. Your task is to extract structured information from a resume.

The text was extracted from a ${fileExt.replace('.', '')} file using ${extractionMethod}.

Extract the following information:

1. Personal Information:
   - Name, Email, Phone, Location
   - LinkedIn URL (if present)
   - Personal website or portfolio (if present)

2. Professional Summary/Objective (if present)

3. Work Experience:
   - For each position: Job title, Company/Facility name, Location, Dates (start and end), Description/responsibilities/achievements
   - NURSING CONTEXT: Preserve any clinical details mentioned — patient ratios, unit types (ICU, ER, Med-Surg, L&D, NICU, etc.), shift types (Day, Night, Rotating), facility types (Level I Trauma, Magnet, Teaching Hospital), and EHR systems (Epic, Cerner, Meditech, etc.)

4. Education:
   - ONLY formal degrees from colleges and universities
   - Recognize nursing degrees: ADN (Associate Degree in Nursing), BSN (Bachelor of Science in Nursing), MSN (Master of Science in Nursing), DNP (Doctor of Nursing Practice), PhD in Nursing
   - Do NOT include certifications, courses, bootcamps, or training programs here

5. Nursing Licenses:
   - Extract ALL nursing licenses mentioned (RN, APRN, LPN, LVN)
   - Look for state of licensure (e.g., "RN License - New York", "Compact RN License", "California RN #12345")
   - Detect compact/multistate licenses (NLC)
   - Extract license numbers if present
   - Common patterns: "Licensed Registered Nurse", "State of [X] RN License", "Multistate Compact License"

6. Skills:
   - Include clinical and professional skills
   - Do NOT include language skills (e.g., "Fluent in Spanish")
   - NURSING CONTEXT: Look for clinical competencies like medication administration, IV therapy, wound care, patient assessment, ventilator management, telemetry monitoring, triage, discharge planning, care coordination, patient education
   - Include EHR/EMR systems (Epic, Cerner, Meditech, CPSI, Allscripts) as skills
   - Include nursing-specific tools and procedures

7. Additional Information:
   - Certifications: Put ALL professional certifications here. For nursing, look for: BLS (Basic Life Support), ACLS (Advanced Cardiovascular Life Support), PALS (Pediatric Advanced Life Support), NRP (Neonatal Resuscitation Program), TNCC (Trauma Nursing Core Course), CCRN, CEN, OCN, and any specialty certifications. Also include non-nursing certs, courses, bootcamps, training programs.
   - Languages: ALL language skills with proficiency levels. Default to "Fluent" if not stated.
   - Professional Memberships: Extract ALL professional organization memberships. For nursing, look for: ANA (American Nurses Association), AACN (American Association of Critical-Care Nurses), AORN, ENA, ONS, AWHONN, APNA, Sigma Theta Tau, and any specialty nursing organizations.
   - Volunteer work: Extract ALL volunteer experiences with organization name and role/position.
   - Awards/achievements: Extract ALL awards, honors, and recognitions.

Format the response as a valid JSON object with this structure:
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
      "graduationDate": "",
      "description": ""
    }
  ],
  "licenses": [
    {
      "type": "rn",
      "state": "",
      "licenseNumber": "",
      "isCompact": false,
      "expirationDate": ""
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
    "languages": [
      {
        "language": "",
        "proficiency": ""
      }
    ],
    "memberships": [
      {
        "name": ""
      }
    ],
    "volunteer": [
      {
        "organization": "",
        "role": ""
      }
    ],
    "awards": [
      {
        "name": ""
      }
    ]
  }
}

IMPORTANT GUIDELINES:
- Education: ONLY formal degrees (ADN, BSN, MSN, DNP, PhD, Bachelor's, Master's, etc.). graduationDate must be in "Month Year" format (e.g., "May 2020", "December 2018"). Use full month names (January, February, March, April, May, June, July, August, September, October, November, December). If only a year is given, use "May" as default month.
- Licenses: type must be one of: "rn", "aprn", "lpn", "lvn". State should be the 2-letter US state code (e.g., "NY", "CA", "TX"). Set isCompact to true if "compact", "multistate", or "NLC" is mentioned. Return an empty array if no licenses found.
- Certifications: ALL professional certificates — especially nursing certs (BLS, ACLS, PALS, NRP, TNCC, CCRN, CEN, etc.), courses, bootcamps, training programs
- Languages: Extract ALL language skills, default proficiency to "Fluent" if not stated
- Skills: Clinical and professional skills, EHR systems, nursing tools — NOT languages
- Experience descriptions: Preserve exact clinical details, metrics, and nursing terminology from the original text. Do not paraphrase or lose specificity.
- Memberships: Extract ALL professional organization memberships. Return empty array if none found.
- Volunteer: Extract ALL volunteer experiences with organization name and role. Return empty array if none found.
- Awards: Extract ALL awards, honors, and recognitions with the award name. Return empty array if none found.
- Leave fields empty if the information is not in the document
- Do not make up information or use placeholders
- Ensure valid JSON format
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