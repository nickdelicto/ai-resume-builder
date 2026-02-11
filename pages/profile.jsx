import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useResumeSelection } from '../components/common/ResumeSelectionProvider';
import { usePaywall } from '../components/common/PaywallModal';
import Meta from '../components/common/Meta';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [resumeCount, setResumeCount] = useState(0);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  const { payment, download } = router.query;
  
  // New state to track migration completion
  const [migrationCompleted, setMigrationCompleted] = useState(false);
  
  // State for subscription redirect
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const countdownRef = useRef(null);
  
  // Modified: Use sessionStorage for resume saved message to prevent it from persisting across page loads
  const isInitialRender = useRef(true);
  
  // State for resume name editing
  const [editingResumeId, setEditingResumeId] = useState(null);
  const [editingResumeName, setEditingResumeName] = useState('');
  const [isValidatingName, setIsValidatingName] = useState(false);
  const [nameValidationError, setNameValidationError] = useState('');
  
  // State for delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for duplicating
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  // Check if user is an admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Add new state for payment success resume
  const [paymentSuccessResume, setPaymentSuccessResume] = useState(null);
  
  // Add state to track if user has an active subscription
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  
  // Add state for subscription details
  const [subscriptionDetails, setSubscriptionDetails] = useState({
    planName: 'Free Plan',
    expirationDate: null,
    isCanceled: false,
    canceledButActive: false
  });
  
  // Add state to track which resume is currently being downloaded
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  
  // Add state to track which resume IDs are eligible for download with existing plans
  const [eligibleResumeIds, setEligibleResumeIds] = useState([]);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // Track if user has a free download available
  const [isFreeDownload, setIsFreeDownload] = useState(false);
  
  // Add state for screen size
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  
  // Add state for subscription cancellation
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState(null);
  
  // State for cancellation feedback
  const [showCancelFeedback, setShowCancelFeedback] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [missingFeaturesReason, setMissingFeaturesReason] = useState('');
  const [betterAlternativeReason, setBetterAlternativeReason] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  // State for discount offer
  const [showDiscountOffer, setShowDiscountOffer] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  
  // Add state for discount info
  const [discountInfo, setDiscountInfo] = useState(null);
  const [hasEverUsedRetentionDiscount, setHasEverUsedRetentionDiscount] = useState(false);
  
  // State variables for resume tailoring functionality
  const [showTailorModal, setShowTailorModal] = useState(false);
  const [tailoringResumeId, setTailoringResumeId] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isTailoring, setIsTailoring] = useState(false);
  
  // State for mobile tooltips
  const [activeTooltip, setActiveTooltip] = useState(null);
  
  // Post-auth loading animation (3.5s nursing animation, then force-fetch resumes)
  const [showPostAuthLoading, setShowPostAuthLoading] = useState(false);
  const postAuthCheckDone = useRef(false);

  useEffect(() => {
    if (status === 'authenticated' && !postAuthCheckDone.current) {
      postAuthCheckDone.current = true;
      if (typeof window !== 'undefined' && !sessionStorage.getItem('profile_loaded')) {
        sessionStorage.setItem('profile_loaded', 'true');
        setShowPostAuthLoading(true);
      }
    }
  }, [status]);

  useEffect(() => {
    if (!showPostAuthLoading) return;
    const timer = setTimeout(() => {
      setShowPostAuthLoading(false);
      fetchUserResumes();
    }, 3500);
    return () => clearTimeout(timer);
  }, [showPostAuthLoading]);

  const { navigateToPricing } = useResumeSelection();
  const { showPaywall } = usePaywall();

  // Check creation eligibility before creating a new resume
  const handleCreateNewResume = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/resume/check-creation-eligibility');
      const data = await res.json();
      if (!data.eligible) {
        showPaywall('resume_creation');
        return;
      }
    } catch (err) {
      console.error('Error checking creation eligibility:', err);
    }
    router.push('/nursing-resume-builder');
  };

  // Handle pricing navigation
  const handlePricingNavigation = (e) => {
    e.preventDefault();
    // Pass true for forceModal to ensure the resume selection modal always opens
    navigateToPricing('/subscription', true);
  };
  
  // Effect to handle screen size changes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 600);
    };
    
    // Initial check
    checkScreenSize();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Redirect to sign in page if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);
  
  // Handle payment success and download parameters
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      // Handle successful payment with download request
      if (payment === 'success' && download === 'true') {
        toast.success('Payment successful! Your subscription is now active.');
        
        // Find the most recent subscription with download action
        const fetchMostRecentResume = async () => {
          try {
            // Get the most recent subscription that has a download action
            const subscriptionResponse = await fetch('/api/subscription/get-latest');
            const subscriptionData = await subscriptionResponse.json();
            
            if (subscriptionData.success && subscriptionData.subscription?.metadata?.mostRecentResumeId) {
              const resumeId = subscriptionData.subscription.metadata.mostRecentResumeId;
              
              // Fetch the resume details to display
              const resumeResponse = await fetch(`/api/resume/get?id=${resumeId}`);
              if (resumeResponse.ok) {
                const resumeData = await resumeResponse.json();
                
                // Set state to show the resume details in the success section
                setPaymentSuccessResume({
                  id: resumeId,
                  title: resumeData.resume.title,
                  template: resumeData.resume.template
                });
              }
              
              toast.success('You can now download your resume!', {
                duration: 5000,
                icon: '📄'
              });
            } else {
              // If no specific resume was found, just show a generic message
              toast.success('You can now create and download resumes!', {
                duration: 5000,
                icon: '📄'
              });
              
              // Fetch the user's most recent resume if available
              try {
                const resumesResponse = await fetch('/api/resume/list');
                if (resumesResponse.ok) {
                  const resumesData = await resumesResponse.json();
                  if (resumesData.resumes && resumesData.resumes.length > 0) {
                    // Get the most recent resume
                    const mostRecentResume = resumesData.resumes[0];
                    setPaymentSuccessResume({
                      id: mostRecentResume.id,
                      title: mostRecentResume.title,
                      template: mostRecentResume.template || 'ats'
                    });
                  }
                }
              } catch (error) {
                console.error('Error fetching most recent resume:', error);
              }
            }
          } catch (error) {
            console.error('Error fetching most recent resume:', error);
            // Show generic success message on error
            toast.success('Your subscription is active. You can now download resumes!');
          }
        };
        
        fetchMostRecentResume();
        
        // Remove the query parameters from the URL to prevent showing the message again on refresh
        router.replace('/profile', undefined, { shallow: true });
      }
      // Handle just successful payment without download
      else if (payment === 'success') {
        toast.success('Payment successful! Your subscription is now active.');
        
        // Remove the query parameters from the URL
        router.replace('/profile', undefined, { shallow: true });
      }
    }
  }, [status, session, router, payment, download]);
  
  // Check for localStorage resume data and pending download
  useEffect(() => {
    let messageTimer;
    
    if (status === 'authenticated' && session?.user?.id) {
      const hasPendingDownload = localStorage.getItem('pending_resume_download') === 'true';
      
      // Only handle the specific download flow - general migration is handled by AuthGuard
      if (hasPendingDownload) {
        // Clear the pending download flag
        localStorage.removeItem('pending_resume_download');
        
        // IMPORTANT: Clear any post-auth redirect when we have a pending download
        // This ensures we stay on the profile page to check subscription status
        localStorage.removeItem('post_auth_redirect');
        localStorage.removeItem('auth_action');
        
        // Set flag to show success message - the actual migration happens in AuthGuard
        setHasSavedResume(true);
        
        // Set a timer to hide the message after 5 seconds
        messageTimer = setTimeout(() => {
          setHasSavedResume(false);
        }, 5000);
        
        // Don't check subscription eligibility if we just came from a successful payment
        if (payment === 'success') {
          console.log('User just completed payment, skipping eligibility check');
          toast.success('Your resume has been saved to your account!');
          setMigrationCompleted(true);
          return;
        }
        
        // Check if user has an active subscription before redirecting
        const checkSubscription = async () => {
          if (status !== 'authenticated' || !session?.user?.id) return;
          
          try {
            console.log('Checking subscription status...');
            const response = await fetch('/api/resume/check-download-eligibility');
            const data = await response.json();
            
            // Add debugging logs for one-time plan testing
            console.log('📊 Subscription check result:', {
              eligible: data.eligible,
              plan: data.plan,
              isFirstDownload: data.isFirstDownload,
              downloadedResumeId: data.downloadedResumeId
            });
            
            setHasActiveSubscription(data.eligible);
            
            if (data.eligible && data.plan) {
              // Set the plan name based on the subscription data
              let planDisplayName = 'Free Plan';
              
              // Map plan IDs to display names
              if (data.plan === 'weekly') {
                planDisplayName = 'Weekly Pro';
                console.log('Setting plan name to Weekly Pro');
              } else if (data.plan === 'monthly') {
                planDisplayName = 'Monthly Pro';
                console.log('Setting plan name to Monthly Pro');
              } else if (data.plan === 'one-time') {
                planDisplayName = 'One-Time Download';
                console.log('Setting plan name to One-Time Download');
            } else {
                // Use the plan name directly if it doesn't match our known IDs
                planDisplayName = data.plan;
                console.log(`Setting plan name to ${data.plan}`);
              }
              
              console.log('Updating subscription details:', {
                planName: planDisplayName,
                expirationDate: data.expirationDate
              });
              
              // Store the plan name in localStorage for other components to access
              localStorage.setItem('current_subscription_plan', planDisplayName);
              
              setSubscriptionDetails({
                planName: planDisplayName,
                expirationDate: data.expirationDate
              });
            }
          } catch (error) {
            console.error('Error checking subscription status:', error);
          }
        };
        
        checkSubscription();
      } else {
        // Check if there's a post-auth redirect for non-download flows
        const postAuthRedirect = localStorage.getItem('post_auth_redirect');
        const authAction = localStorage.getItem('auth_action');
        
        if (postAuthRedirect && !authAction) {
          // Clear the redirect info
          localStorage.removeItem('post_auth_redirect');
          localStorage.removeItem('auth_action');
          
          // Redirect to the original destination after a short delay
          setTimeout(() => {
            router.push(postAuthRedirect);
          }, 1000);
        }
      }

      // Fetch user's resumes from the database
      fetchUserResumes();
    }
    
    // Clean up interval and timers on unmount
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (messageTimer) {
        clearTimeout(messageTimer);
      }
    };
  }, [status, session, router, payment]);

  // Separate useEffect for handling the countdown timer
  useEffect(() => {
    // Only start the timer when we're actually redirecting and not right after payment
    if (isRedirecting && showRedirectMessage && payment !== 'success') {
      console.log('Starting countdown timer from', countdown);
      
      // Clear any existing interval first
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      // Start a new interval
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          const newValue = prev - 1;
          console.log('Countdown:', newValue);
          
          if (newValue <= 0) {
            clearInterval(countdownRef.current);
            if (isRedirecting) {
              console.log('Countdown complete, redirecting to subscription page');
              router.push('/subscription?action=download');
            }
            return 0;
          }
          return newValue;
        });
      }, 1000);
      
      // Clean up on unmount or when redirecting state changes
      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [isRedirecting, showRedirectMessage, router, payment, countdown]);
  
  // Monitor countdown changes
  useEffect(() => {
    if (isRedirecting && showRedirectMessage) {
      console.log('Countdown value updated:', countdown);
    }
  }, [countdown, isRedirecting, showRedirectMessage]);

  // Re-fetch resumes when migration completes (payment flow)
  useEffect(() => {
    if (migrationCompleted && status === 'authenticated' && session?.user?.id) {
      console.log('📊 Migration completed, re-fetching resume list');
      setTimeout(() => {
        fetchUserResumes();
      }, 500);
    }
  }, [migrationCompleted, status, session]);

  // Re-fetch resumes when auth migration finishes (sign-in flow)
  useEffect(() => {
    const handleMigrationComplete = () => {
      console.log('📊 migration-complete event received, re-fetching resume list');
      fetchUserResumes();
    };

    window.addEventListener('migration-complete', handleMigrationComplete);
    return () => window.removeEventListener('migration-complete', handleMigrationComplete);
  }, []);

  // Check admin status when authenticated
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        const response = await fetch('/api/admin/check');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    
    checkAdminStatus();
  }, [status, session]);

  // Check for active subscription when authenticated
  useEffect(() => {
    const checkSubscription = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        console.log('Checking subscription status...');
        const response = await fetch('/api/resume/check-download-eligibility');
        const data = await response.json();
        
        // Add debugging logs for one-time plan testing
        console.log('📊 Subscription check result:', {
          eligible: data.eligible,
          plan: data.plan,
          isFirstDownload: data.isFirstDownload,
          downloadedResumeId: data.downloadedResumeId
        });
        
        setHasActiveSubscription(data.eligible);
        
        if (data.eligible && data.plan) {
          // Set the plan name based on the subscription data
          let planDisplayName = 'Free Plan';
          
          // Map plan IDs to display names
          if (data.plan === 'weekly') {
            planDisplayName = 'Weekly Pro';
            console.log('Setting plan name to Weekly Pro');
          } else if (data.plan === 'monthly') {
            planDisplayName = 'Monthly Pro';
            console.log('Setting plan name to Monthly Pro');
          } else if (data.plan === 'one-time') {
            planDisplayName = 'One-Time Download';
            console.log('Setting plan name to One-Time Download');
          } else {
            // Use the plan name directly if it doesn't match our known IDs
            planDisplayName = data.plan;
            console.log(`Setting plan name to ${data.plan}`);
          }
          
          console.log('Updating subscription details:', {
            planName: planDisplayName,
            expirationDate: data.expirationDate
          });
          
          setSubscriptionDetails({
            planName: planDisplayName,
            expirationDate: data.expirationDate
          });
          
          // Store the plan name in localStorage for other components to access
          localStorage.setItem('current_subscription_plan', planDisplayName);
        }
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    };
    
    checkSubscription();
  }, [status, session, payment]);

  // Function to fetch user's resumes
  const fetchUserResumes = async () => {
    if (!session?.user?.id) return;

    setIsLoadingResumes(true);
    try {
      const response = await fetch('/api/resume/list');
      
      if (!response.ok) {
        throw new Error('Failed to fetch resumes');
      }
      
      const data = await response.json();
      console.log('User resumes:', data);
      
      setUserResumes(data.resumes || []);
      setResumeCount(data.count || 0);
      
      // If we have resumes, also set hasSavedResume for UI feedback
      if (data.count > 0) {
        setHasSavedResume(true);
      }
    } catch (error) {
      console.error('Error fetching user resumes:', error);
      toast.error('Failed to load your resumes');
    } finally {
      setIsLoadingResumes(false);
    }
  };
  
  // Start editing a resume name
  const startEditingName = (resume) => {
    setEditingResumeId(resume.id);
    setEditingResumeName(resume.title);
    setNameValidationError('');
  };
  
  // Cancel editing a resume name
  const cancelEditingName = () => {
    setEditingResumeId(null);
    setEditingResumeName('');
    setNameValidationError('');
  };
  
  // Save the edited resume name
  const saveResumeName = async () => {
    if (!editingResumeId || !editingResumeName.trim()) return;
    
    setIsValidatingName(true);
    
    try {
      // First validate the name
      const validateResponse = await fetch('/api/resume/validate-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingResumeName.trim(),
          resumeId: editingResumeId
        }),
      });
      
      if (!validateResponse.ok) {
        throw new Error('Failed to validate resume name');
      }
      
      const validationData = await validateResponse.json();
      
      if (!validationData.isValid) {
        setNameValidationError(validationData.message || 'This name is already in use.');
        return;
      }
      
      // If name is valid, update the resume
      const updateResponse = await fetch(`/api/resume/update-name/${editingResumeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingResumeName.trim()
        }),
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update resume name');
      }
      
      // Update the local state with the new name
      setUserResumes(userResumes.map(resume => 
        resume.id === editingResumeId 
          ? { ...resume, title: editingResumeName.trim() } 
          : resume
      ));
      
      // Reset editing state
      setEditingResumeId(null);
      setEditingResumeName('');
      setNameValidationError('');
      
      toast.success('Resume name updated successfully');
    } catch (error) {
      console.error('Error updating resume name:', error);
      toast.error('Failed to update resume name');
    } finally {
      setIsValidatingName(false);
    }
  };

  // Handle duplicate resume
  const handleDuplicate = async (resumeId) => {
    console.log('🔍 Starting resume duplication process for ID:', resumeId);

    // Check creation eligibility before duplicating
    try {
      const eligibilityRes = await fetch('/api/resume/check-creation-eligibility');
      const eligibilityData = await eligibilityRes.json();
      if (!eligibilityData.eligible) {
        showPaywall('resume_creation');
        return;
      }
    } catch (err) {
      console.error('Error checking creation eligibility:', err);
    }

    setIsDuplicating(true);
    setDuplicatingId(resumeId);

    try {
      // First, fetch the complete resume data for the resume to duplicate
      console.log('📥 Fetching resume data for duplication...');
      const fetchResponse = await fetch(`/api/resume/get?id=${resumeId}`);
      
      console.log('📊 Fetch response status:', fetchResponse.status);
      
      if (!fetchResponse.ok) {
        console.error('❌ Failed to fetch resume data:', fetchResponse.status, fetchResponse.statusText);
        throw new Error('Failed to fetch resume data for duplication');
      }
      
      const responseData = await fetchResponse.json();
      console.log('📄 Resume data fetched successfully, resume title:', responseData.resume?.title);
      
      const { resume } = responseData;
      
      if (!resume) {
        console.error('❌ Resume data is null or undefined in the response');
        throw new Error('Resume data not found');
      }
      
      // Create a unique title by checking existing resumes
      let baseTitle = resume.title;
      let duplicateTitle = baseTitle;
      
      console.log('🏷️ Original title:', baseTitle);
      
      // Check if there are already duplicates with similar names
      const duplicateRegex = /\((\d+)\)$/;
      
      // If the original title already ends with a number in parentheses (e.g., "(2)"), remove that part
      if (duplicateRegex.test(baseTitle)) {
        baseTitle = baseTitle.replace(duplicateRegex, '').trim();
        duplicateTitle = baseTitle;
        console.log('🔄 Removed number suffix, new base title:', baseTitle);
      }
      
      // Count existing duplicates with similar names
      const existingDuplicates = userResumes.filter(r => 
        r.title === baseTitle || (r.title.startsWith(baseTitle) && duplicateRegex.test(r.title))
      );
      
      console.log('🔢 Found existing duplicates:', existingDuplicates.length);
      console.log('📋 Current user resumes:', userResumes.map(r => r.title));
      
      // Generate a unique title
      if (existingDuplicates.length > 0) {
        // Find the highest number
        let highestNumber = 1;
        
        existingDuplicates.forEach(r => {
          const match = r.title.match(duplicateRegex);
          if (match) {
            const number = parseInt(match[1]);
            highestNumber = Math.max(highestNumber, number);
            console.log(`🔢 Found numbered duplicate: ${r.title}, number: ${number}, highest so far: ${highestNumber}`);
          }
        });
        
        // Create the new title with incremented number
        duplicateTitle = `${baseTitle} (${highestNumber + 1})`;
        console.log('🏷️ Generated new title with increment:', duplicateTitle);
      } else if (existingDuplicates.length === 0 && userResumes.some(r => r.title === baseTitle)) {
        // If the exact base title exists but no numbered duplicates yet, start with (2)
        duplicateTitle = `${baseTitle} (2)`;
        console.log('🏷️ Base title exists, using (2):', duplicateTitle);
      }
      
      console.log('💾 Saving duplicate resume with title:', duplicateTitle);
      
      // Ensure we have the correct data structure
      // The API expects 'resumeData' field, not 'data'
      const dataToSend = {
        title: duplicateTitle,
        resumeData: resume.data, // This is the key change - using resumeData instead of data
        template: resume.template || 'ats',
        resumeId: null // Explicitly set to null to indicate a new resume, not an update
      };
      
      console.log('📦 Data being sent to API:', {
        title: dataToSend.title,
        template: dataToSend.template,
        resumeId: dataToSend.resumeId,
        resumeDataExists: !!dataToSend.resumeData
      });
      
      // Call the API to create a duplicate
      const saveResponse = await fetch('/api/resume/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });
      
      console.log('📊 Save response status:', saveResponse.status);
      
      if (!saveResponse.ok) {
        // Try to get error details from the response
        let errorDetails = '';
        try {
          const errorData = await saveResponse.json();
          // Safety net: if the API rejects due to resume limit, show paywall
          if (errorData.error === 'resume_limit_reached') {
            showPaywall('resume_creation');
            return;
          }
          errorDetails = JSON.stringify(errorData);
        } catch (e) {
          errorDetails = 'Could not parse error response';
        }

        console.error('❌ Failed to save duplicate resume:', saveResponse.status, saveResponse.statusText, errorDetails);
        throw new Error(`Failed to duplicate resume: ${saveResponse.status} ${saveResponse.statusText}`);
      }
      
      const saveData = await saveResponse.json();
      console.log('✅ Resume saved successfully, new ID:', saveData.resumeId);
      
      // Add the new resume to the list without a full reload
      if (saveData.resumeId) {
        const newResume = {
          id: saveData.resumeId,
          title: duplicateTitle,
          template: resume.template || 'ats',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        console.log('➕ Adding new resume to UI list:', newResume);
        setUserResumes([newResume, ...userResumes]);
        setResumeCount(resumeCount + 1);
      } else {
        // If we didn't get a clean response with resumeId, do a full reload
        console.log('⚠️ No resumeId in response, doing full reload of resumes');
        fetchUserResumes();
      }
      
      toast.success('Resume duplicated successfully');
    } catch (error) {
      console.error('❌ Error in handleDuplicate:', error);
      toast.error(`Failed to duplicate resume: ${error.message}`);
    } finally {
      setIsDuplicating(false);
      setDuplicatingId(null);
      console.log('🏁 Duplication process completed');
    }
  };

  // Show delete confirmation
  const confirmDelete = (resumeId) => {
    setDeleteConfirmId(resumeId);
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  // Handle delete resume
  const handleDelete = async (resumeId) => {
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/resume/delete?id=${resumeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete resume');
      }
      
      // Remove the resume from the list
      setUserResumes(userResumes.filter(resume => resume.id !== resumeId));
      setResumeCount(resumeCount - 1);
      
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };
  
  // Handle tailoring resume
  const handleTailorResume = (resumeId) => {
    console.log('Starting tailoring process for resume ID:', resumeId);
    
    // Set the resume ID being tailored
    setTailoringResumeId(resumeId);
    
    // Reset the job title and description fields
    setJobTitle('');
    setJobDescription('');
    
    // Show the tailoring modal
    setShowTailorModal(true);
  };
  
  // Function to process the tailoring after job details are entered
  const processTailoring = () => {
    // Validate inputs
    if (!jobTitle.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description');
      return;
    }
    
    setIsTailoring(true);
    
    try {
      // Create the job targeting context object
      const jobTargetingContext = {
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Store the job targeting context in localStorage
      localStorage.setItem('job_targeting_context', JSON.stringify(jobTargetingContext));
      localStorage.setItem('job_targeting_active', 'true');
      
      // Create the URL parameters for the resume builder
      const encodedJobContext = encodeURIComponent(JSON.stringify(jobTargetingContext));
      const targetUrl = `/resume/edit/${tailoringResumeId}?job_targeting=true&source=profile&preserve_job_context=true&job=${encodedJobContext}`;
      
      // Show success message
      toast.success('Preparing to tailor your resume...');
      
      // Navigate to the resume builder with the tailoring parameters
      setTimeout(() => {
        router.push(targetUrl);
      }, 500);
    } catch (error) {
      console.error('Error starting tailoring process:', error);
      toast.error('Failed to start tailoring process');
      setIsTailoring(false);
    }
  };
  
  // Redirect Message Component - only show for users who haven't paid
  const RedirectMessage = () => {
    if (!showRedirectMessage) return null;
    
    return (
      <div style={{
        background: '#fff8e1',
        border: '1px solid #ffecb3',
        borderRadius: '8px',
        padding: '15px 20px',
        marginBottom: '30px',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '20px auto'
      }}>
        <p style={{ fontSize: '16px', color: '#ff8f00', marginBottom: '10px' }}>
          <strong>Almost there!</strong> You need a subscription to download your resume.
        </p>
        <p style={{ fontSize: '14px', color: '#5f6368', marginBottom: '10px' }}>
          Redirecting to subscription plans in <strong>{countdown}</strong> {countdown === 1 ? 'second' : 'seconds'}...
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              // Clear the interval before redirecting
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
              }
              setIsRedirecting(false);
              router.push('/subscription?action=download');
            }}
            style={{
              padding: '8px 16px',
              background: '#ff8f00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Go Now
          </button>
          <button
            onClick={() => {
              // Clear the interval when staying on the page
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
              }
              setIsRedirecting(false);
              setShowRedirectMessage(false);
            }}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#5f6368',
              border: '1px solid #dadce0',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Stay on Profile
          </button>
        </div>
      </div>
    );
  };
  
  // Payment Success Resume Component
  const PaymentSuccessMessage = () => {
    if (!paymentSuccessResume && payment !== 'success') return null;
    
    // Check if the payment success resume is eligible for download
    const isEligibleForDownload = paymentSuccessResume ? 
      eligibleResumeIds.includes(paymentSuccessResume.id) : false;
    
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))',
        border: '1px solid rgba(52, 168, 83, 0.3)',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px',
        maxWidth: '600px',
        margin: '20px auto'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginBottom: '15px',
          justifyContent: 'center'
        }}>
          <div style={{ 
            background: '#34a853', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '20px', 
            color: '#34a853',
            margin: 0
          }}>
            Payment Successful!
          </h3>
        </div>
        
        {paymentSuccessResume ? (
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'flex',
              flexDirection: isSmallScreen ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isSmallScreen ? 'flex-start' : 'center',
              marginBottom: '10px'
            }}>
              <div style={{ marginBottom: isSmallScreen ? '10px' : '0' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                  {paymentSuccessResume.title}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  Template: {paymentSuccessResume.template.toUpperCase()}
                </p>
              </div>
              <a
                href={hasActiveSubscription && eligibleResumeIds.includes(paymentSuccessResume.id) ? `/api/resume/direct-download?id=${paymentSuccessResume.id}` : '#'}
                onClick={(e) => {
                  if (!hasActiveSubscription || !eligibleResumeIds.includes(paymentSuccessResume.id)) {
                    e.preventDefault();
                    showPaywall('download');
                    return;
                  }

                  e.preventDefault();
                  handleDownloadClick(paymentSuccessResume.id);

                  if (isFreeDownload) {
                    setIsFreeDownload(false);
                    setHasActiveSubscription(false);
                    setEligibleResumeIds([]);
                  }

                  window.location.href = `/api/resume/direct-download?id=${paymentSuccessResume.id}`;
                }}
                style={{
                textDecoration: 'none',
                padding: '8px 16px',
                background: hasActiveSubscription && eligibleResumeIds.includes(paymentSuccessResume.id) ? '#1a73e8' : '#f39c12',
                color: 'white',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                  gap: '6px',
                  cursor: downloadingResumeId === paymentSuccessResume.id ? 'wait' : 'pointer',
                  opacity: downloadingResumeId === paymentSuccessResume.id ? '0.8' : '1',
                  width: isSmallScreen ? '100%' : 'auto',
                  justifyContent: isSmallScreen ? 'center' : 'flex-start'
                }}
              >
                {downloadingResumeId === paymentSuccessResume.id ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    {hasActiveSubscription && eligibleResumeIds.includes(paymentSuccessResume.id) ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                          <line x1="1" y1="10" x2="23" y2="10"></line>
                        </svg>
                        Buy Plan
                      </>
                    )}
                  </>
                )}
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '15px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 15px 0', fontSize: '15px' }}>
              No resumes found. Create your first resume now!
            </p>
            <Link href="/nursing-resume-builder" style={{
              textDecoration: 'none',
              padding: '8px 16px',
              background: '#1a73e8',
              color: 'white',
              borderRadius: '4px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Resume
            </Link>
          </div>
        )}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <a href="/nursing-resume-builder" onClick={handleCreateNewResume} style={{
            textDecoration: 'none',
            padding: '8px 16px',
            background: 'transparent',
            color: '#1a73e8',
            border: '1px solid #1a73e8',
            borderRadius: '4px',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Resume
          </a>

          {userResumes.length > 0 && (
            <a href="#resumes" style={{
              textDecoration: 'none',
              padding: '8px 16px',
              background: 'transparent',
              color: '#34a853',
              border: '1px solid #34a853',
              borderRadius: '4px',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              View All Resumes
            </a>
          )}
        </div>
      </div>
    );
  };
  
  // Clear saved resume message on page load/refresh
  useEffect(() => {
    // On initial render, don't show the message unless explicitly set
    if (isInitialRender.current) {
      isInitialRender.current = false;
      
      // If we're not coming from a specific action that should show the message,
      // make sure it's not displayed
      if (!router.query.payment && !localStorage.getItem('pending_resume_download')) {
        setHasSavedResume(false);
      }
    }
  }, [router.query]);
  
  // Handle download click to show loading state
  const handleDownloadClick = (resumeId) => {
    setDownloadingResumeId(resumeId);
    
    // Reset the button after a timeout (simulating download completion)
    setTimeout(() => {
      setDownloadingResumeId(null);
    }, 10000);
  };
  
  // Function to check which resumes are eligible for download with existing plans
  const checkResumeEligibility = async () => {
    if (!session?.user?.id || userResumes.length === 0) return;
    
    console.log('Checking eligibility for resumes:', userResumes.length);
    setCheckingEligibility(true);
    try {
      // First, fetch the latest subscription status to ensure we have the most up-to-date plan
      const eligibilityResponse = await fetch('/api/resume/check-download-eligibility');
      const eligibilityData = await eligibilityResponse.json();
      
      console.log('📊 Latest subscription status:', {
        eligible: eligibilityData.eligible,
        plan: eligibilityData.plan,
        expirationDate: eligibilityData.expirationDate
      });
      
      // Update subscription details with the latest data
      if (eligibilityData.eligible && eligibilityData.plan) {
        // Set the plan name based on the subscription data
        let planDisplayName = 'Free Plan';
        
        // Map plan IDs to display names
        if (eligibilityData.plan === 'weekly') {
          planDisplayName = 'Weekly Pro';
          console.log('Setting plan name to Weekly Pro');
        } else if (eligibilityData.plan === 'monthly') {
          planDisplayName = 'Monthly Pro';
          console.log('Setting plan name to Monthly Pro');
        } else if (eligibilityData.plan === 'one-time') {
          planDisplayName = 'One-Time Download';
          console.log('Setting plan name to One-Time Download');
        } else {
          // Use the plan name directly if it doesn't match our known IDs
          planDisplayName = eligibilityData.plan;
          console.log(`Setting plan name to ${eligibilityData.plan}`);
        }
        
        console.log('Updating subscription details:', {
          planName: planDisplayName,
          expirationDate: eligibilityData.expirationDate
        });
        
        setSubscriptionDetails({
          planName: planDisplayName,
          expirationDate: eligibilityData.expirationDate
        });
        
        // Store the plan name in localStorage for other components to access
        localStorage.setItem('current_subscription_plan', planDisplayName);
      }
      
      // For one-time plans, we need to find all active one-time subscriptions
      const eligibleIds = [];
      
      if (eligibilityData.plan === 'one-time' || subscriptionDetails.planName === 'One-Time Download') {
        console.log('One-time plan detected, checking all subscriptions');
        // Fetch all one-time subscriptions directly
        const response = await fetch('/api/subscription/get-one-time-subscriptions');
        if (response.ok) {
          const data = await response.json();
          console.log('One-time subscriptions:', data.subscriptions);
          
          // Extract eligible resume IDs from subscriptions
          if (data.subscriptions && data.subscriptions.length > 0) {
            data.subscriptions.forEach(sub => {
              if (sub.metadata?.downloadedResumeId) {
                eligibleIds.push(sub.metadata.downloadedResumeId);
                console.log('Found eligible resume ID:', sub.metadata.downloadedResumeId);
              }
            });
          }
          
          console.log('Eligible resume IDs:', eligibleIds);
          setEligibleResumeIds(eligibleIds);
        } else {
          console.error('Failed to fetch one-time subscriptions');
        }
      } else if (eligibilityData.eligible && (eligibilityData.plan === 'weekly' || eligibilityData.plan === 'monthly')) {
        // For weekly/monthly subscription plans, all resumes are eligible
        console.log(`Subscription plan detected (${eligibilityData.plan}), all resumes are eligible`);
        setEligibleResumeIds(userResumes.map(resume => resume.id));
        setIsFreeDownload(false);
      } else if (eligibilityData.eligible && eligibilityData.plan === 'free' && eligibilityData.isFreeDownload) {
        // Free user with 1 free download available — all resumes eligible (they pick which one)
        console.log('Free download available, all resumes are eligible');
        setEligibleResumeIds(userResumes.map(resume => resume.id));
        setIsFreeDownload(true);
      } else {
        // For expired plans or used free downloads, no resumes are eligible
        console.log('No eligible plan detected, no resumes are eligible for download');
        setEligibleResumeIds([]);
        setIsFreeDownload(false);
      }
    } catch (error) {
      console.error('Error checking resume eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Check resume eligibility when resumes are loaded or subscription details change
  useEffect(() => {
    if (userResumes.length > 0 && subscriptionDetails.planName) {
      console.log('Running eligibility check with plan:', subscriptionDetails.planName);
      console.log('Current user resumes:', userResumes.map(r => ({ id: r.id, title: r.title })));
      checkResumeEligibility();
    }
  }, [userResumes, subscriptionDetails.planName]);
  
  // Add a function to force refresh eligibility checks
  const forceRefreshEligibility = () => {
    console.log('Force refreshing eligibility checks');
    checkResumeEligibility();
  };
  
  // Add an effect to force refresh eligibility when the page loads
  useEffect(() => {
    if (session?.user?.id && userResumes.length > 0) {
      // Short delay to ensure other state is initialized
      const timer = setTimeout(() => {
        console.log('Running eligibility check for plan:', subscriptionDetails.planName);
        forceRefreshEligibility();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [session, userResumes.length, subscriptionDetails.planName]);
  
  // Add useEffect to fetch active subscription details
  useEffect(() => {
    const fetchActiveSubscription = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return;
      
      try {
        const response = await fetch('/api/subscription/get-active');
        const data = await response.json();
        
        if (data.success && data.subscription) {
          setActiveSubscriptionId(data.subscription.id);
          
          // Update subscription details with cancellation status and correct expiration date
          if (data.subscription.isCanceled || data.subscription.currentPeriodEnd) {
            setSubscriptionDetails(prev => ({
              ...prev,
              isCanceled: data.subscription.isCanceled,
              canceledButActive: data.subscription.isCanceled,
              // Update expiration date from the active subscription data
              expirationDate: data.subscription.currentPeriodEnd || prev.expirationDate
            }));
          }
          
          console.log('Active subscription details:', data.subscription);
        }
      } catch (error) {
        console.error('Error fetching active subscription:', error);
      }
    };
    
    // Only fetch if we have an active subscription
    if (hasActiveSubscription) {
      fetchActiveSubscription();
    }
  }, [status, session, hasActiveSubscription, subscriptionDetails.planName]);

  // Add this effect to fetch discount info
  useEffect(() => {
    const fetchDiscountInfo = async () => {
      if (!hasActiveSubscription || !activeSubscriptionId) return;

      try {
        const response = await fetch(`/api/subscription/get-discount?subscriptionId=${activeSubscriptionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.discount) {
            setDiscountInfo(data.discount);
          }
          if (data.hasEverUsedRetentionDiscount) {
            setHasEverUsedRetentionDiscount(true);
          }
        }
      } catch (error) {
        console.error('Error fetching discount info:', error);
      }
    };

    fetchDiscountInfo();
  }, [hasActiveSubscription, activeSubscriptionId]);

  // Add function to handle cancellation
  const handleCancelSubscription = async () => {
    if (!activeSubscriptionId) {
      toast.error('No active subscription found to cancel');
      setShowCancelConfirm(false);
      return;
    }
    
    // Show the feedback form instead of immediately canceling
    setShowCancelConfirm(false);
    setShowCancelFeedback(true);
  };
  
  // New function to handle the actual cancellation after feedback
  const processCancellation = async () => {
    setIsSubmittingFeedback(true);
    
    try {
      // First, send the feedback
      const feedbackResponse = await fetch('/api/feedback/send-cancellation-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: activeSubscriptionId,
          reason: cancelReason,
          otherReason: otherReason,
          missingFeaturesReason: missingFeaturesReason,
          betterAlternativeReason: betterAlternativeReason,
          planName: subscriptionDetails.planName
        })
      });
      
      if (!feedbackResponse.ok) {
        console.error('Failed to send feedback, but continuing with cancellation');
      }
      
      // Then proceed with cancellation
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: activeSubscriptionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Your subscription has been canceled. You will have access until the end of your current billing period.');
        
        // Close the feedback modal first
        setShowCancelFeedback(false);
        
        // Reset form fields
        setCancelReason('');
        setOtherReason('');
        setMissingFeaturesReason('');
        setBetterAlternativeReason('');
        
        // Comprehensive refresh of all subscription-related data
        
        // 1. Re-check download eligibility which updates subscription status
        try {
          const eligibilityResponse = await fetch('/api/resume/check-download-eligibility');
          const eligibilityData = await eligibilityResponse.json();
          
          setHasActiveSubscription(eligibilityData.eligible);
          
          if (eligibilityData.eligible && eligibilityData.plan) {
            // Map plan IDs to display names
            let planDisplayName = 'Free Plan';
            
            if (eligibilityData.plan === 'weekly') {
              planDisplayName = 'Weekly Pro';
            } else if (eligibilityData.plan === 'monthly') {
              planDisplayName = 'Monthly Pro';
            } else if (eligibilityData.plan === 'one-time') {
              planDisplayName = 'One-Time Download';
            } else {
              planDisplayName = eligibilityData.plan;
            }
            
            // Update subscription details with the latest data
            setSubscriptionDetails({
              planName: planDisplayName,
              expirationDate: eligibilityData.expirationDate,
              isCanceled: true,
              canceledButActive: true
            });
          }
        } catch (error) {
          console.error('Error refreshing eligibility status:', error);
        }
        
        // 2. Fetch active subscription details to get the latest state
        try {
          const subResponse = await fetch('/api/subscription/get-active');
          const subData = await subResponse.json();
          
          if (subData.success && subData.subscription) {
            setActiveSubscriptionId(subData.subscription.id);
            
            // Update subscription details with the latest cancellation status
            setSubscriptionDetails(prev => ({
              ...prev,
              isCanceled: subData.subscription.isCanceled || true,
              canceledButActive: subData.subscription.isCanceled || true,
              expirationDate: subData.subscription.currentPeriodEnd || prev.expirationDate
            }));
          }
        } catch (error) {
          console.error('Error refreshing active subscription:', error);
        }
        
        // 3. Re-check resume eligibility which updates download buttons
        await checkResumeEligibility();
        
        // 4. Force refresh discount info if needed
        if (activeSubscriptionId) {
          try {
            const discountResponse = await fetch(`/api/subscription/get-discount?subscriptionId=${activeSubscriptionId}`);
            if (discountResponse.ok) {
              const discountData = await discountResponse.json();
              if (discountData.success && discountData.discount) {
                setDiscountInfo(discountData.discount);
              } else {
                setDiscountInfo(null);
              }
            }
          } catch (error) {
            console.error('Error refreshing discount info:', error);
          }
        }
      } else {
        toast.error(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('An error occurred while canceling your subscription');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
  
  // Function to handle discount application
  const applyDiscount = async () => {
    setIsApplyingDiscount(true);
    
    try {
      const response = await fetch('/api/subscription/apply-discount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: activeSubscriptionId,
          discountPercent: 30
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Great! We\'ve applied a 30% discount to your subscription.');

        // Update subscription details with discount info
        setSubscriptionDetails(prev => ({
          ...prev,
          hasDiscount: true,
          discountPercent: 30
        }));

        // Mark as used so the offer never appears again this session
        setHasEverUsedRetentionDiscount(true);

        // Close all modals
        setShowDiscountOffer(false);
        setShowCancelFeedback(false);
      } else {
        toast.error(data.message || 'Failed to apply discount');
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('An error occurred while applying your discount');
    } finally {
      setIsApplyingDiscount(false);
    }
  };
  
  // Show nursing loading animation after sign-in (3.5s)
  if (showPostAuthLoading) {
    return (
      <div className="container">
        <Meta title="Your Profile | IntelliResume" description="Manage your nursing resumes and account settings" />
        <style jsx>{`
          @keyframes pulseIcon {
            0%, 100% { transform: scale(1); }
            15% { transform: scale(1.12); }
            30% { transform: scale(1); }
            45% { transform: scale(1.08); }
            60% { transform: scale(1); }
          }
          @keyframes pulseRing {
            0% { transform: scale(0.85); opacity: 0.5; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes progressFill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes ecgDraw {
            0% { stroke-dashoffset: 300; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes msgInOut {
            0% { opacity: 0; transform: translateY(6px); }
            12% { opacity: 1; transform: translateY(0); }
            88% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-6px); }
          }
          @keyframes msgIn {
            0% { opacity: 0; transform: translateY(6px); }
            20% { opacity: 1; transform: translateY(0); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div style={{
          maxWidth: '440px',
          margin: '90px auto',
          padding: '44px 28px',
          textAlign: 'center',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(26, 115, 232, 0.12)',
          border: '1px solid #e0e7ff'
        }}>
          {/* Stethoscope icon with pulse rings */}
          <div style={{ position: 'relative', width: '88px', height: '88px', margin: '0 auto 20px' }}>
            <div style={{
              position: 'absolute', inset: '0',
              borderRadius: '50%',
              border: '2px solid rgba(26, 115, 232, 0.25)',
              animation: 'pulseRing 1.8s ease-out infinite'
            }} />
            <div style={{
              position: 'absolute', inset: '0',
              borderRadius: '50%',
              border: '2px solid rgba(79, 70, 229, 0.15)',
              animation: 'pulseRing 1.8s ease-out 0.5s infinite'
            }} />
            <div style={{
              width: '88px', height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulseIcon 1.6s ease-in-out infinite',
              position: 'relative', zIndex: 1
            }}>
              {/* Stethoscope SVG */}
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2v6a6 6 0 0 0 12 0V2" stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 2h4M16 2h4" stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="18" cy="16" r="2" stroke="url(#brandGrad)" strokeWidth="2"/>
                <path d="M18 14v-2a4 4 0 0 0-4-4" stroke="url(#brandGrad)" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="brandGrad" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#1a73e8"/>
                    <stop offset="1" stopColor="#4f46e5"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Brand name */}
          <p style={{
            fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase', margin: '0 0 16px',
            background: 'linear-gradient(135deg, #1a73e8, #4f46e5)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>IntelliResume</p>

          {/* ECG line */}
          <div style={{ width: '180px', height: '32px', margin: '0 auto 16px', overflow: 'hidden' }}>
            <svg width="180" height="32" viewBox="0 0 180 32">
              <polyline
                points="0,16 40,16 50,16 55,4 60,28 65,12 70,20 75,16 180,16"
                fill="none" stroke="url(#ecgGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeDasharray: 300, animation: 'ecgDraw 2s ease-in-out infinite' }}
              />
              <defs>
                <linearGradient id="ecgGrad" x1="0" y1="16" x2="180" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1a73e8"/>
                  <stop offset="1" stopColor="#6366f1"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Rotating messages */}
          <div style={{ height: '44px', position: 'relative', marginBottom: '20px' }}>
            <p style={{
              position: 'absolute', width: '100%', left: 0, margin: 0,
              fontSize: '15px', fontWeight: 600, color: '#374151', lineHeight: 1.4,
              animation: 'msgInOut 1.1s ease forwards'
            }}>Preparing your profile...</p>
            <p style={{
              position: 'absolute', width: '100%', left: 0, margin: 0,
              fontSize: '15px', fontWeight: 600, lineHeight: 1.4,
              background: 'linear-gradient(135deg, #1a73e8, #4f46e5)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'msgInOut 1.1s ease 1.15s both'
            }}>You make a difference every shift</p>
            <p style={{
              position: 'absolute', width: '100%', left: 0, margin: 0,
              fontSize: '15px', fontWeight: 600, color: '#374151', lineHeight: 1.4,
              animation: 'msgIn 1.2s ease 2.3s both'
            }}>Loading your nursing career...</p>
          </div>

          {/* Progress bar — brand gradient */}
          <div style={{
            width: '100%', height: '4px',
            background: '#e5e7eb', borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #1a73e8, #4f46e5, #6366f1)',
              borderRadius: '2px',
              animation: 'progressFill 3.5s ease-out forwards'
            }} />
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (status === 'loading' || isTransferring) {
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
            {isTransferring ? 'Saving your resume...' : 'Loading profile...'}
          </div>
        </div>
      </div>
    );
  }
  
  // If authenticated, show profile page
  if (session) {
    return (
      <div className="container">
        <style jsx global>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          .hide-scrollbar::-webkit-scrollbar {
            display: none;  /* Chrome, Safari, Opera */
          }
        `}</style>
        
        <div style={{
          maxWidth: '800px',
          margin: isSmallScreen ? '20px auto' : '60px auto',
          padding: isSmallScreen ? '20px 16px' : '40px',
          boxShadow: 'var(--shadow-md)',
          borderRadius: '12px',
          background: 'white'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h1 style={{
              fontSize: '28px',
              margin: 0
            }}>
              Your Profile
            </h1>

            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              {isAdmin && (
                <a href="/admin" style={{
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid rgba(146, 64, 14, 0.25)',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Admin
                </a>
              )}

              <a href="/subscription" onClick={handlePricingNavigation} style={{
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#f0fdfa',
                color: '#0d9488',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                  <line x1="1" y1="10" x2="23" y2="10"></line>
                </svg>
                Pricing
              </a>

              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#718096',
                  border: '1px solid #e2e8f0',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  fontFamily: "var(--font-figtree), 'Inter', sans-serif",
                  fontSize: '14px'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
          
          {/* <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            {session.user?.image ? (
              <img 
                src={session.user.image} 
                alt={session.user?.name || 'User'} 
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  marginBottom: '15px'
                }}
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%',
                background: 'var(--primary-blue)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 'bold',
                marginBottom: '15px'
              }}>
                {session.user?.name ? session.user.name[0].toUpperCase() : '?'}
              </div>
            )}
            
            <h2 style={{ fontSize: '24px', marginBottom: '5px' }}>
              {session.user?.name || 'User'}
            </h2>
            <p style={{ color: 'var(--text-medium)', marginBottom: '20px' }}>
              {session.user?.email}
            </p>
            
            {hasSavedResume && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1), rgba(46, 204, 113, 0.1))',
                borderRadius: '8px',
                padding: '15px 20px',
                marginBottom: '20px',
                border: '1px solid rgba(52, 168, 83, 0.2)',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                <p style={{ 
                  color: '#34a853', 
                  fontSize: '16px',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Your resume has been saved to your account!
                </p>
              </div>
            )}
          </div> */}
          
          {/* Payment Success Message */}
          <PaymentSuccessMessage />
          
          {/* Subscription Redirect Message - only show for users who need to subscribe */}
          <RedirectMessage />
          
          <div style={{
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '30px',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              marginBottom: '20px',
              color: '#2d3748',
              fontWeight: '600',
            }}>
              Account Information
            </h3>
            
            <div style={{
              borderTop: '1px solid #edf2f7',
              paddingTop: '20px',
            }}>
            <div style={{
              display: 'grid',
                gridTemplateColumns: isSmallScreen ? '1fr' : 'repeat(3, 1fr)',
                gap: '24px',
                marginBottom: '20px'
            }}>
              <div>
                  <p style={{ color: '#718096', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                    Subscription Plan
                </p>
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                }}>
                  {hasActiveSubscription && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  )}
                      <span style={{ 
                        color: hasActiveSubscription ? '#22c55e' : '#4a5568', 
                        fontWeight: '600',
                        fontSize: '16px'
                      }}>
                  {subscriptionDetails.planName}
                      </span>
                    </div>
                  </div>
                {subscriptionDetails.expirationDate && (
                    <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
                      {subscriptionDetails.planName === 'One-Time Download' ? 
                        'Plan Never Expires' : 
                        <>
                          Renews on: <span style={{ fontWeight: '500' }}>
                            {new Date(subscriptionDetails.expirationDate).toLocaleDateString()}
                          </span>
                        </>
                      }
                  </p>
                )}
                  
                  {/* Only show cancel button for weekly/monthly plans that aren't already canceled */}
                  {hasActiveSubscription &&
                   (subscriptionDetails.planName === 'Weekly Pro' || subscriptionDetails.planName === 'Monthly Pro') &&
                   !subscriptionDetails.isCanceled && (
                    <div style={{ marginTop: '4px' }}>
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e53e3e',
                          color: '#e53e3e',
                          padding: '6px 14px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Cancel Subscription
                      </button>
                    </div>
                )}
              </div>
              
              <div>
                  <p style={{ color: '#718096', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Resumes Created
                </p>
                  <p style={{ color: '#2d3748', fontWeight: '600', fontSize: '16px' }}>
                  {isLoadingResumes ? 'Loading...' : resumeCount}
                </p>
              </div>
              
              <div>
                  <p style={{ color: '#718096', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Account Created
                </p>
                  <p style={{ color: '#2d3748', fontWeight: '600', fontSize: '16px' }}>
                  {new Date().toLocaleDateString()}
                </p>
                </div>
              </div>
            </div>
            
            {!hasActiveSubscription && (
              <div style={{
                marginTop: '20px',
                padding: '24px 30px',
                background: 'linear-gradient(135deg, #4a6cf7 0%, #2451e6 100%)',
                borderRadius: '10px',
                border: 'none',
                boxShadow: '0 10px 20px rgba(36, 81, 230, 0.15)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background decorative elements */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '20%',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  pointerEvents: 'none'
                }}></div>
                
                <div style={{
                display: 'flex',
                  flexDirection: isSmallScreen ? 'column' : 'row',
                justifyContent: 'space-between',
                  alignItems: isSmallScreen ? 'flex-start' : 'center',
                  gap: isSmallScreen ? '20px' : '10px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div>
                    <div style={{ 
                      display: 'flex',
                alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <h4 style={{ 
                        margin: 0, 
                        color: 'white', 
                        fontSize: isSmallScreen ? '18px' : '20px',
                        fontWeight: '600'
                      }}>
                        Upgrade to access all your resumes
                      </h4>
                    </div>
                    <p style={{ 
                      margin: '0 0 0 36px', 
                      fontSize: '15px', 
                      color: 'rgba(255, 255, 255, 0.9)',
                      maxWidth: '500px',
                      lineHeight: '1.5'
                    }}>
                      Create & download unlimited resumes anytime!
                    </p>
                  </div>
                  
                <a href="#" onClick={handlePricingNavigation} style={{
                  textDecoration: 'none',
                    padding: isSmallScreen ? '12px 20px' : '14px 24px',
                    background: 'white',
                    color: '#2451e6',
                    borderRadius: '8px',
                    fontSize: isSmallScreen ? '15px' : '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    minWidth: isSmallScreen ? '100%' : 'auto',
                    justifyContent: isSmallScreen ? 'center' : 'flex-start',
                }}>
                  View Plans
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </a>
                </div>
              </div>
            )}
          </div>
          
          {/* Resume List Section */}
          {userResumes.length > 0 && (
            <div 
              id="resumes"
              style={{
                marginBottom: '30px',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
              }}
            >
              <h3 style={{ 
                fontSize: '20px', 
                marginBottom: '20px',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: '500'
              }}>
                <span>Your Resumes</span>
                {checkingEligibility && (
                  <span style={{
                    fontSize: '14px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center'
              }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}>
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Checking eligibility...
                  </span>
                )}
              </h3>
              
              {subscriptionDetails.planName === 'One-Time Download' && (
                <div style={{
                  background: 'rgba(240, 240, 245, 0.8)',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  border: '1px solid rgba(210, 210, 220, 1)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(26, 115, 232, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                    <p style={{ 
                      fontSize: '14px',
                      color: '#424242',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      You have lifetime access to resumes with <span style={{color: '#34a853', fontWeight: '500'}}>green download buttons</span>, with no expiration date.
                    </p>
                  </div>
                </div>
              )}
              
              <div style={{
                display: 'grid',
                gap: '15px',
              }}>
                {userResumes.map(resume => (
                  <div key={resume.id} style={{
                    padding: '18px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e9ecef',
                    display: 'flex',
                    flexDirection: isSmallScreen ? 'column' : 'row',
                    justifyContent: isSmallScreen ? 'flex-start' : 'space-between',
                    alignItems: isSmallScreen ? 'flex-start' : 'center',
                    backgroundColor: eligibleResumeIds.includes(resume.id) ? 'rgba(52, 168, 83, 0.03)' : 'white',
                    marginBottom: '15px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ flex: 1, marginBottom: isSmallScreen ? '15px' : '0' }}>
                      {editingResumeId === resume.id ? (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          width: '100%',
                          maxWidth: '300px'
                        }}>
                          <input
                            type="text"
                            value={editingResumeName}
                            onChange={(e) => setEditingResumeName(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              marginBottom: nameValidationError ? '5px' : '0'
                            }}
                            placeholder="Resume name"
                          />
                          {nameValidationError && (
                            <p style={{ 
                              color: '#e74c3c', 
                              fontSize: '12px', 
                              margin: '5px 0'
                            }}>
                              {nameValidationError}
                            </p>
                          )}
                          <div style={{ 
                            display: 'flex', 
                            gap: '10px',
                            marginTop: '8px'
                          }}>
                            <button
                              onClick={saveResumeName}
                              disabled={isValidatingName || !editingResumeName.trim()}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                background: 'var(--primary-blue)',
                                color: 'white',
                                border: 'none',
                                fontSize: '14px',
                                cursor: 'pointer',
                                opacity: isValidatingName || !editingResumeName.trim() ? '0.7' : '1'
                              }}
                            >
                              {isValidatingName ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEditingName}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '4px',
                                background: 'transparent',
                                color: 'var(--text-medium)',
                                border: '1px solid #dee2e6',
                                fontSize: '14px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <p style={{ fontWeight: '500', marginBottom: '5px' }}>
                            {resume.title}
                              {subscriptionDetails.planName === 'One-Time Download' && 
                                eligibleResumeIds.includes(resume.id) && (
                                <span style={{
                                  marginLeft: '8px', 
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  backgroundColor: '#e8f5e9',
                                  color: '#34a853',
                                  borderRadius: '12px',
                                  fontWeight: '500',
                                  border: '1px solid rgba(52, 168, 83, 0.2)'
                                }}>
                                  Purchased
                                </span>
                              )}
                          </p>
                          <button
                            onClick={() => startEditingName(resume)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-light)',
                              fontSize: '14px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              marginLeft: '10px'
                            }}
                            title="Edit resume name"
                          >
                            ✎
                          </button>
                        </div>
                      <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                        Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
                      </p>
                          {subscriptionDetails.planName === 'One-Time Download' && 
                           !eligibleResumeIds.includes(resume.id) && (
                            <p style={{ 
                              fontSize: '13px', 
                              color: '#f39c12',
                              marginTop: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f39c12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                <line x1="1" y1="10" x2="23" y2="10"></line>
                              </svg>
                              Requires additional purchase
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Actions Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      flexWrap: isSmallScreen ? 'wrap' : 'nowrap',
                      justifyContent: isSmallScreen ? 'flex-start' : 'flex-end',
                      width: isSmallScreen ? '100%' : 'auto'
                    }}>
                      {deleteConfirmId === resume.id ? (
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px',
                          background: 'rgba(231, 76, 60, 0.1)',
                          padding: '8px 10px',
                          borderRadius: '6px'
                        }}>
                          <p style={{ 
                            fontSize: '14px', 
                            color: '#e74c3c',
                            marginRight: '8px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            Delete this resume?
                          </p>
                          <button 
                            onClick={() => handleDelete(resume.id)}
                            disabled={isDeleting}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#e74c3c',
                              color: 'white',
                              border: 'none',
                              fontSize: '13px',
                              cursor: 'pointer',
                              opacity: isDeleting ? '0.7' : '1'
                            }}
                          >
                            {isDeleting ? 'Deleting...' : 'Yes'}
                          </button>
                          <button 
                            onClick={cancelDelete}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: 'transparent',
                              color: 'var(--text-medium)',
                              border: '1px solid #dee2e6',
                              fontSize: '13px',
                              cursor: 'pointer'
                            }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDuplicate(resume.id)}
                            disabled={isDuplicating && duplicatingId === resume.id}
                            onMouseEnter={() => !isSmallScreen && setActiveTooltip(`duplicate-${resume.id}`)}
                            onMouseLeave={() => !isSmallScreen && setActiveTooltip(null)}
                            onTouchStart={(e) => {
                              if (isSmallScreen) {
                                if (activeTooltip === `duplicate-${resume.id}`) {
                                  setActiveTooltip(null);
                                } else {
                                  e.stopPropagation();
                                  setActiveTooltip(`duplicate-${resume.id}`);
                                  setTimeout(() => setActiveTooltip(null), 1500);
                                }
                              }
                            }}
                            style={{
                              textDecoration: 'none',
                              padding: '8px',
                              borderRadius: '6px',
                              background: '#f8f9fa',
                              color: '#6c757d',
                              border: '1px solid #6c757d',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              opacity: (isDuplicating && duplicatingId === resume.id) ? '0.7' : '1',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              minWidth: isSmallScreen ? '40px' : 'auto',
                              flex: isSmallScreen ? '1 0 auto' : '0 0 auto',
                              position: 'relative'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            
                            {/* Custom tooltip */}
                            {activeTooltip === `duplicate-${resume.id}` && (
                              <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                              }}>
                                Create a copy of this resume
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '0',
                                  height: '0',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(0, 0, 0, 0.8)'
                                }}></div>
                              </div>
                            )}
                          </button>
                          
                          {/* Modified: Always show download/buy plan button regardless of subscription status */}
                          <a
                            href={hasActiveSubscription && eligibleResumeIds.includes(resume.id) ? `/api/resume/direct-download?id=${resume.id}` : '#'}
                            onClick={(e) => {
                              if (!hasActiveSubscription || !eligibleResumeIds.includes(resume.id)) {
                                e.preventDefault();
                                showPaywall('download');
                                return;
                              }

                              e.preventDefault();
                              handleDownloadClick(resume.id);

                              // direct-download API handles eligibility check + record-download internally
                              // After triggering download, update state so button flips to "Buy Plan" for free users
                              if (isFreeDownload) {
                                setIsFreeDownload(false);
                                setHasActiveSubscription(false);
                                setEligibleResumeIds([]);
                              }

                              window.location.href = `/api/resume/direct-download?id=${resume.id}`;
                            }}
                            style={{
                            textDecoration: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                              background: hasActiveSubscription && eligibleResumeIds.includes(resume.id) ? '#34a853' : '#f39c12',
                            color: 'white',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                              gap: '5px',
                              cursor: downloadingResumeId === resume.id ? 'wait' : 'pointer',
                              opacity: downloadingResumeId === resume.id ? '0.8' : '1',
                              border: 'none',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                              fontWeight: '500',
                              transition: 'all 0.2s ease',
                              minWidth: isSmallScreen ? '40px' : 'auto',
                              flex: isSmallScreen ? '1 0 auto' : '0 0 auto'
                            }}
                          >
                            {downloadingResumeId === resume.id ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                  <line x1="12" y1="2" x2="12" y2="6"></line>
                                  <line x1="12" y1="18" x2="12" y2="22"></line>
                                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                  <line x1="2" y1="12" x2="6" y2="12"></line>
                                  <line x1="18" y1="12" x2="22" y2="12"></line>
                                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                                </svg>
                                Downloading...
                              </>
                            ) : (
                              <>
                                {hasActiveSubscription && eligibleResumeIds.includes(resume.id) ? (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="7 10 12 15 17 10"></polyline>
                                      <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Download
                                  </>
                                ) : (
                                  <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                                      <line x1="1" y1="10" x2="23" y2="10"></line>
                                    </svg>
                                    Buy Plan
                                  </>
                                )}
                              </>
                            )}
                          </a>
                          
                          <Link href={`/resume/edit/${resume.id}`} style={{
                            textDecoration: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            background: '#f8f9fa',
                            color: '#1a73e8',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            border: '1px solid #1a73e8',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            minWidth: isSmallScreen ? '40px' : 'auto',
                            flex: isSmallScreen ? '1 0 auto' : '0 0 auto',
                            position: 'relative'
                          }}
                          onClick={() => setActiveTooltip(null)}
                          onMouseEnter={() => !isSmallScreen && setActiveTooltip(`edit-${resume.id}`)}
                          onMouseLeave={() => !isSmallScreen && setActiveTooltip(null)}
                          onTouchStart={(e) => {
                            if (isSmallScreen) {
                              if (activeTooltip === `edit-${resume.id}`) {
                                setActiveTooltip(null);
                              } else {
                                e.preventDefault();
                                setActiveTooltip(`edit-${resume.id}`);
                                // Auto-hide tooltip after 1.5 seconds on mobile
                                setTimeout(() => setActiveTooltip(null), 1500);
                              }
                            }
                          }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                            
                            {/* Custom tooltip */}
                            {activeTooltip === `edit-${resume.id}` && (
                              <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                              }}>
                                Edit resume
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '0',
                                  height: '0',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(0, 0, 0, 0.8)'
                                }}></div>
                              </div>
                            )}
                          </Link>
                          
                          <button
                            onClick={() => {
                              setActiveTooltip(null);
                              handleTailorResume(resume.id);
                            }}
                            onMouseEnter={() => !isSmallScreen && setActiveTooltip(`tailor-${resume.id}`)}
                            onMouseLeave={() => !isSmallScreen && setActiveTooltip(null)}
                            onTouchStart={(e) => {
                              if (isSmallScreen) {
                                if (activeTooltip === `tailor-${resume.id}`) {
                                  setActiveTooltip(null);
                                } else {
                                  e.stopPropagation();
                                  setActiveTooltip(`tailor-${resume.id}`);
                                  // Auto-hide tooltip after 1.5 seconds on mobile
                                  setTimeout(() => setActiveTooltip(null), 1500);
                                }
                              }
                            }}
                            style={{
                              textDecoration: 'none',
                              padding: '8px 15px',
                              borderRadius: '6px',
                              background: '#f8f9fa',
                              color: '#9c27b0', // Purple color for tailoring
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              border: '1px solid #9c27b0',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              minWidth: isSmallScreen ? '40px' : 'auto',
                              flex: isSmallScreen ? '1 0 auto' : '0 0 auto',
                              position: 'relative'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                              <line x1="16" y1="8" x2="2" y2="22"></line>
                              <line x1="17.5" y1="15" x2="9" y2="15"></line>
                            </svg>
                            Tailor
                            
                            {/* Custom tooltip */}
                            {activeTooltip === `tailor-${resume.id}` && (
                              <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                              }}>
                                Tailor resume to match a specific job
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '0',
                                  height: '0',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(0, 0, 0, 0.8)'
                                }}></div>
                              </div>
                            )}
                          </button>
                          
                          <button
                            onClick={() => confirmDelete(resume.id)}
                            onMouseEnter={() => !isSmallScreen && setActiveTooltip(`delete-${resume.id}`)}
                            onMouseLeave={() => !isSmallScreen && setActiveTooltip(null)}
                            onTouchStart={(e) => {
                              if (isSmallScreen) {
                                if (activeTooltip === `delete-${resume.id}`) {
                                  setActiveTooltip(null);
                                } else {
                                  e.stopPropagation();
                                  setActiveTooltip(`delete-${resume.id}`);
                                  setTimeout(() => setActiveTooltip(null), 1500);
                                }
                              }
                            }}
                            style={{
                              textDecoration: 'none',
                              padding: '8px',
                              borderRadius: '6px',
                              background: '#f8f9fa',
                              color: '#e74c3c',
                              border: '1px solid rgba(231, 76, 60, 0.5)',
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              minWidth: isSmallScreen ? '40px' : 'auto',
                              flex: isSmallScreen ? '1 0 auto' : '0 0 auto',
                              position: 'relative'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            
                            {/* Custom tooltip */}
                            {activeTooltip === `delete-${resume.id}` && (
                              <div style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 8px)',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                pointerEvents: 'none'
                              }}>
                                Delete this resume
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '0',
                                  height: '0',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderTop: '6px solid rgba(0, 0, 0, 0.8)'
                                }}></div>
                              </div>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {userResumes.length > 0 && (
                <div style={{
                  marginTop: '30px',
                  textAlign: 'center'
                }}>
                  <a href="/nursing-resume-builder" onClick={handleCreateNewResume} style={{
                    textDecoration: 'none',
                    padding: '12px 24px',
                    background: 'var(--primary-blue)',
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create New Resume
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Pricing & Sign Out buttons moved to header area above */}
          
          {/* Show admin tools if user is admin */}
          {isAdmin && (
            <div className="mt-8 border-t pt-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Admin Tools</h2>
              <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-700">System Maintenance</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="font-medium text-blue-800 mb-1">Resume Database Cleanup</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Clean up duplicate resumes to reduce database bloat. This tool allows you to find and remove duplicate entries.
                    </p>
                    <Link href="/admin/cleanup" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                      Open Cleanup Tool
                    </Link>
                  </div>
                  
                  {/* Add more admin tools here as needed */}
                </div>
              </div>
            </div>
          )}
          
          {/* Cancellation confirmation modal */}
          {showCancelConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(3px)',
              padding: '15px',
              overflow: 'auto'
            }}>
              <div style={{
                background: 'white',
                padding: isSmallScreen ? '24px 20px' : '28px 32px',
                borderRadius: '12px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                animation: 'fadeIn 0.3s ease-out',
                maxHeight: '85vh',
                overflowY: 'auto',
                margin: '20px auto'
              }} className="hide-scrollbar">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginBottom: '20px',
                  gap: '14px',
                  background: 'white',
                  zIndex: 2
                }}>
                  <div style={{
                    width: isSmallScreen ? '36px' : '42px',
                    height: isSmallScreen ? '36px' : '42px',
                    borderRadius: '50%',
                    background: 'rgba(231, 76, 60, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={isSmallScreen ? "18" : "20"} height={isSmallScreen ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: isSmallScreen ? '20px' : '22px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Cancel Subscription
                  </h3>
                </div>
                
                <div style={{ 
                  position: 'relative',
                  zIndex: 1
                }}>
                  <p style={{ 
                    marginBottom: '24px', 
                    fontSize: isSmallScreen ? '14px' : '15px',
                    lineHeight: '1.6',
                    color: '#555'
                  }}>
                    Are you sure you want to cancel your subscription? 
                    {subscriptionDetails.planName === 'One-Time Download' ? (
                      " You'll still have perpetual access to your purchased resume."
                    ) : (
                      <>
                        <br />
                        <span style={{ 
                          display: 'block', 
                          marginTop: '8px',
                          fontWeight: '500',
                          color: '#444'
                        }}>
                          You'll have access until <span style={{ color: '#e67e22' }}>{new Date(subscriptionDetails.expirationDate).toLocaleDateString()}</span>
                        </span>
                      </>
                    )}
                  </p>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '12px',
                  marginTop: '24px',
                  flexDirection: isSmallScreen ? 'column' : 'row',
                  background: 'white',
                  padding: '10px 0 0 0',
                  borderTop: '1px solid #f0f0f0',
                  zIndex: 2
                }}>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#4b5563',
                      transition: 'all 0.2s ease',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '2' : '1'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    disabled={isCanceling}
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: isCanceling ? '0.7' : '1',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(231, 76, 60, 0.3)',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '1' : '2'
                    }}
                    onMouseOver={(e) => {
                      if (!isCanceling) e.currentTarget.style.backgroundColor = '#d44637';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#e74c3c';
                    }}
                    disabled={isCanceling}
                  >
                    {isCanceling ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <line x1="12" y1="2" x2="12" y2="6"></line>
                          <line x1="12" y1="18" x2="12" y2="22"></line>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                          <line x1="2" y1="12" x2="6" y2="12"></line>
                          <line x1="18" y1="12" x2="22" y2="12"></line>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Yes, Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Cancellation feedback modal */}
          {showCancelFeedback && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(3px)',
              padding: '15px',
              overflow: 'auto'
            }}>
              <div style={{
                background: 'white',
                padding: isSmallScreen ? '24px 20px' : '28px 32px',
                borderRadius: '12px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                animation: 'fadeIn 0.3s ease-out',
                maxHeight: '85vh',
                overflowY: 'auto',
                margin: '20px auto'
              }} className="hide-scrollbar">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginBottom: '20px',
                  gap: '14px',
                  background: 'white',
                  zIndex: 2
                }}>
                  <div style={{
                    width: isSmallScreen ? '36px' : '42px',
                    height: isSmallScreen ? '36px' : '42px',
                    borderRadius: '50%',
                    background: 'rgba(52, 152, 219, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={isSmallScreen ? "18" : "20"} height={isSmallScreen ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: isSmallScreen ? '20px' : '22px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    We're Sorry to See You Go
                  </h3>
                </div>
                
                <div style={{ 
                  position: 'relative',
                  zIndex: 1
                }}>
                  <p style={{ 
                    marginBottom: '20px', 
                    fontSize: isSmallScreen ? '14px' : '15px',
                    lineHeight: '1.6',
                    color: '#555'
                  }}>
                    Your feedback helps us improve. Could you tell us why you're canceling?
                  </p>
                  
                  <div style={{ marginBottom: '20px' }}>
                    {[
                      { id: 'too-expensive', label: 'Too expensive' },
                      { id: 'not-using', label: 'Not using it enough' },
                      { id: 'missing-features', label: 'Missing features I need' },
                      { id: 'found-alternative', label: 'Found a better alternative' },
                      { id: 'job-found', label: 'Found a job, no longer needed' },
                      { id: 'other', label: 'Other reason' }
                    ].map(option => (
                      <div 
                        key={option.id}
                        style={{
                          padding: isSmallScreen ? '10px 14px' : '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          background: cancelReason === option.id ? 'rgba(52, 152, 219, 0.1)' : 'white',
                          borderColor: cancelReason === option.id ? '#3498db' : '#e2e8f0',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setCancelReason(option.id);
                          // Show discount offer only if: price reason selected AND never used before AND no active discount
                          if (option.id === 'too-expensive' && !hasEverUsedRetentionDiscount && !discountInfo) {
                            setShowDiscountOffer(true);
                          } else {
                            setShowDiscountOffer(false);
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: cancelReason === option.id ? '#3498db' : '#cbd5e0',
                            marginRight: '12px',
                            position: 'relative',
                            flexShrink: 0
                          }}>
                            {cancelReason === option.id && (
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#3498db',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)'
                              }} />
                            )}
                          </div>
                          <span style={{ 
                            fontWeight: cancelReason === option.id ? '500' : 'normal',
                            color: cancelReason === option.id ? '#333' : '#4a5568',
                            fontSize: isSmallScreen ? '13px' : '14px'
                          }}>
                            {option.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {cancelReason === 'other' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label 
                        htmlFor="otherReason" 
                        style={{ 
                          display: 'block', 
                          marginBottom: '8px',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          fontWeight: '500',
                          color: '#4a5568'
                        }}
                      >
                        Please tell me more:
                      </label>
                      <textarea
                        id="otherReason"
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        placeholder="What made you decide to cancel?"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          minHeight: '80px',
                          maxHeight: '150px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {cancelReason === 'missing-features' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label 
                        htmlFor="missingFeaturesReason" 
                        style={{ 
                          display: 'block', 
                          marginBottom: '8px',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          fontWeight: '500',
                          color: '#4a5568'
                        }}
                      >
                        Please tell me more about the features:
                      </label>
                      <textarea
                        id="missingFeaturesReason"
                        value={missingFeaturesReason}
                        onChange={(e) => setMissingFeaturesReason(e.target.value)}
                        placeholder="Mind telling me which features you need that lack?"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          minHeight: '80px',
                          maxHeight: '150px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}

                  {cancelReason === 'found-alternative' && (
                    <div style={{ marginBottom: '20px' }}>
                      <label 
                        htmlFor="betterAlternativeReason" 
                        style={{ 
                          display: 'block', 
                          marginBottom: '8px',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          fontWeight: '500',
                          color: '#4a5568'
                        }}
                      >
                        Please tell me who you're leaving me for: 😭
                      </label>
                      <textarea
                        id="betterAlternativeReason"
                        value={betterAlternativeReason}
                        onChange={(e) => setBetterAlternativeReason(e.target.value)}
                        placeholder="Mind sharing which service you're switching to and why?"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          minHeight: '80px',
                          maxHeight: '150px',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Show discount offer if they selected price-related reason */}
                  {showDiscountOffer && (
                    <div style={{
                      padding: '16px',
                      background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(46, 204, 113, 0.1))',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      border: '1px solid rgba(46, 204, 113, 0.2)',
                      animation: 'fadeIn 0.3s ease-out'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          width: isSmallScreen ? '28px' : '32px',
                          height: isSmallScreen ? '28px' : '32px',
                          borderRadius: '50%',
                          background: 'rgba(46, 204, 113, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width={isSmallScreen ? "14" : "16"} height={isSmallScreen ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="5" x2="5" y2="19"></line>
                            <circle cx="6.5" cy="6.5" r="2.5"></circle>
                            <circle cx="17.5" cy="17.5" r="2.5"></circle>
                          </svg>
                        </div>
                        <h4 style={{ 
                          margin: 0, 
                          fontSize: isSmallScreen ? '15px' : '16px', 
                          fontWeight: '600',
                          color: '#2c3e50'
                        }}>
                          Special Offer: 30% Off Your Subscription
                        </h4>
                      </div>
                      <p style={{ 
                        fontSize: isSmallScreen ? '13px' : '14px',
                        lineHeight: '1.6',
                        color: '#34495e',
                        margin: '0 0 16px 0'
                      }}>
                        We'd love to keep you as a customer! How about a 30% discount on your current plan?
                      </p>
                      <button
                        onClick={applyDiscount}
                        disabled={isApplyingDiscount}
                        style={{
                          background: '#27ae60',
                          color: 'white',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: isSmallScreen ? '13px' : '14px',
                          fontWeight: '500',
                          width: '100%',
                          opacity: isApplyingDiscount ? '0.7' : '1',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 1px 3px rgba(46, 204, 113, 0.3)'
                        }}
                      >
                        {isApplyingDiscount ? (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                              <line x1="12" y1="2" x2="12" y2="6"></line>
                              <line x1="12" y1="18" x2="12" y2="22"></line>
                              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                              <line x1="2" y1="12" x2="6" y2="12"></line>
                              <line x1="18" y1="12" x2="22" y2="12"></line>
                              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                            </svg>
                            Applying Discount...
                          </span>
                        ) : 'Yes, I\'ll Stay With 30% Off'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '12px',
                  marginTop: '20px',
                  flexDirection: isSmallScreen ? 'column' : 'row',
                  background: 'white',
                  padding: '10px 0 0 0',
                  borderTop: '1px solid #f0f0f0',
                  zIndex: 2
                }}>
                  <button
                    onClick={() => {
                      setShowCancelFeedback(false);
                      setCancelReason('');
                      setOtherReason('');
                      setMissingFeaturesReason('');
                      setBetterAlternativeReason('');
                      setShowDiscountOffer(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: isSmallScreen ? '13px' : '14px',
                      fontWeight: '500',
                      color: '#4b5563',
                      transition: 'all 0.2s ease',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '2' : '1'
                    }}
                    disabled={isSubmittingFeedback}
                  >
                    Keep My Subscription
                  </button>
                  <button
                    onClick={processCancellation}
                    disabled={isSubmittingFeedback || !cancelReason || (cancelReason === 'other' && !otherReason.trim()) || (cancelReason === 'missing-features' && !missingFeaturesReason.trim()) || (cancelReason === 'found-alternative' && !betterAlternativeReason.trim())}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: isSmallScreen ? '13px' : '14px',
                      fontWeight: '500',
                      opacity: (isSubmittingFeedback || !cancelReason || (cancelReason === 'other' && !otherReason.trim()) || (cancelReason === 'missing-features' && !missingFeaturesReason.trim()) || (cancelReason === 'found-alternative' && !betterAlternativeReason.trim())) ? '0.5' : '1',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(231, 76, 60, 0.3)',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '1' : '2'
                    }}
                  >
                    {isSubmittingFeedback ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <line x1="12" y1="2" x2="12" y2="6"></line>
                          <line x1="12" y1="18" x2="12" y2="22"></line>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                          <line x1="2" y1="12" x2="6" y2="12"></line>
                          <line x1="18" y1="12" x2="22" y2="12"></line>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Tailoring modal */}
          {showTailorModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(3px)',
              padding: '15px',
              overflow: 'auto'
            }}>
              <div style={{
                background: 'white',
                padding: isSmallScreen ? '24px 20px' : '28px 32px',
                borderRadius: '12px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                animation: 'fadeIn 0.3s ease-out',
                maxHeight: '85vh',
                overflowY: 'auto',
                margin: '20px auto'
              }} className="hide-scrollbar">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  marginBottom: '20px',
                  gap: '14px',
                  background: 'white',
                  zIndex: 2
                }}>
                  <div style={{
                    width: isSmallScreen ? '36px' : '42px',
                    height: isSmallScreen ? '36px' : '42px',
                    borderRadius: '50%',
                    background: 'rgba(156, 39, 176, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width={isSmallScreen ? "18" : "20"} height={isSmallScreen ? "18" : "20"} viewBox="0 0 24 24" fill="none" stroke="#9c27b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                      <line x1="16" y1="8" x2="2" y2="22"></line>
                      <line x1="17.5" y1="15" x2="9" y2="15"></line>
                    </svg>
                  </div>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: isSmallScreen ? '20px' : '22px',
                    fontWeight: '600',
                    color: '#333'
                  }}>
                    Tailor Your Resume
                  </h3>
                </div>
                
                <div style={{ 
                  position: 'relative',
                  zIndex: 1
                }}>
                  <p style={{ 
                    marginBottom: '20px', 
                    fontSize: isSmallScreen ? '14px' : '15px',
                    lineHeight: '1.6',
                    color: '#555'
                  }}>
                    Enter the job details to tailor your resume for the specific position. Our AI will help you highlight the most relevant skills and experiences.
                  </p>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label 
                      htmlFor="jobTitle" 
                      style={{ 
                        display: 'block', 
                        marginBottom: '8px',
                        fontSize: isSmallScreen ? '13px' : '14px',
                        fontWeight: '500',
                        color: '#4a5568'
                      }}
                    >
                      Job Title*
                    </label>
                    <input
                      id="jobTitle"
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Software Engineer, Marketing Manager"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: isSmallScreen ? '13px' : '14px'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label 
                      htmlFor="jobDescription" 
                      style={{ 
                        display: 'block', 
                        marginBottom: '8px',
                        fontSize: isSmallScreen ? '13px' : '14px',
                        fontWeight: '500',
                        color: '#4a5568'
                      }}
                    >
                      Job Description*
                    </label>
                    <textarea
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: isSmallScreen ? '13px' : '14px',
                        minHeight: '150px',
                        maxHeight: '250px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  gap: '12px',
                  marginTop: '20px',
                  flexDirection: isSmallScreen ? 'column' : 'row',
                  background: 'white',
                  padding: '10px 0 0 0',
                  borderTop: '1px solid #f0f0f0',
                  zIndex: 2
                }}>
                  <button
                    onClick={() => setShowTailorModal(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: isSmallScreen ? '13px' : '14px',
                      fontWeight: '500',
                      color: '#4b5563',
                      transition: 'all 0.2s ease',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '2' : '1'
                    }}
                    disabled={isTailoring}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processTailoring}
                    disabled={isTailoring || !jobTitle.trim() || !jobDescription.trim()}
                    style={{
                      background: '#9c27b0',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: isSmallScreen ? '13px' : '14px',
                      fontWeight: '500',
                      opacity: (isTailoring || !jobTitle.trim() || !jobDescription.trim()) ? '0.5' : '1',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(156, 39, 176, 0.3)',
                      width: isSmallScreen ? '100%' : 'auto',
                      order: isSmallScreen ? '1' : '2'
                    }}
                  >
                    {isTailoring ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <line x1="12" y1="2" x2="12" y2="6"></line>
                          <line x1="12" y1="18" x2="12" y2="22"></line>
                          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                          <line x1="2" y1="12" x2="6" y2="12"></line>
                          <line x1="18" y1="12" x2="22" y2="12"></line>
                          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                        </svg>
                        Processing...
                      </span>
                    ) : 'Start Tailoring'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // If not authenticated but not redirected yet, show login prompt
  return (
    <>
      <Meta 
      title="Sign In Required | IntelliResume" 
      description="Please sign in to view your IntelliResume profile and manage your resumes" 
      keywords="IntelliResume sign in, IntelliResume login, IntelliResume profile"
    />
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
          Please sign in to view your profile
        </div>
        <Link href="/auth/signin" style={{
          display: 'inline-block',
          padding: '12px 25px',
          background: 'var(--primary-blue)',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          Sign In
        </Link>
      </div>
    </div>
    </>
  );
} 