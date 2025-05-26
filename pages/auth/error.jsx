import Link from 'next/link';
import { useRouter } from 'next/router';

/**
 * Auth error page with explanations for common auth problems
 */
export default function ErrorPage() {
  const router = useRouter();
  const { error } = router.query;
  
  // Error messages map
  const errors = {
    Configuration: {
      title: "Server Error",
      message: "There is a problem with the server configuration. Contact support for assistance.",
    },
    AccessDenied: {
      title: "Access Denied",
      message: "You do not have permission to sign in.",
    },
    Verification: {
      title: "Link Expired",
      message: "The sign in link you used has expired or has already been used.",
    },
    default: {
      title: "Authentication Error",
      message: "An error occurred during authentication. Please try again.",
    },
  };
  
  // Get error details or use default if not found
  const errorDetails = errors[error] || errors.default;

  return (
    <div className="container">
      <div style={{ 
        maxWidth: '500px', 
        margin: '80px auto', 
        padding: '40px', 
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)', 
        borderRadius: '12px',
        background: 'white'
      }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>
          ⚠️
        </div>
        
        <h1 style={{ marginBottom: '20px' }}>{errorDetails.title}</h1>
        
        <p style={{ marginBottom: '30px', color: 'var(--text-medium)' }}>
          {errorDetails.message}
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <Link href="/auth/signin" className="btn btn-primary">
            Try Again
          </Link>
          <Link href="/" className="btn btn-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
} 