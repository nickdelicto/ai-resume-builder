import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Meta from '../components/common/Meta';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { data: _session } = useSession();
  const { session_id } = router.query;
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, success, error
  const [error, setError] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const [latestResume, setLatestResume] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Verify the payment when the page loads with a session_id
  useEffect(() => {
    if (!session_id || _session === null) return;
    
    const verifyPayment = async () => {
      setIsVerifying(true);
      
      try {
        // Save any pending resume data to the user's account
        const pendingResumeData = localStorage.getItem('modern_resume_data');
        if (pendingResumeData) {
          try {
            const resumeResponse = await fetch('/api/resume/save', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                data: JSON.parse(pendingResumeData),
                title: 'My Resume'
              }),
            });
            
            if (resumeResponse.ok) {
              console.log('Resume saved to account');
              // Clear the pending resume data
              localStorage.removeItem('modern_resume_data');
              localStorage.removeItem('pending_resume_download');
            }
          } catch (resumeError) {
            console.error('Error saving resume to account:', resumeError);
          }
        }

        // Get plan information
        const planResponse = await fetch(`/api/subscription/get-plan-info?session_id=${session_id}`);
        if (planResponse.ok) {
          const planData = await planResponse.json();
          setPlanInfo(planData);
          console.log('Plan info retrieved:', planData);
        }

        // Get latest resume for direct download
        const resumeResponse = await fetch('/api/resume/get-latest');
        if (resumeResponse.ok) {
          const resumeData = await resumeResponse.json();
          setLatestResume(resumeData);
          console.log('Latest resume retrieved:', resumeData.id);
        }
        
        // Payment already verified by the webhook, we don't need to verify again
        // Just show success message
        setVerificationStatus('success');
      } catch (error) {
        console.error('Error verifying payment:', error);
        setVerificationStatus('error');
        setError(error.message || 'Failed to verify payment. Please contact support.');
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyPayment();
  }, [session_id, _session]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (_session === null) {
      router.push('/auth/signin?callbackUrl=/payment-success');
    }
  }, [_session, router]);

  // Handle resume download
  const handleDownload = async () => {
    if (!latestResume) {
      toast.error('No resume found to download');
      return;
    }

    setIsDownloading(true);
    try {
      // Call the PDF generation API endpoint
      const response = await fetch('/api/test-pdf-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: latestResume.template || 'ats',
          resumeData: latestResume.data,
          resumeId: latestResume.id
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Get the PDF blob from the response
      const blob = await response.blob();
      
      // Create a blob URL and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resume-${latestResume.template || 'ats'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Resume downloaded successfully!');
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Show loading state while checking authentication
  if (_session === null || isVerifying) {
    return (
      <div className="container">
        <Meta
          title="Payment Processing | IntelliResume"
          description="Processing your payment for IntelliResume subscription."
          keywords="payment processing, subscription confirmation, resume builder payment"
        />
        <div style={{ 
          maxWidth: '600px', 
          margin: '80px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>
            {isVerifying ? 'Verifying your payment...' : 'Loading...'}
          </div>
          <div style={{ 
            display: 'inline-block',
            width: '30px',
            height: '30px',
            border: '3px solid rgba(0, 0, 0, 0.1)',
            borderTopColor: '#3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }
  
  // If verified successfully
  if (verificationStatus === 'success') {
    // Determine appropriate messaging based on plan type
    const isOneTime = planInfo?.plan?.interval === 'one-time';
    const planName = planInfo?.plan?.name || 'your plan';
    
    return (
      <div className="container">
        <Meta
          title="Payment Successful | IntelliResume"
          description="Your payment was successful. Your IntelliResume subscription is now active."
          keywords="payment success, subscription active, resume builder subscription"
        />
        <div style={{ 
          maxWidth: '600px', 
          margin: '80px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{ 
            fontSize: '56px', 
            marginBottom: '20px',
            color: '#34a853'
          }}>
            ✓
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            color: '#34a853',
            marginBottom: '20px'
          }}>
            Payment Successful!
          </h1>
          <p style={{ 
            fontSize: '18px',
            color: 'var(--text-medium)',
            marginBottom: '30px',
          }}>
            {isOneTime 
              ? `Thank you for your purchase. Your ${planName} resume is now available.`
              : `Thank you for your purchase. Your subscription to ${planName} has been activated.`
            }
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}>
            {latestResume && (
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #34a853, #28b485)',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(52, 168, 83, 0.25)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {isDownloading ? (
                  <>
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        marginRight: '8px',
                        animation: 'spin 1s linear infinite',
                        height: '16px',
                        width: '16px',
                        borderRadius: '50%',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTopColor: 'white',
                        verticalAlign: 'middle'
                      }}
                    />
                    Preparing PDF...
                  </>
                ) : (
                  'Download Your Resume'
                )}
              </button>
            )}
            <Link href="/profile" style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'white',
              color: '#1a73e8',
              border: '1px solid #1a73e8',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              View All Your Saved Resumes
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // If verification failed
  if (verificationStatus === 'error') {
    return (
      <div className="container">
        <Meta
          title="Payment Verification Failed | IntelliResume"
          description="There was an issue verifying your payment for IntelliResume."
          keywords="payment error, verification failed, payment issue"
        />
        <div style={{ 
          maxWidth: '600px', 
          margin: '80px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{ 
            fontSize: '56px', 
            marginBottom: '20px',
            color: '#ea4335'
          }}>
            ×
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            color: '#ea4335',
            marginBottom: '20px'
          }}>
            Verification Failed
          </h1>
          <p style={{ 
            fontSize: '18px',
            color: 'var(--text-medium)',
            marginBottom: '20px',
          }}>
            We couldn&apos;t verify your payment. If you&apos;ve been charged, please contact our support team.
          </p>
          {error && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #feb2b2',
              color: '#c53030',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}>
            <Link href="/subscription" style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(26, 115, 232, 0.25)',
              textAlign: 'center',
            }}>
              Try Again
            </Link>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'white',
              color: '#1a73e8',
              border: '1px solid #1a73e8',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback UI while in "pending" state
  return (
    <div className="container">
      <div style={{ 
        maxWidth: '600px', 
        margin: '80px auto', 
        padding: '40px', 
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)', 
        borderRadius: '12px',
        background: 'white'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '20px' }}>
          Checking payment status...
        </div>
        <div style={{ 
          display: 'inline-block',
          width: '30px',
          height: '30px',
          border: '3px solid rgba(0, 0, 0, 0.1)',
          borderTopColor: '#3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
} 