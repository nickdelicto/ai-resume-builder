import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Character encoding */}
        <meta charSet="utf-8" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://intelliresume.net/" />
        <meta property="og:title" content="IntelliResume - Intelligent AI Resume Builder" />
        <meta property="og:description" content="Create professional, ATS-optimized resumes with our intelligent AI-powered resume builder. Tailored for specific job applications." />
        <meta property="og:image" content="https://intelliresume.net/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://intelliresume.net/" />
        <meta property="twitter:title" content="IntelliResume - Intelligent AI Resume Builder" />
        <meta property="twitter:description" content="Create professional, ATS-optimized resumes with our intelligent AI-powered resume builder. Tailored for specific job applications." />
        <meta property="twitter:image" content="https://intelliresume.net/og-image.png" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://intelliresume.net" />
        
        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 