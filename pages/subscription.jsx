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
  const { resumeId, action } = router.query;
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState(dbPlans || []);
  // New state for active subscription
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  
  // Check if user is here to download a resume
  const isPendingDownload = action === 'download';
  
  // Redirect to sign in page if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/subscription');
    }
  }, [status, router]);

  // Fetch active subscription when the page loads
  useEffect(() => {
    const fetchActiveSubscription = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      setIsLoadingSubscription(true);
      try {
        const response = await fetch('/api/subscription/get-active');
        const data = await response.json();
        
        if (data.success && data.subscription) {
          console.log('Active subscription found:', data.subscription);
          setActiveSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Error fetching active subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };
    
    fetchActiveSubscription();
  }, [status, session]);
  
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
  
  // Function to determine if user is trying to subscribe to the same plan they already have
  const isCurrentPlan = (planId) => {
    return activeSubscription && activeSubscription.planId === planId;
  };
  
  // Function to determine if a plan is an upgrade from current plan
  const isPlanUpgrade = (planId) => {
    if (!activeSubscription) return false;
    
    // Only consider weekly -> monthly as an upgrade
    return activeSubscription.planId === 'weekly' && planId === 'monthly';
  };
  
  // Function to determine if a plan is a downgrade from current plan
  const isPlanDowngrade = (planId) => {
    if (!activeSubscription) return false;
    
    // Only consider monthly -> weekly as a downgrade
    return activeSubscription.planId === 'monthly' && planId === 'weekly';
  };
  
  // Function to format date in a readable way
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  const handleContinue = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Prepare metadata to pass through Stripe
      const metadata = {};
      
      // If this is a download action, add it to metadata
      if (isPendingDownload) {
        metadata.action = 'download';
      }
      
      // If user is upgrading or downgrading, add the current subscription ID
      if ((isPlanUpgrade(selectedPlan) || isPlanDowngrade(selectedPlan)) && activeSubscription) {
        metadata.previousSubscriptionId = activeSubscription.id;
        metadata.isUpgrade = isPlanUpgrade(selectedPlan);
        metadata.isDowngrade = isPlanDowngrade(selectedPlan);
      }
      
      // Call API to create subscription
      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan,
          metadata: metadata,
          successUrl: `${window.location.origin}/profile?payment=success${isPendingDownload ? '&download=true' : ''}`
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
    // Check if user already has an active weekly or monthly subscription
    const hasActiveRecurringPlan = activeSubscription && 
      (activeSubscription.planId === 'weekly' || activeSubscription.planId === 'monthly') && 
      !isLoadingSubscription;
    
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
            {isPendingDownload 
              ? 'One Last Step to Download Your Resume' 
              : 'Choose Your Plan'}
          </h1>
          
          {/* Show active subscription banner if user has an active recurring plan */}
          {hasActiveRecurringPlan && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.05), rgba(46, 204, 113, 0.1))',
              border: '1px solid rgba(52, 168, 83, 0.2)',
              borderRadius: '12px',
              padding: '22px 28px',
              marginBottom: '30px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px'
          }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flex: '1'
              }}>
                <div style={{
                  background: 'rgba(52, 168, 83, 0.15)',
                  borderRadius: '50%',
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '17px', 
                    color: '#2d3748',
                    fontWeight: '600',
                    lineHeight: '1.3'
                  }}>
                    Your <strong>{activeSubscription.planName}</strong> Subscription is Active
                  </h3>
                  <p style={{ 
                    margin: 0,
                    fontSize: '14px', 
                    color: '#4a5568'
                  }}>
                    Renews on {formatDate(activeSubscription.currentPeriodEnd)}
                    {activeSubscription.isCanceled && " (Canceled)"}
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <Link href="/profile" style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  background: 'white',
                  color: '#34a853',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                  Return to Profile
                </Link>
              </div>
            </div>
          )}
          
          {isPendingDownload && (
            <div style={{
              background: '#f0f7ff',
              border: '1px solid #cce5ff',
              borderRadius: '8px',
              padding: '15px 20px',
              marginBottom: '30px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '16px', color: '#0066cc' }}>
                <strong>Select a plan</strong> to
                download your resume & create unlimited versions for different job applications.
              </p>
            </div>
          )}
          
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
            {plans.map(plan => {
              // Skip one-time plan if user has active recurring plan
              if (hasActiveRecurringPlan && plan.id === 'one-time') {
                return null;
              }
              
              // Determine the plan status for UI display
              const isCurrentActivePlan = isCurrentPlan(plan.id);
              const isUpgrade = isPlanUpgrade(plan.id);
              const isDowngrade = isPlanDowngrade(plan.id);
              
              return (
              <div 
                key={plan.id}
                style={{
                  border: `2px solid ${selectedPlan === plan.id ? plan.color : '#e9ecef'}`,
                  borderRadius: '12px',
                  padding: '30px',
                  transition: 'all 0.3s ease',
                    cursor: isCurrentActivePlan ? 'default' : 'pointer',
                  position: 'relative',
                    background: isCurrentActivePlan 
                      ? 'rgba(52, 168, 83, 0.05)' 
                      : selectedPlan === plan.id 
                        ? `${plan.color}0a` 
                        : 'white',
                  boxShadow: selectedPlan === plan.id ? '0 8px 20px rgba(0, 0, 0, 0.1)' : 'none',
                    transform: selectedPlan === plan.id ? 'translateY(-5px)' : 'none',
                    opacity: isCurrentActivePlan ? 0.85 : 1
                }}
                  onClick={() => !isCurrentActivePlan && setSelectedPlan(plan.id)}
              >
                  {plan.popular && !isCurrentActivePlan && (
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
                  
                  {isCurrentActivePlan && (
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '25px',
                      transform: 'translateY(-50%)',
                      background: '#34a853',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '5px 12px',
                      borderRadius: '20px'
                    }}>
                      Current Plan
                    </div>
                  )}
                  
                  {isUpgrade && (
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '25px',
                      transform: 'translateY(-50%)',
                      background: '#6c5ce7',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '5px 12px',
                      borderRadius: '20px'
                    }}>
                      Upgrade
                    </div>
                  )}
                  
                  {isDowngrade && (
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '25px',
                      transform: 'translateY(-50%)',
                      background: '#f39c12',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      padding: '5px 12px',
                      borderRadius: '20px'
                    }}>
                      Downgrade
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
                    {isCurrentActivePlan ? (
                      <span style={{ 
                        color: '#34a853',
                        fontWeight: '500',
                        fontSize: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Currently Active
                      </span>
                    ) : (
                      <>
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
                          {isUpgrade ? 'Upgrade to This Plan' : 
                           isDowngrade ? 'Switch to This Plan' : 
                           'Select Plan'}
                  </label>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={{
            textAlign: 'center',
            marginTop: '30px'
          }}>
            {hasActiveRecurringPlan && selectedPlan && (
              <div style={{
                maxWidth: '600px',
                margin: '0 auto 25px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
                border: isPlanUpgrade(selectedPlan) ? '1px solid rgba(52, 168, 83, 0.2)' : '1px solid rgba(243, 156, 18, 0.2)'
              }}>
                <div style={{
                  padding: '14px 20px',
                  background: isPlanUpgrade(selectedPlan) 
                    ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))' 
                    : 'linear-gradient(135deg, rgba(243, 156, 18, 0.1), rgba(230, 126, 34, 0.1))',
                  borderBottom: isPlanUpgrade(selectedPlan) 
                    ? '1px solid rgba(52, 168, 83, 0.15)' 
                    : '1px solid rgba(243, 156, 18, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isPlanUpgrade(selectedPlan) ? 'rgba(52, 168, 83, 0.15)' : 'rgba(243, 156, 18, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isPlanUpgrade(selectedPlan) ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34a853" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    )}
                  </div>
                  <h4 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isPlanUpgrade(selectedPlan) ? '#2d8a4e' : '#b7791f'
                  }}>
                    {isPlanUpgrade(selectedPlan) ? 'You\'re upgrading from Weekly to Monthly plan' : 'You\'re downgrading from Monthly to Weekly plan'}
                  </h4>
                </div>
                
                <div style={{
                  padding: '16px 20px',
                  background: 'white'
                }}>
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#4a5568'
                  }}>
                    <strong>What happens next:</strong>
                  </p>
                  
                  <ul style={{
                    margin: '0 0 0 20px',
                    padding: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#4a5568'
                  }}>
                    <li style={{ marginBottom: '8px' }}>
                      Your current plan will be canceled immediately
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                      You'll be charged now for the new {isPlanUpgrade(selectedPlan) ? 'Monthly' : 'Weekly'} plan
                    </li>
                    <li>
                      Your billing cycle will reset to today
                    </li>
                  </ul>
                </div>
              </div>
            )}
            
            <button
              onClick={handleContinue}
              disabled={!selectedPlan || isProcessing || isCurrentPlan(selectedPlan)}
              style={{
                background: 'linear-gradient(135deg, #1a73e8, #6c5ce7)',
                color: 'white',
                border: 'none',
                padding: '16px 40px',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: selectedPlan && !isCurrentPlan(selectedPlan) ? 'pointer' : 'not-allowed',
                opacity: selectedPlan && !isCurrentPlan(selectedPlan) ? 1 : 0.7,
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
                isPlanUpgrade(selectedPlan) ? 'Upgrade Plan' : 
                isPlanDowngrade(selectedPlan) ? 'Switch Plan' : 
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
              Not ready to subscribe yet? <Link href="/profile" style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>
                Return to my profile
              </Link>
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