import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const NewBuilderPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new-resume-builder page but add a mode parameter
    // This preserves existing functionality while giving us a cleaner URL
    router.replace('/new-resume-builder?mode=builder');
  }, [router]);

  return (
    <>
      <Head>
        <title>Resume Builder | Starting New Resume</title>
        <meta name="description" content="Create a new professional resume from scratch" />
      </Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1a73e8', marginBottom: '1rem' }}>Loading Resume Builder</h2>
          <p>Please wait while we prepare your resume builder...</p>
        </div>
      </div>
    </>
  );
};

export default NewBuilderPage; 