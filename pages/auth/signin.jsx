import { getProviders, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

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

  return (
    <div className="container">
      <div style={{ 
        maxWidth: '900px', 
        margin: '60px auto', 
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Benefits panel */}
        <div style={{
          flex: '1 1 400px',
          background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)',
          padding: '40px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '20px' }}>
            {title}
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '30px', lineHeight: '1.6' }}>
            {description}
          </p>
          
          <div style={{ margin: '30px 0' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '15px' }}>
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
                  marginBottom: '12px', 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '16px'
                }}>
                  <span style={{ 
                    marginRight: '10px', 
                    fontWeight: 'bold', 
                    fontSize: '18px' 
                  }}>✓</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          
          {isPendingDownload && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              marginTop: '20px'
            }}>
              <p style={{ fontSize: '16px', fontWeight: '500' }}>
                Your resume is ready and waiting! Sign in to download it now.
              </p>
            </div>
          )}
        </div>
        
        {/* Sign-in form panel */}
        <div style={{ 
          flex: '1 1 350px', 
          padding: '40px',
          background: 'white'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>Sign In</h2>
          
          {/* Email Sign In */}
          <div style={{ marginBottom: '20px' }}>
            <form onSubmit={(e) => {
              e.preventDefault();
              signIn('email', { email, callbackUrl: callbackUrl || '/profile' });
            }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  marginBottom: '15px',
                  fontSize: '16px'
                }}
              />
              <button 
                type="submit"
                className="btn btn-primary"
                style={{ 
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600'
                }}
              >
                Continue with Email
              </button>
            </form>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            margin: '25px 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
            <span style={{ padding: '0 10px', color: 'var(--text-light)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
          </div>
          
          {/* Social Providers */}
          {Object.values(providers || {}).filter(provider => provider.id !== 'email').map((provider) => (
            <div key={provider.name} style={{ marginBottom: '15px' }}>
              <button
                onClick={() => signIn(provider.id, { callbackUrl: callbackUrl || '/profile' })}
                className="btn btn-secondary"
                style={{ 
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px'
                }}
              >
                Continue with {provider.name}
              </button>
            </div>
          ))}
          
          <p style={{ 
            textAlign: 'center', 
            marginTop: '25px',
            fontSize: '14px',
            color: 'var(--text-light)'
          }}>
            By signing in, you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--primary-blue)' }}>
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" style={{ color: 'var(--primary-blue)' }}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const providers = await getProviders();
  return {
    props: { providers },
  };
} 