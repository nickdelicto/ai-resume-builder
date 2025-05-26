import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const TargetBuilderPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    if (router.isReady) {
      // Preserve any query parameters when redirecting
      const query = {...router.query};
      
      // Redirect to the existing job targeting page while maintaining all query parameters
      router.replace({
        pathname: '/job-targeting',
        query
      });
    }
  }, [router, router.isReady]);

  return (
    <>
      <Head>
        <title>Resume Builder | Job Targeting</title>
        <meta name="description" content="Tailor your resume for a specific job" />
      </Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1a73e8', marginBottom: '1rem' }}>Loading Job Targeting Tool</h2>
          <p>Please wait while we prepare the job targeting tool...</p>
        </div>
      </div>
    </>
  );
};

export default TargetBuilderPage; 