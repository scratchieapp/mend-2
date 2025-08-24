// Environment-aware configuration for URL routing
// Handles both development and production environments with proper domain routing

/**
 * Get the current environment
 */
export const getEnvironment = (): 'development' | 'production' => {
  return import.meta.env.PROD ? 'production' : 'development';
};

/**
 * Environment-specific URL configurations
 */
const environments = {
  development: {
    operationsUrl: import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173/operations',
    marketingUrl: import.meta.env.VITE_MARKETING_URL || 'http://localhost:5174',
    authPaths: {
      login: '/sign-in',
      signup: '/sign-up',
    },
  },
  production: {
    operationsUrl: import.meta.env.VITE_PUBLIC_URL || 'https://accounts.mendplatform.au',
    marketingUrl: import.meta.env.VITE_MARKETING_URL || 'https://mendplatform.au',
    authPaths: {
      login: '/sign-in',
      signup: '/sign-up',
    },
  },
} as const;

/**
 * Get current environment configuration
 */
export const getEnvironmentConfig = () => {
  const env = getEnvironment();
  return environments[env];
};

/**
 * Get the operations URL for the current environment
 */
export const getOperationsUrl = (): string => {
  return getEnvironmentConfig().operationsUrl;
};

/**
 * Get the marketing URL for the current environment
 */
export const getMarketingUrl = (): string => {
  return getEnvironmentConfig().marketingUrl;
};

/**
 * Get the base URL for the current application
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // For production, ensure we use the correct subdomain
    if (getEnvironment() === 'production') {
      return getOperationsUrl();
    }
    // For development, use the current origin with base path
    const origin = window.location.origin;
    return origin.includes('localhost:5173') ? `${origin}/operations` : origin;
  }
  return getOperationsUrl();
};

/**
 * Build a URL for the operations app
 * @param path Path within the operations app
 */
export const buildOperationsUrl = (path: string): string => {
  const baseUrl = getOperationsUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Build a URL for the marketing app
 * @param path Path within the marketing app
 */
export const buildMarketingUrl = (path: string): string => {
  const baseUrl = getMarketingUrl();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Get Clerk redirect URL
 * @param path Path to redirect to after authentication
 */
export const getClerkRedirectUrl = (path: string = '/'): string => {
  return buildOperationsUrl(path);
};

/**
 * Check if we're in production
 */
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

/**
 * Debugging helper - log current environment configuration
 */
export const logEnvironmentConfig = () => {
  if (getEnvironment() === 'development') {
    const config = getEnvironmentConfig();
    console.group('🔧 Operations Environment Configuration');
    console.log('Environment:', getEnvironment());
    console.log('Operations URL:', config.operationsUrl);
    console.log('Marketing URL:', config.marketingUrl);
    console.log('Base URL:', getBaseUrl());
    console.log('Is Production:', isProduction());
    console.groupEnd();
  }
};