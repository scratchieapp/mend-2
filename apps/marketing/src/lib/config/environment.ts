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
    operationsUrl: import.meta.env.VITE_OPERATIONS_URL || 'http://localhost:5173/operations',
    marketingUrl: import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5174',
    authPaths: {
      login: '/sign-in',
      signup: '/sign-up',
    },
  },
  production: {
    operationsUrl: import.meta.env.VITE_OPERATIONS_URL || 'https://accounts.mendplatform.au',
    marketingUrl: import.meta.env.VITE_PUBLIC_URL || 'https://mendplatform.au',
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
 * Build authentication URL for login
 * @param returnUrl Optional return URL after authentication
 */
export const getLoginUrl = (returnUrl?: string): string => {
  const config = getEnvironmentConfig();
  const baseUrl = config.operationsUrl;
  const path = config.authPaths.login;
  
  // Construct the full URL string to preserve the base path
  const fullUrl = `${baseUrl}${path}`;
  
  if (returnUrl) {
    const url = new URL(fullUrl);
    url.searchParams.set('returnUrl', returnUrl);
    return url.toString();
  }
  
  return fullUrl;
};

/**
 * Build authentication URL for signup
 * @param returnUrl Optional return URL after authentication
 */
export const getSignupUrl = (returnUrl?: string): string => {
  const config = getEnvironmentConfig();
  const baseUrl = config.operationsUrl;
  const path = config.authPaths.signup;
  
  // Construct the full URL string to preserve the base path
  const fullUrl = `${baseUrl}${path}`;
  
  if (returnUrl) {
    const url = new URL(fullUrl);
    url.searchParams.set('returnUrl', returnUrl);
    return url.toString();
  }
  
  return fullUrl;
};

/**
 * Debugging helper - log current environment configuration
 */
export const logEnvironmentConfig = () => {
  if (getEnvironment() === 'development') {
    const config = getEnvironmentConfig();
    console.group('🔧 Environment Configuration');
    console.log('Environment:', getEnvironment());
    console.log('Operations URL:', config.operationsUrl);
    console.log('Marketing URL:', config.marketingUrl);
    console.log('Login URL:', getLoginUrl());
    console.log('Signup URL:', getSignupUrl());
    console.groupEnd();
  }
};