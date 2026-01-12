import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';
import Navigation from '../components/common/Navigation';
import Footer from '../components/common/Footer';
import { useRouter } from 'next/router';
import { ResumeServiceProvider } from '../lib/contexts/ResumeServiceContext';
import { Toaster } from 'react-hot-toast';
import React from 'react';
import ResumeSelectionProvider from '../components/common/ResumeSelectionProvider';
import StructuredData from '../components/common/StructuredData';
import Head from 'next/head';
import Script from 'next/script';
import { Figtree } from 'next/font/google';

// Self-hosted Figtree font (downloaded at build time, no render-blocking)
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-figtree',
});

// Simple error boundary component to handle context errors gracefully
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container" style={{ 
          padding: '20px', 
          maxWidth: '600px', 
          margin: '40px auto',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#e53e3e' }}>Something went wrong</h2>
          <p>We encountered an issue loading the application. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              backgroundColor: '#3182ce',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '12px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Check if the current page is the builder page
  // We'll use this to adjust padding for pages with the navigation
  const isBuilderPage = router.pathname === '/new-resume-builder' || 
                       router.pathname.startsWith('/resume/edit/');
  
  // Check if this is the PDF template capture page - don't render Navigation for it
  const isPdfCapturePage = router.pathname === '/resume-template-capture';
  
  return (
    <SessionProvider session={pageProps.session}>
      <ErrorBoundary>
        <ResumeServiceProvider>
          <ResumeSelectionProvider>
            <Head>
              {/* Default meta tags that can be overridden by individual pages */}
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <meta name="description" content="IntelliResume - Intelligent AI-powered resume builder that creates professional, ATS-optimized resumes tailored for specific job applications." />
              {/* Structured Data for SEO */}
              <StructuredData />
            </Head>
          <div className={`app-wrapper ${figtree.variable} ${figtree.className}`}>
          {!isPdfCapturePage && <Navigation />}
          <div className={`app-container ${isBuilderPage ? 'pt-14' : isPdfCapturePage ? 'pt-0' : 'pt-20'}`}>
            <Component {...pageProps} />
            </div>
            {!isPdfCapturePage && <Footer />}
          </div>
          
          <style jsx global>{`
            .app-wrapper {
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            
            .app-container {
              flex: 1 0 auto;
            }
              
              /* Hide reCAPTCHA badge except on contact page */
              .grecaptcha-badge {
                visibility: hidden !important;
                opacity: 0 !important;
              }
              
              /* Only show badge on contact page */
              body.contact-page .grecaptcha-badge {
                visibility: visible !important;
                opacity: 1 !important;
              }
          `}</style>
          
          <Toaster position="bottom-center" />

          {/* Deferred Analytics - loads after page is interactive */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
            `}
          </Script>
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "u9wvv8gym2");
            `}
          </Script>
          </ResumeSelectionProvider>
        </ResumeServiceProvider>
      </ErrorBoundary>
    </SessionProvider>
  );
} 