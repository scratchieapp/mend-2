import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClerkAuth } from '../clerk/ClerkProvider';
import {
  initializeGA,
  trackPageView,
  trackConversion,
  trackEngagement,
  setUserProperties,
} from './ga4';

// Hook to initialize and track analytics
export const useAnalytics = () => {
  const location = useLocation();
  const { isSignedIn, user } = useClerkAuth();
  const scrollTracked = useRef<Set<number>>(new Set());
  const startTime = useRef<number>(Date.now());

  // Initialize GA on mount
  useEffect(() => {
    initializeGA();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
    
    // Reset scroll tracking for new page
    scrollTracked.current.clear();
    startTime.current = Date.now();

    // Track funnel step based on path
    if (location.pathname === '/') {
      trackConversion.landingPageView();
    }
  }, [location]);

  // Track user properties when auth state changes
  useEffect(() => {
    if (isSignedIn && user) {
      setUserProperties({
        userId: user.id,
        userRole: user.role || 'unknown',
      });
      
      // Track successful login
      trackConversion.loginCompleted(user.id, user.role);
    }
  }, [isSignedIn, user]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100);
      
      // Track at 25%, 50%, 75%, and 100%
      const milestones = [25, 50, 75, 100];
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !scrollTracked.current.has(milestone)) {
          scrollTracked.current.add(milestone);
          trackEngagement.scrollDepth(milestone);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  // Track time on page when leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      const timeOnPage = Math.round((Date.now() - startTime.current) / 1000);
      trackEngagement.timeOnPage(timeOnPage);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  return {
    trackConversion,
    trackEngagement,
  };
};

// Component to track analytics across the app
export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  useAnalytics();
  return <>{children}</>;
};