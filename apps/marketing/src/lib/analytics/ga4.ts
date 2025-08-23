// Google Analytics 4 Configuration and Tracking

// GA4 Measurement ID (to be added to environment variables)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Initialize Google Analytics
export const initializeGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('Google Analytics Measurement ID not configured');
    return;
  }

  // Add the Google Analytics script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}', {
      send_page_view: false,
      custom_map: {
        'dimension1': 'user_role',
        'dimension2': 'user_id',
        'dimension3': 'company_name'
      }
    });
  `;
  document.head.appendChild(script2);
};

// Track page views
export const trackPageView = (path?: string, title?: string) => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path || window.location.pathname,
    page_title: title || document.title,
  });
};

// Track custom events
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
) => {
  if (!window.gtag) return;

  window.gtag('event', eventName, {
    ...parameters,
    send_to: GA_MEASUREMENT_ID,
  });
};

// Conversion tracking events
export const trackConversion = {
  // Track when user starts demo booking process
  demoBookingStarted: () => {
    trackEvent('begin_checkout', {
      value: 0,
      currency: 'AUD',
      items: [{
        item_name: 'Demo Booking',
        item_category: 'Lead Generation',
      }]
    });
  },

  // Track when demo booking is completed
  demoBookingCompleted: (userData?: any) => {
    trackEvent('purchase', {
      value: 1000, // Estimated lead value
      currency: 'AUD',
      transaction_id: `demo_${Date.now()}`,
      items: [{
        item_name: 'Demo Booking',
        item_category: 'Lead Generation',
      }],
      user_data: userData
    });
  },

  // Track when user clicks login
  loginClicked: (source: string) => {
    trackEvent('login', {
      method: 'clerk',
      source: source // 'header', 'mobile_menu', 'hero', etc.
    });
  },

  // Track when user successfully logs in
  loginCompleted: (userId: string, userRole?: string) => {
    trackEvent('sign_up', {
      method: 'clerk',
      user_id: userId,
      user_role: userRole
    });
    
    // Set user properties for future tracking
    if (window.gtag) {
      window.gtag('set', {
        user_id: userId,
        user_properties: {
          role: userRole
        }
      });
    }
  },

  // Track navigation to operations platform
  navigateToOperations: (source: string) => {
    trackEvent('select_content', {
      content_type: 'platform_navigation',
      item_id: 'operations_platform',
      source: source
    });
  },

  // Track ROI calculator usage
  roiCalculatorUsed: (data: any) => {
    trackEvent('view_item', {
      currency: 'AUD',
      value: data.estimatedSavings,
      items: [{
        item_name: 'ROI Calculator',
        item_category: 'Tools',
        custom_parameters: data
      }]
    });
  },

  // Track pricing view
  pricingViewed: (plan?: string) => {
    trackEvent('view_item_list', {
      item_list_name: 'Pricing Plans',
      items: plan ? [{
        item_name: plan,
        item_category: 'Pricing'
      }] : []
    });
  },

  // Track contact form submission
  contactFormSubmitted: (formData: any) => {
    trackEvent('generate_lead', {
      currency: 'AUD',
      value: 500, // Estimated lead value
      form_data: formData
    });
  },
};

// Enhanced Ecommerce tracking for the conversion funnel
export const trackFunnel = {
  // Step 1: Landing page view
  landingPageView: (source?: string) => {
    trackEvent('view_promotion', {
      promotion_name: 'Mend Safety Platform',
      creative_slot: 'hero',
      location_id: source || 'direct'
    });
  },

  // Step 2: Feature exploration
  featureExplored: (featureName: string) => {
    trackEvent('select_item', {
      item_list_name: 'Features',
      items: [{
        item_name: featureName,
        item_category: 'Feature'
      }]
    });
  },

  // Step 3: Solution interest
  solutionInterest: (solutionType: string) => {
    trackEvent('add_to_wishlist', {
      currency: 'AUD',
      value: 0,
      items: [{
        item_name: solutionType,
        item_category: 'Solution'
      }]
    });
  },

  // Step 4: Conversion action
  conversionAction: (actionType: 'demo' | 'login' | 'contact') => {
    trackEvent('add_to_cart', {
      currency: 'AUD',
      value: actionType === 'demo' ? 1000 : 500,
      items: [{
        item_name: actionType,
        item_category: 'Conversion'
      }]
    });
  }
};

// User engagement tracking
export const trackEngagement = {
  // Track scroll depth
  scrollDepth: (percentage: number) => {
    trackEvent('scroll', {
      percent_scrolled: percentage
    });
  },

  // Track time on page
  timeOnPage: (seconds: number) => {
    trackEvent('timing_complete', {
      name: 'time_on_page',
      value: seconds
    });
  },

  // Track video/demo views
  videoViewed: (videoTitle: string, percentage: number) => {
    trackEvent('video_progress', {
      video_title: videoTitle,
      video_percent: percentage
    });
  },

  // Track document downloads
  documentDownloaded: (documentName: string) => {
    trackEvent('file_download', {
      file_name: documentName,
      file_extension: documentName.split('.').pop()
    });
  }
};

// Custom dimensions for better segmentation
export const setUserProperties = (properties: {
  userId?: string;
  userRole?: string;
  companyName?: string;
  industry?: string;
}) => {
  if (!window.gtag) return;

  window.gtag('set', {
    user_properties: properties
  });
};

// Track custom goals
export const trackGoal = (goalName: string, value?: number) => {
  trackEvent(`goal_${goalName}`, {
    value: value || 1,
    currency: 'AUD'
  });
};

// Declare gtag on window
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}