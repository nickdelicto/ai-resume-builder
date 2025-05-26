# Resume Builder Fonts

This directory contains font files that are used by the resume builder's PDF generation feature.

By bundling fonts locally instead of loading them from CDNs, we:
1. Ensure consistent PDF rendering regardless of internet connectivity
2. Avoid CORS issues with font loading
3. Improve performance and reliability of the PDF generation process

## Font Sources

The fonts included here are sourced from Google Fonts with open source licenses:

- Roboto (Apache License 2.0)
- Montserrat (SIL Open Font License)
- Poppins (SIL Open Font License)
- Playfair Display (SIL Open Font License)

## Usage

These fonts are registered in the `ResumePDF.jsx` component for PDF generation. 