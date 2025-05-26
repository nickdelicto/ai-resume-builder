import Link from 'next/link';

export default function VerifyRequest() {
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
          ✉️
        </div>
        
        <h1 style={{ marginBottom: '20px' }}>Check your email</h1>
        
        <p style={{ marginBottom: '20px', color: 'var(--text-medium)' }}>
          A sign in link has been sent to your email address.
          Please check your inbox (and spam folder) and click the link to sign in.
        </p>
        
        <div style={{ marginTop: '30px' }}>
          <Link href="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 