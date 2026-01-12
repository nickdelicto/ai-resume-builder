import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Analytics (GA + Clarity) moved to _app.jsx with next/script for deferred loading */}
        
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
        <meta property="og:title" content="IntelliResume Health - Free RN-Only Job Board" />
        <meta property="og:description" content="Find your next RN job here. Free RN-only Job Board! Direct nursing positions from top hospitals nationwide." />
        <meta property="og:image" content="https://intelliresume.net/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://intelliresume.net/" />
        <meta property="twitter:title" content="IntelliResume Health - Free RN-Only Job Board" />
        <meta property="twitter:description" content="Find your next RN job here. Free RN-only Job Board! Direct nursing positions from top hospitals nationwide." />
        <meta property="twitter:image" content="https://intelliresume.net/og-image.png" />
        
        {/* Note: Canonical URLs are handled per-page via Meta.jsx component */}
        
        {/* Fonts: Figtree is now self-hosted via next/font in _app.jsx */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
} 