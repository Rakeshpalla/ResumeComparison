/**
 * Analytics event tracking utilities.
 * Works with Google Analytics (if NEXT_PUBLIC_GA_ID is set) and Vercel Analytics.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Track a custom event in Google Analytics (if enabled).
 * Vercel Analytics automatically tracks page views and web vitals.
 */
export function trackEvent(
  eventName: string,
  eventParams?: {
    category?: string;
    label?: string;
    value?: number;
    [key: string]: unknown;
  }
) {
  if (typeof window === "undefined") return;
  
  // Google Analytics
  if (window.gtag) {
    window.gtag("event", eventName, {
      event_category: eventParams?.category,
      event_label: eventParams?.label,
      value: eventParams?.value,
      ...eventParams,
    });
  }
}

/**
 * Track file upload event
 */
export function trackUpload(count: number, hasJobDescription: boolean) {
  trackEvent("file_upload", {
    category: "engagement",
    label: `${count} files`,
    value: count,
    has_job_description: hasJobDescription,
  });
}

/**
 * Track comparison generation event
 */
export function trackComparison(sessionId: string, documentCount: number, hasJobDescription: boolean) {
  trackEvent("comparison_generated", {
    category: "conversion",
    label: `${documentCount} resumes`,
    value: documentCount,
    session_id: sessionId,
    has_job_description: hasJobDescription,
  });
}

/**
 * Track export event
 */
export function trackExport(sessionId: string, format: "xlsx" | "csv") {
  trackEvent("export_downloaded", {
    category: "conversion",
    label: format,
    session_id: sessionId,
  });
}

/**
 * Track feedback submission event
 */
export function trackFeedback(role: string, wouldRecommend: boolean) {
  trackEvent("feedback_submitted", {
    category: "engagement",
    label: role,
    would_recommend: wouldRecommend,
  });
}

/**
 * Track signup/login event
 */
export function trackAuth(action: "signup" | "login") {
  trackEvent("user_auth", {
    category: "engagement",
    label: action,
  });
}
