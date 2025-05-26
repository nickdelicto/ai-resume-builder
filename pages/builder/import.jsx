import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ImportBuilderPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    if (router.isReady) {
      // Preserve any query parameters when redirecting
      const query = {...router.query};
      
      // Redirect to the existing import page while maintaining all query parameters
      router.replace({
        pathname: '/resume-import',
        query
      });
    }
  }, [router, router.isReady]);

  return (
    <>
      <Head>
        <title>Resume Builder | Import Resume</title>
        <meta name="description" content="Import your existing resume to enhance it" />
      </Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1a73e8', marginBottom: '1rem' }}>Loading Resume Import</h2>
          <p>Please wait while we prepare the resume import tool...</p>
        </div>
      </div>
    </>
  );
};

export default ImportBuilderPage; 