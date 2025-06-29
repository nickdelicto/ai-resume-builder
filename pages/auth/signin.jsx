import { getProviders, signIn } from 'next-auth/react';
import { useState } from 'react';
// import { useEffect } from 'react'; // Unused import
import Link from 'next/link';
import { useRouter } from 'next/router';
import { markLocalStorageForMigration } from '../../components/ModernResumeBuilder/ModernResumeBuilder';
import Head from 'next/head';

/**
 * Enhanced sign-in page that offers email and social login options
 * with clear benefits highlighting and support for resuming downloads
 */
export default function SignIn({ providers }) {
  const [email, setEmail] = useState('');
  const router = useRouter();
  const { action, callbackUrl } = router.query;
  const isPendingDownload = action === 'download';
  
  // Check for specific messages based on where the user came from
  const getActionMessage = () => {
    if (isPendingDownload) {
      return {
        title: "One Step Away From Your Perfect Resume!",
        description: "Sign in to download your professionally crafted resume and save it for future edits."
      };
    }
    return {
      title: "Welcome Back",
      description: "Sign in to access your saved resumes and continue building your career."
    };
  };
  
  const { title, description } = getActionMessage();

  // Handler for email sign in
  const handleEmailSignIn = (e) => {
    e.preventDefault();
    // Mark data for migration before signing in
    markLocalStorageForMigration();
    
    // Store the original callback URL in localStorage if it's not /profile
    // This will be used after authentication to redirect to the correct page if needed
    if (typeof window !== 'undefined' && callbackUrl && !callbackUrl.startsWith('/profile')) {
      localStorage.setItem('post_auth_redirect', callbackUrl);
      localStorage.setItem('auth_action', action || '');
    }
    
    // Always redirect to profile page after authentication
    // The profile page will handle further redirects based on subscription status
    const profileRedirect = '/profile?migrate=true';
    if (action === 'download') {
      localStorage.setItem('pending_resume_download', 'true');
    }
    
    signIn('email', { email, callbackUrl: profileRedirect });
  };

  // Handler for social sign in
  const handleSocialSignIn = (providerId) => {
    // Mark data for migration before signing in
    markLocalStorageForMigration();
    
    // Store the original callback URL in localStorage if it's not /profile
    // This will be used after authentication to redirect to the correct page if needed
    if (typeof window !== 'undefined' && callbackUrl && !callbackUrl.startsWith('/profile')) {
      localStorage.setItem('post_auth_redirect', callbackUrl);
      localStorage.setItem('auth_action', action || '');
    }
    
    // Always redirect to profile page after authentication
    // The profile page will handle further redirects based on subscription status
    const profileRedirect = '/profile?migrate=true';
    if (action === 'download') {
      localStorage.setItem('pending_resume_download', 'true');
    }
    
    signIn(providerId, { callbackUrl: profileRedirect });
  };

  return (
    <>
      <Head>
        <title>{isPendingDownload ? "Download Your Resume" : "Sign In"} | IntelliResume</title>
      </Head>
    <div className="container">
      <div style={{ 
          maxWidth: '1000px', 
        margin: '60px auto', 
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
          borderRadius: '16px',
        overflow: 'hidden',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
          background: '#fff'
      }}>
        {/* Benefits panel */}
        <div style={{
            flex: '1 1 420px',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            padding: '50px 40px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Abstract background shapes */}
            <div style={{
              position: 'absolute',
              top: '10%',
              right: '-50px',
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              zIndex: 0
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '5%',
              left: '-30px',
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              zIndex: 0
            }}></div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h1 style={{ 
                fontSize: '32px', 
                fontWeight: '800', 
                marginBottom: '20px',
                background: 'linear-gradient(90deg, #ffffff, #e2e8ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
            {title}
          </h1>
              <p style={{ 
                fontSize: '18px', 
                marginBottom: '35px', 
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.9)',
                maxWidth: '90%'
              }}>
            {description}
          </p>
          
          <div style={{ margin: '30px 0' }}>
                <h2 style={{ 
                  fontSize: '22px', 
                  fontWeight: '600', 
                  marginBottom: '20px',
                  color: '#ffffff'
                }}>
              Why Create an Account?
            </h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                "Save your resumes for future edits and updates",
                "Access your resumes from any device, anytime",
                "Easily tailor saved resumes for different job applications",
                "Track your application progress and success",
                isPendingDownload ? "Download your professionally crafted resume" : "Premium templates and features"
              ].map((benefit, i) => (
                <li key={i} style={{ 
                      marginBottom: '16px', 
                  display: 'flex', 
                      alignItems: 'flex-start',
                  fontSize: '16px'
                }}>
                  <span style={{ 
                        marginRight: '12px',
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                  }}>✓</span>
                      <span style={{ opacity: 0.95 }}>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {isPendingDownload && (
            <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '25px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}>
                  <p style={{ 
                    fontSize: '16px', 
                    fontWeight: '500',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4ade80',
                      marginRight: '10px',
                      boxShadow: '0 0 0 3px rgba(74, 222, 128, 0.3)'
                    }}></span>
                Your resume is ready and waiting! Sign in to download it now.
              </p>
            </div>
          )}
            </div>
        </div>
        
        {/* Sign-in form panel */}
        <div style={{ 
            flex: '1 1 380px', 
            padding: '50px 40px',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        }}>
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '35px', 
              fontSize: '28px',
              color: '#1e293b',
              fontWeight: '700'
            }}>
              Sign In
            </h2>
            
            {/* Social Providers */}
            {Object.values(providers || {}).filter(provider => provider.id !== 'email').map((provider) => (
              <div key={provider.name} style={{ marginBottom: '15px' }}>
                <button
                  onClick={() => handleSocialSignIn(provider.id)}
                  className="btn btn-secondary"
                  style={{ 
                    width: '100%',
                    padding: '14px',
                    fontSize: '16px',
                    borderRadius: '10px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px'
                  }}>
                    {provider.id === 'google' && (
                      <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"/>
                      </svg>
                    )}
                  </span>
                  Continue with {provider.name}
                </button>
              </div>
            ))}
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              margin: '30px 0'
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              <span style={{ padding: '0 15px', color: '#94a3b8', fontSize: '14px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            </div>
          
          {/* Email Sign In */}
            <div style={{ marginBottom: '25px' }}>
            <form onSubmit={handleEmailSignIn}>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  width: '100%',
                      padding: '16px',
                      paddingLeft: '16px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '16px',
                      transition: 'all 0.2s ease',
                      backgroundColor: '#f8fafc',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.border = '1px solid #2563eb'}
                    onBlur={(e) => e.target.style.border = '1px solid #e2e8f0'}
                  />
                </div>
              <button 
                type="submit"
                className="btn btn-primary"
                style={{ 
                  width: '100%',
                    padding: '16px',
                  fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '10px',
                    background: 'linear-gradient(to right, #2563eb, #4f46e5)',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 15px rgba(79, 70, 229, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
                }}
              >
                Continue with Email
              </button>
            </form>
          </div>
          
          <p style={{ 
            textAlign: 'center', 
              marginTop: '30px',
            fontSize: '14px',
              color: '#94a3b8'
          }}>
            By signing in, you agree to our{' '}
              <Link href="/terms" style={{ 
                color: '#2563eb',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
              Terms of Service
            </Link>{' '}
            and{' '}
              <Link href="/privacy" style={{ 
                color: '#2563eb',
                fontWeight: '500',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
              >
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return {
    props: { providers },
  };
} 