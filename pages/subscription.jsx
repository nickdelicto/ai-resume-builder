import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { prisma } from '../lib/prisma';

export default function SubscriptionPage({ dbPlans }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { resumeId } = router.query;
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState(dbPlans || []);
  
  // Redirect to sign in page if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/subscription');
    }
  }, [status, router]);
  
  // Auto-select the popular plan when plans are loaded
  useEffect(() => {
    if (plans && plans.length > 0) {
      const popularPlan = plans.find(plan => plan.popular);
      if (popularPlan) {
        setSelectedPlan(popularPlan.id);
      }
    }
  }, [plans]);
  
  // If no plans were provided by SSR, use these default plans
  useEffect(() => {
    if (!dbPlans || dbPlans.length === 0) {
      setPlans([
        {
          id: 'one-time',
          name: 'One-Time Download',
          price: '$6.99',
          interval: 'one-time',
          description: 'Make a single resume and download it once',
          features: [
            'One professional resume download',
            'ATS-optimized format',
            'All professional templates',
            'One time payment- No renewal!'
          ],
          popular: false,
          color: '#1a73e8'
        },
        {
          id: 'weekly',
          name: 'Short-Term Job Hunt',
          price: '$4.99',
          interval: 'weekly',
          description: 'Ideal for short-term job search',
          features: [
            'Unlimited resume downloads',
            'Create multiple versions',
            'All premium templates',
            'Best for short-term job search'
          ],
          popular: true,
          color: '#34a853'
        },
        {
          id: 'monthly',
          name: 'Long-Term Job Hunt',
          price: '$13.99',
          interval: 'monthly',
          description: 'Ideal for long-term job seekers',
          features: [
            'Unlimited resume downloads',
            'Tailor for multiple jobs',
            'All premium templates',
            'Best for long-term job search'
          ],
          popular: false,
          color: '#6c5ce7'
        }
      ]);
    }
  }, [dbPlans]);
  
  const handleContinue = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // First, save any pending resume data to the user's account
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
            console.log('Resume saved to account before checkout');
          }
        } catch (resumeError) {
          console.error('Error saving resume to account:', resumeError);
          // Continue with payment even if saving fails
        }
      }
      
      // Call API to create subscription
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }
      
      const data = await response.json();
      console.log('Checkout session created:', data);
      
      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error.message || 'An error occurred during payment processing');
      setIsProcessing(false);
    }
  };
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="container">
        <div style={{ 
          maxWidth: '800px', 
          margin: '80px auto', 
          padding: '40px', 
          textAlign: 'center',
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '20px' }}>
            Loading subscription options...
          </div>
        </div>
      </div>
    );
  }
  
  // If authenticated, show subscription options
  if (session) {
    return (
      <div className="container">
        <div style={{ 
          maxWidth: '1000px', 
          margin: '60px auto', 
          padding: '40px', 
          boxShadow: 'var(--shadow-md)', 
          borderRadius: '12px',
          background: 'white'
        }}>
          <h1 style={{ 
            fontSize: '32px', 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Choose Your Plan
          </h1>
          
          <p style={{
            fontSize: '18px',
            color: 'var(--text-medium)',
            textAlign: 'center',
            marginBottom: '40px',
            maxWidth: '700px',
            margin: '0 auto 40px'
          }}>
            Select a plan that fits your needs to download your professionally crafted resume
          </p>
          
          {error && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #feb2b2',
              color: '#c53030',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '25px',
            marginBottom: '40px'
          }}>
            {plans.map(plan => (
              <div 
                key={plan.id}
                style={{
                  border: `2px solid ${selectedPlan === plan.id ? plan.color : '#e9ecef'}`,
                  borderRadius: '12px',
                  padding: '30px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  background: selectedPlan === plan.id ? `${plan.color}0a` : 'white',
                  boxShadow: selectedPlan === plan.id ? '0 8px 20px rgba(0, 0, 0, 0.1)' : 'none',
                  transform: selectedPlan === plan.id ? 'translateY(-5px)' : 'none'
                }}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    right: '25px',
                    transform: 'translateY(-50%)',
                    background: plan.color,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    padding: '5px 12px',
                    borderRadius: '20px'
                  }}>
                    Popular
                  </div>
                )}
                
                <h3 style={{ 
                  fontSize: '22px', 
                  marginBottom: '5px',
                  color: plan.color
                }}>
                  {plan.name}
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ 
                    fontSize: '36px', 
                    fontWeight: 'bold',
                    color: 'var(--text-dark)'
                  }}>
                    {typeof plan.price === 'number' ? `$${plan.price.toFixed(2)}` : plan.price}
                  </span>
                  {plan.interval !== 'one-time' && (
                    <span style={{ 
                      fontSize: '16px',
                      color: 'var(--text-medium)'
                    }}>
                      /{plan.interval}
                    </span>
                  )}
                </div>
                
                <p style={{ 
                  fontSize: '16px',
                  color: 'var(--text-medium)',
                  marginBottom: '20px'
                }}>
                  {plan.description}
                </p>
                
                <ul style={{
                  listStyle: 'none',
                  padding: '0',
                  margin: '0 0 20px 0'
                }}>
                  {(Array.isArray(plan.features) ? plan.features : []).map((feature, index) => (
                    <li 
                      key={index}
                      style={{
                        padding: '8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-medium)'
                      }}
                    >
                      <span style={{ 
                        marginRight: '10px',
                        color: plan.color,
                        fontWeight: 'bold'
                      }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 'auto'
                }}>
                  <input
                    type="radio"
                    id={`plan-${plan.id}`}
                    name="plan"
                    checked={selectedPlan === plan.id}
                    onChange={() => setSelectedPlan(plan.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <label 
                    htmlFor={`plan-${plan.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    Select Plan
                  </label>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{
            textAlign: 'center',
            marginTop: '30px'
          }}>
            <button
              onClick={handleContinue}
              disabled={!selectedPlan || isProcessing}
              style={{
                background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)',
                color: 'white',
                border: 'none',
                padding: '16px 40px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: selectedPlan ? 'pointer' : 'not-allowed',
                opacity: selectedPlan ? 1 : 0.7,
                transition: 'all 0.3s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '200px'
              }}
            >
              {isProcessing ? (
                <>
                  <svg 
                    style={{ 
                      marginRight: '10px',
                      animation: 'spin 1s linear infinite'
                    }}
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24"
                  >
                    <style jsx>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }
                    `}</style>
                    <circle 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="white" 
                      strokeWidth="4" 
                      fill="none" 
                      strokeDasharray="30 60"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>
            
            <p style={{
              fontSize: '14px',
              color: 'var(--text-light)',
              marginTop: '20px'
            }}>
              Secured by <span style={{ fontWeight: 'bold' }}>Stripe</span> • Cancel anytime
            </p>
          </div>
          
          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: '#f8f9fa',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '16px',
              color: 'var(--text-medium)',
              marginBottom: '15px'
            }}>
              Not ready to subscribe? <Link href="/resume" style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                Return to resume builder
              </Link>
            </p>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-light)'
            }}>
              You won't be able to download your resume without a subscription
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Default return (should not be reached due to redirect)
  return null;
}

// Server-side code to fetch subscription plans
export async function getServerSideProps() {
  try {
    // Fetch subscription plans from the database
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
    });
    
    // Define the specific order we want (one-time, weekly, monthly)
    const orderMap = {
      'one-time': 1,
      'weekly': 2,
      'monthly': 3
    };
    
    // Transform the data for the client
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      interval: plan.interval,
      description: plan.description,
      features: plan.features,
      popular: plan.isPopular,
      color: plan.interval === 'one-time' ? '#1a73e8' : 
             plan.interval === 'weekly' ? '#34a853' : '#6c5ce7',
      order: orderMap[plan.interval] || 999 // Default high value for unknown intervals
    }));
    
    // Sort by our custom order
    const sortedPlans = formattedPlans.sort((a, b) => a.order - b.order);
    
    // Remove the order property before sending to client
    const cleanedPlans = sortedPlans.map(({ order, ...plan }) => plan);
    
    return {
      props: { 
        dbPlans: cleanedPlans 
      }
    };
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return {
      props: { 
        dbPlans: [] 
      }
    };
  }
} 