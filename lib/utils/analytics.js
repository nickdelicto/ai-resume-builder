/**
 * Client-side Analytics Utility
 *
 * Handles session ID management and event tracking for internal analytics.
 * Session IDs are stored in localStorage to link events from the same visitor.
 *
 * SESSION BEHAVIOR:
 * - Session lasts 30 minutes of inactivity (industry standard, same as Google Analytics)
 * - Any activity refreshes the 30-minute timer
 * - New session = new session ID
 *
 * DEDUPLICATION (handled server-side):
 * - page_view: 1 per job per session (refreshes don't count twice)
 * - apply_click: 1 per job per session (opening modal twice doesn't count twice)
 * - employer_redirect: NOT deduplicated (multiple applications count)
 * - modal_subscribe: Naturally deduplicated by email
 */

const SESSION_ID_KEY = 'ir_session_id';
const SESSION_EXPIRY_KEY = 'ir_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session

/**
 * Generate a random session ID (UUID v4-like)
 */
function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a session ID
 * Session expires after 30 minutes of inactivity
 */
export function getSessionId() {
  if (typeof window === 'undefined') {
    return null; // SSR - no localStorage
  }

  try {
    const existingId = localStorage.getItem(SESSION_ID_KEY);
    const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    const now = Date.now();

    // Check if session exists and hasn't expired
    if (existingId && expiry && parseInt(expiry, 10) > now) {
      // Refresh expiry on activity
      localStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_DURATION_MS));
      return existingId;
    }

    // Create new session
    const newSessionId = generateSessionId();
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    localStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_DURATION_MS));
    return newSessionId;
  } catch (e) {
    // localStorage might be disabled
    return generateSessionId();
  }
}

/**
 * Track an analytics event
 *
 * @param {string} eventType - One of: page_view, apply_click, modal_subscribe, resume_click
 * @param {Object} data - Event data
 * @param {string} data.jobId - Internal job ID (optional)
 * @param {string} data.jobSlug - Job URL slug (optional)
 * @param {string} data.employer - Employer name (optional)
 * @param {string} data.specialty - Job specialty (optional)
 * @param {string} data.state - State code (optional)
 * @param {string} data.city - City name (optional)
 * @param {string} data.email - User email if known (optional)
 */
export async function trackEvent(eventType, data = {}) {
  if (typeof window === 'undefined') {
    return; // SSR - skip tracking
  }

  // Skip tracking for developers/testers (set in console: localStorage.setItem('ir_no_track', 'true'))
  try {
    if (localStorage.getItem('ir_no_track') === 'true') {
      return;
    }
  } catch (e) {
    // localStorage might be disabled
  }

  const sessionId = getSessionId();
  if (!sessionId) {
    return;
  }

  const payload = {
    sessionId,
    eventType,
    sourceUrl: window.location.href,
    ...data
  };

  try {
    // Use sendBeacon for reliable tracking even on page unload
    // Fall back to fetch for compatibility
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {
        // Silently fail - don't disrupt user experience
      });
    }
  } catch (e) {
    // Silently fail - analytics should never break the app
  }
}

/**
 * Track a page view
 * Call this on page load
 */
export function trackPageView(data = {}) {
  trackEvent('page_view', data);
}

/**
 * Track an apply button click
 */
export function trackApplyClick(data = {}) {
  trackEvent('apply_click', data);
}

/**
 * Track a modal subscription
 */
export function trackModalSubscribe(data = {}) {
  trackEvent('modal_subscribe', data);
}

/**
 * Track a resume download/click
 */
export function trackResumeClick(data = {}) {
  trackEvent('resume_click', data);
}

/**
 * Track when user actually proceeds to employer site
 */
export function trackEmployerRedirect(data = {}) {
  trackEvent('employer_redirect', data);
}
