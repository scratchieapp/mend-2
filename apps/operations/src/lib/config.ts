// Configuration for dynamic URLs based on environment

// Get the base URL based on environment
export const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  // Server-side or build time
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  
  if (import.meta.env.VERCEL_URL) {
    return `https://${import.meta.env.VERCEL_URL}`;
  }
  
  // Default to localhost for development
  return 'http://localhost:8080';
};

export const APP_URL = getBaseUrl();

// Clerk redirect URLs
export const getClerkRedirectUrl = (path: string = '/dashboard') => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
};

// Check if we're in production
export const isProduction = () => {
  return import.meta.env.PROD || window.location.hostname !== 'localhost';
};