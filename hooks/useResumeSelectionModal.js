import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Custom hook to manage resume selection modal state and logic
 * @returns {Object} Modal state and handlers
 */
const useResumeSelectionModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const router = useRouter();

  // Open the modal and store the pending redirect URL
  const openModal = useCallback((redirectUrl) => {
    setIsModalOpen(true);
    setPendingRedirect(redirectUrl);
  }, []);

  // Close the modal and clear pending redirect
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setPendingRedirect(null);
  }, []);

  // Handle resume selection from modal
  const handleResumeSelect = useCallback((resumeId) => {
    setIsModalOpen(false);
    
    if (pendingRedirect && resumeId) {
      // Store the selected resume ID for later use
      localStorage.setItem('pending_download_resume_id', resumeId);
      
      // Add action=download parameter to the URL when redirecting to subscription page
      // This ensures consistent behavior with the direct "Buy Plan" flow
      const redirectUrl = pendingRedirect.includes('?') 
        ? `${pendingRedirect}&action=download&resumeId=${resumeId}`
        : `${pendingRedirect}?action=download&resumeId=${resumeId}`;
      
      router.push(redirectUrl);
    }
  }, [pendingRedirect, router]);

  // Check if we already have a resumeId in context
  const checkAndHandlePricingNavigation = useCallback(async (redirectUrl = '/subscription', forceModal = true) => {
    // Check the user's current subscription plan type
    // We only want to show the modal for Free Plan and One-Time Download plans
    let shouldShowModal = forceModal;
    
    try {
      // Only check subscription if we're in the browser
      if (typeof window !== 'undefined') {
        // First check if we have the subscription details in localStorage for performance
        const cachedPlanName = localStorage.getItem('current_subscription_plan');
        console.log('📊 Resume Selection Modal - Cached plan name:', cachedPlanName);
        
        if (cachedPlanName === 'Weekly Pro' || cachedPlanName === 'Monthly Pro') {
          // For weekly or monthly plans, skip the modal and go directly to subscription page
          console.log('📊 Resume Selection Modal - User has a recurring subscription plan, skipping resume selection modal');
          shouldShowModal = false;
        } else if (!cachedPlanName || cachedPlanName === 'Free Plan' || cachedPlanName === 'One-Time Download') {
          // For free plan or one-time plan, check if we should show the modal
          console.log('📊 Resume Selection Modal - User has Free Plan or One-Time Download, showing modal if forceModal is true');
          shouldShowModal = forceModal;
        } else {
          // If we have an unknown plan type, try to fetch the current plan
          console.log('📊 Resume Selection Modal - Unknown plan type, fetching from API');
          const response = await fetch('/api/resume/check-download-eligibility');
          if (response.ok) {
            const data = await response.json();
            console.log('📊 Resume Selection Modal - API plan data:', data);
            
            // If user has a weekly or monthly plan, skip the modal
            if (data.plan === 'weekly' || data.plan === 'monthly') {
              console.log('📊 Resume Selection Modal - API confirms recurring plan, skipping modal');
              shouldShowModal = false;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking subscription plan:', error);
      // In case of error, fall back to the forceModal parameter
      shouldShowModal = forceModal;
    }
    
    console.log('📊 Resume Selection Modal - Final decision - shouldShowModal:', shouldShowModal);
    
    // When forceModal is true and the user doesn't have a recurring plan,
    // always open the modal regardless of resumeId in localStorage
    if (shouldShowModal) {
      // Always open the modal for direct pricing navigation
      console.log('📊 Resume Selection Modal - Opening modal with redirect URL:', redirectUrl);
      openModal(redirectUrl);
      return;
    }
    
    // For other cases (like download buttons on specific resumes),
    // or when the user has a recurring plan,
    // check if we already have a resumeId in context or localStorage
    const currentResumeId = typeof window !== 'undefined' ? 
      localStorage.getItem('current_resume_id') || localStorage.getItem('editing_resume_id') : null;
    
    if (currentResumeId) {
      // If we already have a resumeId, navigate directly to pricing with that ID
      const hasParams = redirectUrl.includes('?');
      const separator = hasParams ? '&' : '?';
      router.push(`${redirectUrl}${separator}resumeId=${currentResumeId}`);
    } else {
      // If no resumeId is available, open the modal to select one
      // This is a fallback for when shouldShowModal is false but we don't have a resumeId
      openModal(redirectUrl);
    }
  }, [router, openModal]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    handleResumeSelect,
    checkAndHandlePricingNavigation
  };
};

export default useResumeSelectionModal; 